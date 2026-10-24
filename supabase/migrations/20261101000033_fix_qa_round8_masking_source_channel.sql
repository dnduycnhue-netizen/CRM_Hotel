-- 20261101000033_fix_qa_round8_masking_source_channel.sql
-- Khắc phục toàn bộ các điểm phát hiện trong Báo cáo QA Vòng 8 (C1, C2, O3):
-- 1. Bảo mật: Bịt lỗ hổng khi last_branch_id is null trong hàm has_perm (C1)
-- 2. Đồng nhất: doc_number trên get_guests_list luôn được che mặt nạ (O3)
-- 3. Nguồn khách: Tự động trích xuất source_channel_id từ tags trong create_guest và làm sạch tags (C2)
-- 4. Bổ sung hỗ trợ cập nhật source_channel_id trong update_guest

-- 1. Sửa RPC search_guests
drop function if exists public.search_guests(text, text, integer, uuid[]);

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

  if p_mode = 'phone' then
    v_ids := array(
      select g.id from public.guests g
      left join public.guest_stats s on s.guest_id = g.id
      where g.merged_into is null
        and (g.phone = q or g.phone like '%' || private.like_escape(q) || '%')
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
        and g.phone like '%' || private.like_escape(q) || '%'
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
  elsif p_mode in ('cccd', 'passport') then
    v_ids := array(
      select d.guest_id from public.guest_documents d
      join public.guests g on g.id = d.guest_id and g.merged_into is null
      left join public.guest_stats s on s.guest_id = g.id
      where d.doc_type = p_mode::public.doc_type
        and d.doc_number = upper(q)
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
    if length(v_norm) < 2 then raise exception 'query too short' using errcode = 'P0422'; end if;
    v_ids := array(
      select g.id from public.guests g
      left join public.guest_stats s on s.guest_id = g.id
      where g.merged_into is null
        and g.search_name like all (
          array(select '%' || private.like_escape(w) || '%' from regexp_split_to_table(v_norm, ' ') w))
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
      order by extensions.similarity(g.search_name, v_norm) desc, g.updated_at desc
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
                or (g.sales_owner_id = (select auth.uid()) and private.has_perm('guest.view_full_own')) then g.phone
           when length(g.phone) >= 7 then overlay(g.phone placing '****' from 4 for 4)
           else g.phone
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

-- 2. Sửa RPC get_guests_list: Đồng nhất che mặt nạ doc_number và sửa điều kiện view_full
drop function if exists public.get_guests_list(integer, uuid, text, uuid);

create or replace function public.get_guests_list(
  p_limit integer default 50,
  p_sales_owner_id uuid default null::uuid,
  p_tag text default null::text,
  p_branch_id uuid default null::uuid
)
returns table(
  id uuid,
  full_name text,
  gender text,
  dob date,
  phone text,
  email text,
  tags text[],
  sales_owner_id uuid,
  sales_owner_name text,
  total_stays integer,
  total_nights integer,
  last_stay_at timestamp with time zone,
  last_branch_name text,
  doc_number text,
  doc_type text,
  source_channel_id uuid,
  source_channel_name text
)
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_can_chain   boolean := private.has_perm('report.view_chain');
  v_my_branches uuid[] := array(select private.branches_with('guest.search'));
  v_effective_branches uuid[];
begin
  perform private.assert_perm('guest.search');

  if v_can_chain then
    v_effective_branches := case when p_branch_id is not null then array[p_branch_id] else null end;
  else
    if p_branch_id is null then
      v_effective_branches := v_my_branches;
    else
      if p_branch_id = any(v_my_branches) then
        v_effective_branches := array[p_branch_id];
      else
        return;
      end if;
    end if;
  end if;

  return query
  select
    g.id,
    g.full_name,
    g.gender::text,
    case
      when (s.last_branch_id is not null and private.has_perm('guest.view_full', s.last_branch_id))
           or private.has_perm('report.view_chain')
           or (g.sales_owner_id = (select auth.uid()) and private.has_perm('guest.view_full_own')) then g.dob
      else null::date
    end as dob,
    case
      when (s.last_branch_id is not null and private.has_perm('guest.view_full', s.last_branch_id))
           or private.has_perm('report.view_chain')
           or (g.sales_owner_id = (select auth.uid()) and private.has_perm('guest.view_full_own')) then g.phone
      when length(g.phone) >= 7 then overlay(g.phone placing '****' from 4 for 4)
      else g.phone
    end as phone,
    case
      when (s.last_branch_id is not null and private.has_perm('guest.view_full', s.last_branch_id))
           or private.has_perm('report.view_chain')
           or (g.sales_owner_id = (select auth.uid()) and private.has_perm('guest.view_full_own')) or g.email is null then g.email
      else regexp_replace(g.email, '^(.)(.*)(@.*)$', '\1***\3')
    end as email,
    g.tags,
    g.sales_owner_id,
    p.full_name as sales_owner_name,
    coalesce(s.total_stays, 0)::integer as total_stays,
    coalesce(s.total_nights, 0)::integer as total_nights,
    s.last_stay_at,
    b.name as last_branch_name,
    -- Luôn che mặt nạ giấy tờ trên danh sách để tuân thủ chính sách bảo mật (O3)
    private.mask_doc(d.doc_number) as doc_number,
    d.doc_type::text,
    g.source_channel_id,
    sc.name as source_channel_name
  from public.guests g
  left join public.profiles p on p.id = g.sales_owner_id
  left join public.guest_stats s on s.guest_id = g.id
  left join public.branches b on b.id = s.last_branch_id
  left join public.source_channels sc on sc.id = g.source_channel_id
  left join lateral (
    select gd.doc_number, gd.doc_type
    from public.guest_documents gd
    where gd.guest_id = g.id
    order by (gd.doc_type = 'cccd') desc, gd.created_at desc
    limit 1
  ) d on true
  where g.merged_into is null
    and (p_sales_owner_id is null or g.sales_owner_id = p_sales_owner_id)
    and (p_tag is null or p_tag = any(g.tags))
    and (
      v_effective_branches is null
      or s.last_branch_id = any(v_effective_branches)
      or exists (
        select 1 from public.stay_guests sg
        join public.stays st on st.id = sg.stay_id
        where sg.guest_id = g.id and st.branch_id = any(v_effective_branches)
      )
      or g.sales_owner_id = (select auth.uid())
    )
  order by g.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
end $function$;

-- 3. Sửa RPC get_guest_profile: Sửa kiểm tra v_full khi last_branch_id is null
create or replace function public.get_guest_profile(p_guest_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_g           public.guests;
  v_branch_id   uuid;
  v_full        boolean;
begin
  perform private.assert_perm('guest.view_summary');
  select * into v_g from public.guests where id = p_guest_id;
  if not found then raise exception 'guest not found' using errcode = 'P0404'; end if;
  if v_g.merged_into is not null then
    return jsonb_build_object('redirect_to', v_g.merged_into);
  end if;

  select s.last_branch_id into v_branch_id from public.guest_stats s where s.guest_id = p_guest_id;

  v_full := (v_branch_id is not null and private.has_perm('guest.view_full', v_branch_id))
            or private.has_perm('report.view_chain')
            or (v_g.sales_owner_id = (select auth.uid()) and private.has_perm('guest.view_full_own'));

  if v_full then
    perform private.log_event('guest.view_full', 'guests', p_guest_id);
  end if;

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
      'phone_intl', case when v_full then v_g.phone_intl else null end,
      'email', v_g.email,
      'address_line', case when v_full then v_g.address_line end,
      'province_code', v_g.province_code, 'ward_code', case when v_full then v_g.ward_code end,
      'tags', v_g.tags, 'created_at', v_g.created_at, 'updated_at', v_g.updated_at,
      'sales_owner', (select jsonb_build_object('id', pr.id, 'name', pr.full_name)
                      from public.profiles pr where pr.id = v_g.sales_owner_id),
      'source_channel', (select jsonb_build_object('id', sc.id, 'name', sc.name, 'kind', sc.kind)
                         from public.source_channels sc where sc.id = v_g.source_channel_id)),
    'tier', case when private.has_perm('loyalty.view') then private.guest_tier(p_guest_id) end,
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
          'id', st.id, 'branch', b.name, 'room', r.number, 'status', st.status,
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
        where sg.guest_id = p_guest_id
        order by st.check_in_at desc
        limit 50) x), '[]'::jsonb),
    'companions', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'full_name', c.full_name, 'times', c.n) order by c.n desc)
      from (
        select g2.id, g2.full_name, count(*) as n
        from public.stay_guests a
        join public.stay_guests o on o.stay_id = a.stay_id and o.guest_id <> a.guest_id
        join public.guests g2     on g2.id = o.guest_id and g2.merged_into is null
        where a.guest_id = p_guest_id
        group by g2.id, g2.full_name
        order by n desc limit 10) c), '[]'::jsonb),
    'notes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', n.id, 'kind', n.kind, 'body', n.body, 'branch', b.name,
        'author', pr.full_name, 'author_id', n.created_by, 'at', n.created_at)
        order by n.created_at desc)
      from (select * from public.guest_notes where guest_id = p_guest_id and deleted_at is null
            order by created_at desc limit 50) n
      left join public.branches b  on b.id = n.branch_id
      left join public.profiles pr on pr.id = n.created_by), '[]'::jsonb),
    'flags', case when private.has_perm('blacklist.view') then coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', f.id, 'type', f.flag_type, 'status', f.status, 'reason', f.reason,
        'branch', b.name, 'proposed_at', f.proposed_at, 'decided_at', f.decided_at)
        order by f.proposed_at desc)
      from public.guest_flags f join public.branches b on b.id = f.branch_id
      where f.guest_id = p_guest_id and f.status in ('proposed', 'approved')), '[]'::jsonb)
      else '[]'::jsonb end,
    'consents', coalesce((
      select jsonb_object_agg(c.channel, c.granted)
      from public.guest_consents c where c.guest_id = p_guest_id), '{}'::jsonb),
    'can', jsonb_build_object(
      'view_full', v_full,
      'update', private.has_perm('guest.update'),
      'assign_owner', private.has_perm('guest.assign_owner'),
      'note', private.has_perm('guest.note_create'),
      'tag', private.has_perm('guest.tag_manage'),
      'propose_flag', private.has_perm('blacklist.propose'),
      'propose_merge', private.has_perm('merge.propose'))
  );
