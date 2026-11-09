-- Migration 68: Mở rộng kênh liên hệ quốc tế (phone_intl E.164) cho khách nước ngoài
-- ---------------------------------------------------------------------------------------------------------
-- 0. Unique partial index chống race condition khi tạo trùng phone_intl
create unique index if not exists guests_phone_intl_uq on public.guests(phone_intl)
where merged_into is null and phone_intl is not null;

-- 1. Cập nhật RPC lookup_for_checkin: Hỗ trợ tra cứu nhanh bằng SĐT quốc tế (phone_intl)
create or replace function public.lookup_for_checkin(p_branch uuid, p_kind text, p_value text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_full_doc boolean := p_kind in ('cccd', 'passport');
begin
  perform private.assert_perm_at('stay.create', p_branch);
  perform private.hit_rate_limit('lookup', 120, 60);

  if p_kind = 'phone' then
    select id into v_id from public.guests where phone = p_value and merged_into is null;
  elsif p_kind = 'phone_intl' then
    select id into v_id from public.guests where phone_intl = p_value and merged_into is null;
  elsif p_kind in ('cccd', 'passport') then
    select guest_id into v_id from public.guest_documents
    where doc_type = p_kind::public.doc_type and doc_number = upper(p_value)
    limit 1;
  else
    raise exception 'invalid kind' using errcode = 'P0422';
  end if;

  if v_id is null then
    return jsonb_build_object('match', null);
  end if;

  return jsonb_build_object('match', (
    select jsonb_build_object(
      'id', g.id, 'full_name', g.full_name, 'gender', g.gender, 'dob', g.dob,
      'nationality', g.nationality, 'phone', g.phone, 'phone_intl', g.phone_intl, 'email', g.email,
      'address_line', g.address_line, 'province_code', g.province_code, 'ward_code', g.ward_code,
      'tags', g.tags,
      'tier', case when private.has_perm('loyalty.view', p_branch) then private.guest_tier(g.id) end,
      'documents', coalesce((
        select jsonb_agg(jsonb_build_object(
          'type', d.doc_type, 'country', d.issuing_country,
          'number', case when v_full_doc then d.doc_number else private.mask_doc(d.doc_number) end))
        from public.guest_documents d where d.guest_id = g.id), '[]'::jsonb),
      'stats', (select jsonb_build_object('total_stays', s.total_stays, 'total_nights', s.total_nights,
                                          'last_stay_at', s.last_stay_at, 'last_branch', b.name)
                from public.guest_stats s left join public.branches b on b.id = s.last_branch_id
                where s.guest_id = g.id),
      'notes', coalesce((
        select jsonb_agg(jsonb_build_object('body', n.body, 'kind', n.kind, 'branch', b.name,
                                            'author', pr.full_name, 'at', n.created_at)
                          order by n.created_at desc)
        from (select * from public.guest_notes where guest_id = g.id and deleted_at is null
              order by created_at desc limit 5) n
        left join public.branches b on b.id = n.branch_id
        left join public.profiles pr on pr.id = n.created_by), '[]'::jsonb),
      'flags', case when private.has_perm('blacklist.view', p_branch) then coalesce((
        select jsonb_agg(jsonb_build_object('type', f.flag_type, 'status', f.status,
                                            'reason', f.reason, 'branch', b.name, 'at', f.proposed_at))
        from public.guest_flags f join public.branches b on b.id = f.branch_id
        where f.guest_id = g.id and f.status in ('proposed', 'approved')), '[]'::jsonb)
    )
    from public.guests g where g.id = v_id
  ));
end $$;

-- 2. Cập nhật RPC create_guest: Kiểm tra trùng theo phone_intl
create or replace function public.create_guest(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_id         uuid;
  v_phone      text := nullif(p ->> 'phone', '');
  v_phone_intl text := nullif(p ->> 'phone_intl', '');
  v_doc_type   text := nullif(p -> 'document' ->> 'type', '');
  v_doc_no     text := upper(nullif(btrim(p -> 'document' ->> 'number'), ''));
  v_raw_tags   text[];
  v_clean_tags text[] := '{}';
  v_source_id  uuid := nullif(p ->> 'source_channel_id', '')::uuid;
  v_tag        text;
  v_chan_name  text;
begin
  perform private.assert_perm('guest.create');
  perform private.hit_rate_limit('create_guest', 30, 60);

  if v_phone is null and v_doc_no is null and v_phone_intl is null then
    raise exception 'phone or document required' using errcode = 'P0422';
  end if;

  if v_doc_no is not null then
    select guest_id into v_id from public.guest_documents
    where doc_type = v_doc_type::public.doc_type and doc_number = v_doc_no;
  end if;
  if v_id is null and v_phone is not null then
    select id into v_id from public.guests where phone = v_phone and merged_into is null;
  end if;
  if v_id is null and v_phone_intl is not null then
    select id into v_id from public.guests where phone_intl = v_phone_intl and merged_into is null;
  end if;
  if v_id is not null then
    return jsonb_build_object('guest_id', v_id, 'existing', true);
  end if;

  v_id := private.upsert_guest(p - 'guest_id',
                             v_phone is not null or coalesce(nullif(p ->> 'nationality', ''), 'VN') <> 'VN', false);

  if p ? 'tags' and jsonb_typeof(p -> 'tags') = 'array' then
    v_raw_tags := array(select jsonb_array_elements_text(p -> 'tags'));
    foreach v_tag in array v_raw_tags loop
      if v_tag ~* '^#?Nguồn:\s*(.+)$' then
        v_chan_name := btrim(substring(v_tag from '(?i)^#?Nguồn:\s*(.+)$'));
        if v_source_id is null then
          select id into v_source_id from public.source_channels
          where lower(name) = lower(v_chan_name)
             or lower(code) = lower(v_chan_name)
             or lower(name) like '%' || lower(v_chan_name) || '%'
          order by (lower(name) = lower(v_chan_name)) desc
          limit 1;
        end if;
      else
        v_clean_tags := array_append(v_clean_tags, v_tag);
      end if;
    end loop;
  end if;

  update public.guests
     set sales_owner_id = (select auth.uid()),
         source_channel_id = v_source_id,
         tags = coalesce(v_clean_tags, '{}'::text[])
   where id = v_id;

  perform private.refresh_guest_stats(array[v_id]);
  return jsonb_build_object('guest_id', v_id, 'existing', false);
end;
$function$;

-- 3. Cập nhật RPC update_guest: Kiểm tra trùng phone_intl và giữ nguyên số cũ khi không sửa
create or replace function public.update_guest(
  p_guest_id uuid,
  p_patch jsonb,
  p_expected_updated_at timestamptz
)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_g public.guests;
  v_name text;
  v_phone text;
  v_phone_intl text;
  v_email text;
  v_source_id uuid;
begin
  perform private.assert_perm('guest.update');

  select * into v_g from public.guests where id = p_guest_id for update;
  if not found then
    raise exception 'guest not found' using errcode = 'P0404';
  end if;

  if p_expected_updated_at is not null and v_g.updated_at <> p_expected_updated_at then
    raise exception 'conflict updating guest' using errcode = 'P0409';
  end if;

  v_name := coalesce(nullif(btrim(p_patch ->> 'full_name'), ''), v_g.full_name);
  
  -- Nếu phone gửi lên chứa '*' -> giữ nguyên phone cũ trong DB
  if p_patch ? 'phone' and nullif(btrim(p_patch ->> 'phone'), '') is not null and (p_patch ->> 'phone') not like '%*%' then
    v_phone := btrim(p_patch ->> 'phone');
  else
    v_phone := v_g.phone;
  end if;

  -- Nếu phone_intl gửi lên chứa '*' -> giữ nguyên phone_intl cũ trong DB
  if p_patch ? 'phone_intl' and nullif(btrim(p_patch ->> 'phone_intl'), '') is not null and (p_patch ->> 'phone_intl') not like '%*%' then
    v_phone_intl := btrim(p_patch ->> 'phone_intl');
  else
    v_phone_intl := v_g.phone_intl;
  end if;

  v_email := coalesce(nullif(btrim(p_patch ->> 'email'), ''), v_g.email);

  if v_phone is not null and v_phone <> coalesce(v_g.phone, '') then
    if exists (select 1 from public.guests where phone = v_phone and id <> p_guest_id and merged_into is null) then
      raise exception 'phone already exists' using errcode = 'P0411';
    end if;
  end if;

  if v_phone_intl is not null and v_phone_intl <> coalesce(v_g.phone_intl, '') then
    if exists (select 1 from public.guests where phone_intl = v_phone_intl and id <> p_guest_id and merged_into is null) then
      raise exception 'phone already exists' using errcode = 'P0411';
    end if;
  end if;

  v_source_id := case
                   when p_patch ? 'source_channel_id' then nullif(p_patch ->> 'source_channel_id', '')::uuid
                   else v_g.source_channel_id
                 end;

  update public.guests
  set full_name = v_name,
      search_name = private.normalize_search(v_name),
      gender = coalesce((p_patch ->> 'gender')::public.gender, v_g.gender),
      dob = case when p_patch ? 'dob' then (p_patch ->> 'dob')::date else v_g.dob end,
      nationality = coalesce(nullif(p_patch ->> 'nationality', ''), v_g.nationality),
      phone = v_phone,
      phone_intl = v_phone_intl,
      email = v_email,
      address_line = case when p_patch ? 'address_line' then nullif(p_patch ->> 'address_line', '') else v_g.address_line end,
      province_code = case when p_patch ? 'province_code' then nullif(p_patch ->> 'province_code', '') else v_g.province_code end,
      ward_code = case when p_patch ? 'ward_code' then nullif(p_patch ->> 'ward_code', '') else v_g.ward_code end,
      source_channel_id = v_source_id,
      updated_at = now()
  where id = p_guest_id;

  perform private.log_event('guest.update', 'guests', p_guest_id, null, p_patch);
  perform private.refresh_guest_stats(array[p_guest_id]);

  return jsonb_build_object('id', p_guest_id, 'updated', true);
end;
$$;

-- 4. Cập nhật RPC guest_profile: Che mặt nạ phone_intl khi không có quyền xem đầy đủ (TC7)
create or replace function public.guest_profile(p_guest_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_g           public.guests%rowtype;
  v_full        boolean;
  v_branch_id   uuid;
begin
  perform private.assert_perm('guest.view_summary');
  select * into v_g from public.guests where id = p_guest_id;
  if not found then raise exception 'guest not found' using errcode = 'P0404'; end if;
  if v_g.merged_into is not null then
    return jsonb_build_object('redirect_to', v_g.merged_into);
  end if;

  select s.last_branch_id into v_branch_id from public.guest_stats s where s.guest_id = p_guest_id;

  v_full := (v_branch_id is not null and private.has_perm('guest.view_full', v_branch_id))
            or (v_branch_id is null and exists (select 1 from private.branches_with('guest.view_full')))
            or private.has_perm('report.view_chain')
            or (v_g.sales_owner_id = (select auth.uid()) and private.has_perm('guest.view_full_own'));

  return jsonb_build_object(
    'guest', jsonb_build_object(
      'id', v_g.id, 'full_name', v_g.full_name, 'gender', v_g.gender,
      'dob', case when v_full then v_g.dob end, 'birth_year', extract(year from v_g.dob),
      'nationality', v_g.nationality,
      'phone', case
        when v_full then v_g.phone
        when length(v_g.phone) >= 7 then overlay(v_g.phone placing '****' from 4 for 4)
        else v_g.phone
      end,
      'phone_intl', case
        when v_full then v_g.phone_intl
        when length(v_g.phone_intl) >= 8 then overlay(v_g.phone_intl placing '****' from 5 for 4)
        else v_g.phone_intl
      end,
      'email', v_g.email,
      'address_line', v_g.address_line,
      'province_code', v_g.province_code,
      'ward_code', case when v_full then v_g.ward_code end,
      'tags', v_g.tags, 'created_at', v_g.created_at, 'updated_at', v_g.updated_at,
      'sales_owner', (select jsonb_build_object('id', pr.id, 'name', pr.full_name)
                      from public.profiles pr where pr.id = v_g.sales_owner_id),
      'source_channel', (select jsonb_build_object('id', sc.id, 'name', sc.name, 'kind', sc.kind)
                         from public.source_channels sc where sc.id = v_g.source_channel_id),
      'tier_override_code', v_g.tier_override_code,
      'tier_override_until', v_g.tier_override_until,
      'tier_override_reason', v_g.tier_override_reason),
    'tier', case when private.has_perm('loyalty.view') then private.guest_tier(p_guest_id) end,
    'tier_events', case when private.has_perm('loyalty.view') then coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id,
        'from_tier', (select name from public.loyalty_tiers where id = e.from_tier_id),
        'to_tier', (select name from public.loyalty_tiers where id = e.to_tier_id),
        'kind', e.kind,
        'policy_name', coalesce(p.name, 'Chính sách mặc định'),
        'actor', pr.full_name,
        'note', e.note,
        'at', e.at
      ) order by e.at desc)
      from public.guest_tier_events e
      left join public.loyalty_policies p on p.id = e.policy_id
      left join public.profiles pr on pr.id = e.actor_id
      where e.guest_id = p_guest_id
      limit 50
    ), '[]'::jsonb) else '[]'::jsonb end,
    'documents', coalesce((
      select jsonb_agg(jsonb_build_object(
        'type', d.doc_type, 'country', d.issuing_country,
        'number', case when v_full then d.doc_number else private.mask_doc(d.doc_number) end)
        order by d.created_at)
      from public.guest_documents d where d.guest_id = p_guest_id), '[]'::jsonb),
    'stats', (select to_jsonb(s) - 'guest_id' from public.guest_stats s where s.guest_id = p_guest_id),
    'stays', coalesce((
      select jsonb_agg(x.j order by x.ts desc) from (
        select st.check_in_at as ts, jsonb_build_object(
          'id', st.id, 'branch', b.name, 'branch_id', b.id, 'room', r.number, 'status', st.status,
          'check_in_at', st.check_in_at,
          'check_out_at', coalesce(st.checked_out_at, st.expected_check_out_at),
          'nights', st.nights, 'source', sc.name, 'partner', pa.name, 'entry_mode', st.entry_mode,
          'is_primary', sg.is_primary) as j
        from public.stay_guests sg
        join public.stays st   on st.id = sg.stay_id
        join public.branches b on b.id = st.branch_id
        join public.rooms r    on r.id = st.room_id
        join public.source_channels sc on sc.id = st.source_channel_id
        left join public.partners pa   on pa.id = st.partner_id
        where sg.guest_id = p_guest_id and st.status <> 'cancelled'
      ) x
    ), '[]'::jsonb),
    'companions', coalesce((
      select jsonb_agg(x.j) from (
        select jsonb_build_object(
          'id', g2.id, 'full_name', g2.full_name, 'times', count(distinct st.id),
          'last_stay_at', max(st.check_in_at)) as j
        from public.stay_guests sg1
        join public.stay_guests sg2 on sg2.stay_id = sg1.stay_id and sg2.guest_id <> p_guest_id
        join public.guests g2       on g2.id = sg2.guest_id
        join public.stays st        on st.id = sg1.stay_id and st.status <> 'cancelled'
        where sg1.guest_id = p_guest_id
        group by g2.id, g2.full_name
        order by count(distinct st.id) desc
      ) x
    ), '[]'::jsonb),
    'notes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', n.id, 'kind', n.kind, 'body', n.body,
        'branch', (select b.name from public.branches b where b.id = n.branch_id),
        'author', pr.full_name, 'author_id', pr.id, 'at', n.created_at) order by n.created_at desc)
      from public.guest_notes n
      join public.profiles pr on pr.id = n.created_by
      where n.guest_id = p_guest_id and n.deleted_at is null
      limit 50
    ), '[]'::jsonb),
    'flags', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', f.id, 'type', f.flag_type, 'status', f.status, 'reason', f.reason,
        'branch', (select b.name from public.branches b where b.id = f.branch_id),
        'proposed_at', f.proposed_at, 'decided_at', f.decided_at) order by f.proposed_at desc)
      from public.guest_flags f
      where f.guest_id = p_guest_id
    ), '[]'::jsonb),
    'consents', coalesce((
      select jsonb_object_agg(channel, granted)
      from public.guest_consents where guest_id = p_guest_id
    ), '{}'::jsonb),
    'can', jsonb_build_object(
      'view_full', v_full,
      'update', (v_branch_id is not null and private.has_perm('guest.update', v_branch_id))
                or (v_branch_id is null and exists (select 1 from private.branches_with('guest.update'))),
      'assign_owner', private.has_perm('guest.assign_owner'),
      'note', (v_branch_id is not null and private.has_perm('guest.note_create', v_branch_id))
              or (v_branch_id is null and exists (select 1 from private.branches_with('guest.note_create'))),
      'tag', private.has_perm('guest.tag_manage'),
      'propose_flag', (v_branch_id is not null and private.has_perm('blacklist.propose', v_branch_id))
                      or (v_branch_id is null and exists (select 1 from private.branches_with('blacklist.propose'))),
      'propose_merge', private.has_perm('merge.propose'),
      'override_tier', private.has_perm('loyalty.override'))
  );
