-- Migration 30: Consistent phone masking across list, search, and detail profile
-- Tuân thủ QA-04 & Rule 7: Đồng bộ cơ chế che số điện thoại cho vai trò Sales

-- 1. Cập nhật hàm get_guest_profile để che số điện thoại khi không có quyền view_full / view_full_own
create or replace function public.get_guest_profile(p_guest_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_g    public.guests;
  v_full boolean;
begin
  perform private.assert_perm('guest.view_summary');
  select * into v_g from public.guests where id = p_guest_id;
  if not found then raise exception 'guest not found' using errcode = 'P0404'; end if;
  if v_g.merged_into is not null then
    return jsonb_build_object('redirect_to', v_g.merged_into);
  end if;

  v_full := private.has_perm('guest.view_full')
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
                      from public.profiles pr where pr.id = v_g.sales_owner_id)),
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
$$;

-- 2. Cập nhật search_guests để che số điện thoại đồng bộ
drop function if exists public.search_guests(text, text, integer);

create or replace function public.search_guests(p_mode text, p_query text, p_limit int default 20)
returns table (
  id uuid, full_name text, gender public.gender, birth_year int, nationality char(2),
  phone text, doc_masked text, email text, tags text[],
  total_stays int, total_nights int, last_stay_at timestamptz, last_branch_name text,
  has_blacklist boolean, has_attention boolean, tier text, ord bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  q       text := btrim(p_query);
  v_limit int  := least(greatest(coalesce(p_limit, 20), 1), 50);
  v_flags boolean := private.has_perm('blacklist.view');
  v_tier  boolean := private.has_perm('loyalty.view');
  v_ids   uuid[];
  v_norm  text;
begin
  perform private.assert_perm('guest.search');
  perform private.hit_rate_limit('search', 60, 60);

  if p_mode = 'phone' then
    v_ids := array(select g.id from public.guests g
                   where g.merged_into is null and (g.phone = q or g.phone like '%' || private.like_escape(q) || '%')
                   order by g.updated_at desc limit v_limit);
  elsif p_mode = 'phone_suffix' then
    if length(q) < 4 then raise exception 'query too short' using errcode = 'P0422'; end if;
    v_ids := array(select g.id from public.guests g
                   where g.merged_into is null and g.phone like '%' || private.like_escape(q) || '%'
                   order by g.updated_at desc limit v_limit);
  elsif p_mode in ('cccd', 'passport') then
    v_ids := array(select d.guest_id from public.guest_documents d
                   where d.doc_type = p_mode::public.doc_type and d.doc_number = upper(q) limit v_limit);
  elsif p_mode = 'doc_suffix' then
    if length(q) < 4 then raise exception 'query too short' using errcode = 'P0422'; end if;
    v_ids := array(select distinct d.guest_id from public.guest_documents d
                   where d.doc_number like '%' || private.like_escape(upper(q)) || '%' limit v_limit);
  elsif p_mode = 'email' then
    if length(q) < 3 then raise exception 'query too short' using errcode = 'P0422'; end if;
    v_ids := array(select g.id from public.guests g
                   where g.merged_into is null and g.email like private.like_escape(lower(q)) || '%'
                   limit v_limit);
  elsif p_mode = 'name' then
    v_norm := private.normalize_search(q);
    if length(v_norm) < 2 then raise exception 'query too short' using errcode = 'P0422'; end if;
    v_ids := array(
      select g.id from public.guests g
      where g.merged_into is null
        and g.search_name like all (
          array(select '%' || private.like_escape(w) || '%' from regexp_split_to_table(v_norm, ' ') w))
      order by extensions.similarity(g.search_name, v_norm) desc, g.updated_at desc
      limit v_limit);
  else
    raise exception 'invalid mode' using errcode = 'P0422';
  end if;

  return query
  select g.id, g.full_name, g.gender, extract(year from g.dob)::int, g.nationality,
         case
           when private.has_perm('guest.view_full')
                or (g.sales_owner_id = (select auth.uid()) and private.has_perm('guest.view_full_own')) then g.phone
           when length(g.phone) >= 7 then overlay(g.phone placing '****' from 4 for 4)
           else g.phone
         end as phone,
         (select private.mask_doc(d.doc_number) from public.guest_documents d
          where d.guest_id = g.id order by (d.doc_type = 'cccd') desc, d.created_at desc limit 1),
         g.email, g.tags,
         coalesce(s.total_stays, 0), coalesce(s.total_nights, 0), s.last_stay_at, b.name,
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
$$;

-- 3. Cập nhật get_guests_list để hỗ trợ quyền view_full_own
drop function if exists public.get_guests_list(int, uuid, text);

create or replace function public.get_guests_list(
  p_limit int default 50,
  p_sales_owner_id uuid default null,
  p_tag text default null
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
  total_stays bigint,
  total_nights bigint,
  last_stay_at timestamptz,
  last_branch_name text,
  doc_number text,
  doc_type text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_perm('guest.search');

  return query
  select
    g.id,
    g.full_name,
    g.gender::text,
    g.dob,
    case
      when private.has_perm('guest.view_full')
           or (g.sales_owner_id = (select auth.uid()) and private.has_perm('guest.view_full_own')) then g.phone
      when length(g.phone) >= 7 then overlay(g.phone placing '****' from 4 for 4)
      else g.phone
    end as phone,
    g.email,
    g.tags,
    g.sales_owner_id,
    p.full_name as sales_owner_name,
    coalesce(s.total_stays, 0) as total_stays,
    coalesce(s.total_nights, 0) as total_nights,
    s.last_stay_at,
    b.name as last_branch_name,
    case
      when private.has_perm('guest.view_full')
           or (g.sales_owner_id = (select auth.uid()) and private.has_perm('guest.view_full_own')) then d.doc_number
      else private.mask_doc(d.doc_number)
    end as doc_number,
    d.doc_type::text
  from public.guests g
  left join public.profiles p on p.id = g.sales_owner_id
  left join public.guest_stats s on s.guest_id = g.id
  left join public.branches b on b.id = s.last_branch_id
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
  order by g.created_at desc
  limit least(coalesce(p_limit, 50), 200);
end;
$$;