end;
$function$;

-- 4. Cập nhật create_guest: Tự động trích xuất source_channel_id từ tags và lọc sạch tags nguồn (C2)
create or replace function public.create_guest(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_id         uuid;
  v_phone      text := nullif(p ->> 'phone', '');
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

  if v_phone is null and v_doc_no is null and nullif(p ->> 'phone_intl', '') is null then
    raise exception 'phone or document required' using errcode = 'P0422';
  end if;

  if v_doc_no is not null then
    select guest_id into v_id from public.guest_documents
    where doc_type = v_doc_type::public.doc_type and doc_number = v_doc_no;
  end if;
  if v_id is null and v_phone is not null then
    select id into v_id from public.guests where phone = v_phone and merged_into is null;
  end if;
  if v_id is not null then
    return jsonb_build_object('guest_id', v_id, 'existing', true);
  end if;

  v_id := private.upsert_guest(p - 'guest_id',
                             v_phone is not null or coalesce(nullif(p ->> 'nationality', ''), 'VN') <> 'VN', false);

  if p ? 'tags' and jsonb_typeof(p -> 'tags') = 'array' then
    v_raw_tags := array(select jsonb_array_elements_text(p -> 'tags'));
    foreach v_tag in array v_raw_tags loop
      -- Nếu tag có dạng 'Nguồn: ...' hoặc '#Nguồn: ...'
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
        -- Không đưa tag này vào v_clean_tags để tránh trùng lặp
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

-- 5. Cập nhật update_guest: Hỗ trợ cập nhật source_channel_id
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

  v_name  := coalesce(nullif(btrim(p_patch ->> 'full_name'), ''), v_g.full_name);
  v_phone := coalesce(nullif(btrim(p_patch ->> 'phone'), ''), v_g.phone);
  v_email := coalesce(nullif(btrim(p_patch ->> 'email'), ''), v_g.email);

  if v_phone is not null and v_phone <> coalesce(v_g.phone, '') then
    if exists (select 1 from public.guests where phone = v_phone and id <> p_guest_id and merged_into is null) then
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
      phone_intl = case when p_patch ? 'phone_intl' then nullif(p_patch ->> 'phone_intl', '') else v_g.phone_intl end,
      email = v_email,
      address_line = case when p_patch ? 'address_line' then nullif(p_patch ->> 'address_line', '') else v_g.address_line end,
      province_code = case when p_patch ? 'province_code' then nullif(p_patch ->> 'province_code', '') else v_g.province_code end,
      ward_code = case when p_patch ? 'ward_code' then nullif(p_patch ->> 'ward_code', '') else v_g.ward_code end,
      source_channel_id = v_source_id,
      updated_at = now()
  where id = p_guest_id;

  perform private.log_event('guest.update', 'guests', p_guest_id, null, p_patch);

  return jsonb_build_object('id', p_guest_id, 'updated', true);
end $$;

-- 6. Dọn dẹp dữ liệu lịch sử các hồ sơ test V7, V8 và cập nhật FK source_channel_id chuẩn (C2 backfill)
update public.guests
set source_channel_id = '1f21a799-c7bf-4391-a772-9ebb5b5f9a87', -- Fanpage / mạng xã hội
    tags = array_remove(array_remove(tags, 'Nguồn: Fanpage / Mạng xã hội'), '#Nguồn: Fanpage / Mạng xã hội')
where id = '1861ed52-7f50-41d7-b6be-c7c880b23914' -- Nguyễn Văn Test V8
   or full_name ilike '%Test V8%';

update public.guests
set source_channel_id = coalesce(source_channel_id, '2f25508d-535b-4001-a49e-87b1015f29c5'), -- Điện thoại / Zalo
    tags = array_remove(array_remove(tags, 'Nguồn: Điện thoại / Zalo'), '#Nguồn: Điện thoại / Zalo')
where id = '093db632-8746-45bc-b00e-998cb09e2232' -- Nguyễn Văn Test V7
   or full_name ilike '%Test V7%';