end;
$function$;

-- 5. Cập nhật hàm nội bộ private.upsert_guest: Hỗ trợ tìm kiếm theo phone_intl khi check-in
create or replace function private.upsert_guest(p jsonb, p_is_primary boolean, p_can_update boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id          uuid := nullif(p ->> 'guest_id', '')::uuid;
  v_phone       text := nullif(p ->> 'phone', '');
  v_phone_intl  text := nullif(p ->> 'phone_intl', '');
  v_nationality text := coalesce(nullif(p ->> 'nationality', ''), 'VN');
  v_doc_type    public.doc_type := nullif(p -> 'document' ->> 'type', '')::public.doc_type;
  v_doc_no      text := upper(nullif(btrim(p -> 'document' ->> 'number'), ''));
  v_doc_country text := coalesce(nullif(p -> 'document' ->> 'country', ''), 'VN');
  v_owner       uuid;
begin
  if p_is_primary and v_nationality = 'VN' and v_phone is null then
    raise exception 'phone required for primary guest' using errcode = 'P0422';
  end if;
  if not p_is_primary and v_doc_no is null and v_id is null then
    raise exception 'companion needs a document' using errcode = 'P0422';
  end if;

  -- 1. Tìm theo giấy tờ
  if v_id is null and v_doc_no is not null then
    select d.guest_id into v_id from public.guest_documents d
    where d.doc_type = v_doc_type and d.issuing_country = v_doc_country and d.doc_number = v_doc_no;
  end if;

  -- 2. Tìm theo SĐT VN
  if v_id is null and v_phone is not null then
    select g.id into v_id from public.guests g where g.phone = v_phone and g.merged_into is null;
    if v_id is not null and v_doc_no is not null and exists (
      select 1 from public.guest_documents d where d.guest_id = v_id and d.doc_type = v_doc_type) then
      raise exception 'phone belongs to another guest' using errcode = 'P0411';
    end if;
  end if;

  -- 2b. Tìm theo SĐT quốc tế
  if v_id is null and v_phone_intl is not null then
    select g.id into v_id from public.guests g where g.phone_intl = v_phone_intl and g.merged_into is null;
    if v_id is not null and v_doc_no is not null and exists (
      select 1 from public.guest_documents d where d.guest_id = v_id and d.doc_type = v_doc_type) then
      raise exception 'phone belongs to another guest' using errcode = 'P0411';
    end if;
  end if;

  begin
    if v_id is null then
      insert into public.guests (full_name, gender, dob, nationality, phone, phone_intl, email,
                                 address_line, province_code, ward_code, created_by)
      values (p ->> 'full_name', (p ->> 'gender')::public.gender, nullif(p ->> 'dob', '')::date,
              v_nationality, v_phone, v_phone_intl, nullif(p ->> 'email', ''),
              nullif(p ->> 'address_line', ''), nullif(p ->> 'province_code', ''),
              nullif(p ->> 'ward_code', ''), (select auth.uid()))
      returning id into v_id;
    else
      perform 1 from public.guests where id = v_id and merged_into is null for update;
      if not found then
        raise exception 'guest not found or merged' using errcode = 'P0404';
      end if;
      if p_can_update then
        update public.guests set
          full_name     = coalesce(nullif(p ->> 'full_name', ''), full_name),
          gender        = coalesce(nullif(p ->> 'gender', '')::public.gender, gender),
          dob           = coalesce(nullif(p ->> 'dob', '')::date, dob),
          nationality   = v_nationality,
          phone         = coalesce(v_phone, phone),
          phone_intl    = coalesce(v_phone_intl, phone_intl),
          email         = coalesce(nullif(p ->> 'email', ''), email),
          address_line  = coalesce(nullif(p ->> 'address_line', ''), address_line),
          province_code = coalesce(nullif(p ->> 'province_code', ''), province_code),
          ward_code     = coalesce(nullif(p ->> 'ward_code', ''), ward_code)
        where id = v_id;
      end if;
    end if;
  exception when unique_violation then
    raise exception 'phone belongs to another guest' using errcode = 'P0411';
  end;

  -- 3. Gắn giấy tờ
  if v_doc_no is not null then
    select d.guest_id into v_owner from public.guest_documents d
    where d.doc_type = v_doc_type and d.issuing_country = v_doc_country and d.doc_number = v_doc_no;
    if v_owner is null then
      insert into public.guest_documents (guest_id, doc_type, doc_number, issuing_country)
      values (v_id, v_doc_type, v_doc_no, v_doc_country);
    elsif v_owner <> v_id then
      raise exception 'document belongs to another guest' using errcode = 'P0410';
    end if;
  end if;

  return v_id;
end $$;

-- 6. Cập nhật RPC search_guests: Hỗ trợ tìm kiếm theo phone_intl và hiển thị SĐT quốc tế
create or replace function public.search_guests(
  p_mode text,
  p_query text,
  p_limit integer default 20,
  p_branch_ids uuid[] default null::uuid[]
)
returns table(
  id uuid,
  full_name text,
  gender gender,
  birth_year integer,
  nationality character,
  phone text,
  doc_masked text,
  email text,
  tags text[],
  total_stays integer,
  total_nights integer,
  last_stay_at timestamp with time zone,
  last_branch_name text,
  has_blacklist boolean,
  has_attention boolean,
  tier text,
  ord bigint
)
language plpgsql
security definer
set search_path to ''
as $function$
declare
  q                    text := btrim(p_query);
  v_limit              int  := least(greatest(coalesce(p_limit, 20), 1), 50);
  v_can_chain          boolean := private.has_perm('report.view_chain');
  v_my_branches        uuid[] := array(select private.branches_with('guest.search'));
  v_effective_branches uuid[];
  v_flags              boolean := private.has_perm('blacklist.view');
  v_tier               boolean := private.has_perm('loyalty.view');
  v_ids                uuid[];
  v_norm               text;
begin
  perform private.assert_perm('guest.search');
  perform private.hit_rate_limit('search', 60, 60);

  if v_can_chain then
    v_effective_branches := p_branch_ids;
  else
    if p_branch_ids is null then
      v_effective_branches := v_my_branches;
    else
      select coalesce(array_agg(b), '{}'::uuid[]) into v_effective_branches
      from unnest(p_branch_ids) b
      where b = any(v_my_branches);
    end if;
  end if;

  if p_mode in ('phone', 'phone_intl') then
    v_ids := array(
      select g.id from public.guests g
      left join public.guest_stats s on s.guest_id = g.id
      where g.merged_into is null
        and (
          g.phone = q or g.phone like '%' || private.like_escape(q) || '%'
          or g.phone_intl = q or g.phone_intl like '%' || private.like_escape(q) || '%'
        )
        and (
          v_can_chain
          or s.last_branch_id = any(v_effective_branches)
          or exists (
            select 1 from public.stay_guests sg
            join public.stays st on st.id = sg.stay_id
            where sg.guest_id = g.id and st.branch_id = any(v_effective_branches)
          )
          or g.sales_owner_id = (select auth.uid())
        )
      order by g.updated_at desc limit v_limit
    );
  elsif p_mode = 'phone_suffix' then
    if length(q) < 4 then raise exception 'query too short' using errcode = 'P0422'; end if;
    v_ids := array(
      select g.id from public.guests g
      left join public.guest_stats s on s.guest_id = g.id
      where g.merged_into is null
        and (
          g.phone like '%' || private.like_escape(q)
          or g.phone_intl like '%' || private.like_escape(q)
        )
        and (
          v_can_chain
          or s.last_branch_id = any(v_effective_branches)
          or exists (
            select 1 from public.stay_guests sg
            join public.stays st on st.id = sg.stay_id
            where sg.guest_id = g.id and st.branch_id = any(v_effective_branches)
          )
          or g.sales_owner_id = (select auth.uid())
        )
      order by g.updated_at desc limit v_limit
    );
  elsif p_mode = 'doc_suffix' then
    if length(q) < 4 then raise exception 'query too short' using errcode = 'P0422'; end if;
    v_ids := array(
      select distinct d.guest_id from public.guest_documents d
      join public.guests g on g.id = d.guest_id and g.merged_into is null
      left join public.guest_stats s on s.guest_id = g.id
      where d.doc_number like '%' || private.like_escape(upper(q)) || '%'
        and (
          v_can_chain
          or s.last_branch_id = any(v_effective_branches)
          or exists (
            select 1 from public.stay_guests sg
            join public.stays st on st.id = sg.stay_id
            where sg.guest_id = g.id and st.branch_id = any(v_effective_branches)
          )
          or g.sales_owner_id = (select auth.uid())
        )
      limit v_limit
    );
  elsif p_mode = 'email' then
    if length(q) < 3 then raise exception 'query too short' using errcode = 'P0422'; end if;
    v_ids := array(
      select g.id from public.guests g
      left join public.guest_stats s on s.guest_id = g.id
      where g.merged_into is null
        and g.email like private.like_escape(lower(q)) || '%'
        and (
          v_can_chain
          or s.last_branch_id = any(v_effective_branches)
          or exists (
            select 1 from public.stay_guests sg
            join public.stays st on st.id = sg.stay_id
            where sg.guest_id = g.id and st.branch_id = any(v_effective_branches)
          )
          or g.sales_owner_id = (select auth.uid())
        )
      limit v_limit
    );
  elsif p_mode = 'name' then
    v_norm := private.normalize_search(q);
    v_ids := array(
      select g.id from public.guests g
      left join public.guest_stats s on s.guest_id = g.id
      where g.merged_into is null
        and (g.search_name like '%' || private.like_escape(v_norm) || '%')
        and (
          v_can_chain
          or s.last_branch_id = any(v_effective_branches)
          or exists (
            select 1 from public.stay_guests sg
            join public.stays st on st.id = sg.stay_id
            where sg.guest_id = g.id and st.branch_id = any(v_effective_branches)
          )
          or g.sales_owner_id = (select auth.uid())
        )
      limit v_limit
    );
  else
    raise exception 'invalid mode' using errcode = 'P0422';
  end if;

  return query
  select g.id, g.full_name, g.gender, extract(year from g.dob)::int, g.nationality,
         case
           when (s.last_branch_id is not null and private.has_perm('guest.view_full', s.last_branch_id))
                or private.has_perm('report.view_chain')
                or (g.sales_owner_id = (select auth.uid()) and private.has_perm('guest.view_full_own')) then coalesce(g.phone, g.phone_intl)
           when g.phone is not null and length(g.phone) >= 7 then overlay(g.phone placing '****' from 4 for 4)
           when g.phone_intl is not null and length(g.phone_intl) >= 8 then overlay(g.phone_intl placing '****' from 5 for 4)
           else coalesce(g.phone, g.phone_intl)
         end as phone,
         (select private.mask_doc(d.doc_number) from public.guest_documents d
          where d.guest_id = g.id order by (d.doc_type = 'cccd') desc, d.created_at desc limit 1),
         case
           when (s.last_branch_id is not null and private.has_perm('guest.view_full', s.last_branch_id))
                or private.has_perm('report.view_chain')
                or (g.sales_owner_id = (select auth.uid()) and private.has_perm('guest.view_full_own')) or g.email is null then g.email
           else regexp_replace(g.email, '^(.)(.*)(@.*)$', '\1***\3')
         end as email,
         g.tags,
         coalesce(s.total_stays, 0)::integer, coalesce(s.total_nights, 0)::integer, s.last_stay_at, b.name,
         v_flags and exists (select 1 from public.guest_flags f where f.guest_id = g.id
                             and f.flag_type = 'blacklist' and f.status = 'approved'),
         v_flags and exists (select 1 from public.guest_flags f where f.guest_id = g.id
                             and ((f.flag_type = 'attention' and f.status = 'approved')
                                  or (f.flag_type = 'blacklist' and f.status = 'proposed'))),
         case when v_tier then private.guest_tier(g.id) ->> 'name' end,
         t.ord
  from unnest(v_ids) with ordinality as t(gid, ord)
  join public.guests g          on g.id = t.gid and g.merged_into is null
  left join public.guest_stats s on s.guest_id = g.id
  left join public.branches b    on b.id = s.last_branch_id
  order by t.ord;
end;
$function$;

-- 7. Cập nhật RPC export_guests: Thêm cột phone_intl được che mặt nạ
drop function if exists public.export_guests(text, int, text);

create or replace function public.export_guests(
  p_reason text,
  p_limit int default 500,
  p_consent_channel text default null::text
)
returns table (
  id uuid,
  full_name text,
  gender text,
  dob date,
  phone text,
  phone_intl text,
  email text,
  nationality text,
  tags text[],
  sales_name text,
  total_stays int,
  total_nights int,
  doc_number text,
  is_full boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_has_full boolean;
  v_limit int;
begin
  -- 1. Kiểm tra quyền export
  perform private.assert_perm('guest.export');

  -- 2. Kiểm tra lý do xuất file
  if length(trim(coalesce(p_reason, ''))) < 3 then
    raise exception 'Cần nhập lý do xuất dữ liệu khách hàng (tối thiểu 3 ký tự)' using errcode = 'P0400';
  end if;

  v_has_full := private.has_perm('guest.export_full');
  v_limit := least(greatest(coalesce(p_limit, 500), 1), 2000);

  -- 3. Ghi log kiểm toán
  perform private.log_event(
    'guest.export_excel',
    'guests',
    null,
    null,
    jsonb_build_object(
      'reason', p_reason,
      'has_full_perm', v_has_full,
      'requested_limit', v_limit,
      'consent_channel', p_consent_channel
    )
  );

  -- 4. Trả về bảng dữ liệu
  return query
  select
    g.id,
    g.full_name,
    g.gender::text,
    case when p_consent_channel is not null then null::date else g.dob end as dob,
    case
      when v_has_full then g.phone
      when length(g.phone) >= 7 then overlay(g.phone placing '****' from 4 for 4)
      else g.phone
    end as phone,
    case
      when v_has_full then g.phone_intl
      when length(g.phone_intl) >= 8 then overlay(g.phone_intl placing '****' from 5 for 4)
      else g.phone_intl
    end as phone_intl,
    g.email,
    g.nationality::text,
    g.tags,
    p.full_name as sales_name,
    coalesce(gs.total_stays, 0) as total_stays,
    coalesce(gs.total_nights, 0) as total_nights,
    case
      when p_consent_channel is not null then null::text
      when v_has_full then d.doc_number
      else private.mask_doc(d.doc_number)
    end as doc_number,
    v_has_full as is_full
  from public.guests g
  left join public.profiles p on p.id = g.sales_owner_id
  left join public.guest_stats gs on gs.guest_id = g.id
  left join lateral (
    select doc_number from public.guest_documents
    where guest_id = g.id
    order by (doc_type = 'cccd') desc, created_at desc
    limit 1
  ) d on true
  where g.merged_into is null
    and (
      p_consent_channel is null
      or exists (
        select 1 from public.guest_consents gc
        where gc.guest_id = g.id
          and gc.channel = p_consent_channel::public.consent_channel
          and gc.granted = true
      )
    )
  order by g.created_at desc
  limit v_limit;
end;
$$;

-- 8. Cấp quyền thực thi cho authenticated
grant execute on function public.lookup_for_checkin(uuid, text, text) to authenticated;
grant execute on function public.create_guest(jsonb) to authenticated;
grant execute on function public.update_guest(uuid, jsonb, timestamptz) to authenticated;
grant execute on function public.guest_profile(uuid) to authenticated;
grant execute on function public.search_guests(text, text, integer, uuid[]) to authenticated;
grant execute on function public.export_guests(text, integer, text) to authenticated;



