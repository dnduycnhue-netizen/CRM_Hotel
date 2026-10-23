-- Migration 20261101000027_flexible_search_and_role_permissions.sql
-- 1. Nâng cấp hàm search_guests hỗ trợ tìm kiếm số điện thoại linh hoạt (cả đầu số 0902, đuôi số 0099 hoặc chứa chuỗi số)
-- 2. Đảm bảo chuẩn hóa phân quyền: Quản lý cơ sở không có quyền quản trị chuỗi settings.* và audit.view_all

create or replace function public.search_guests(p_mode text, p_query text, p_limit int default 20)
returns table (
  id uuid, full_name text, gender public.gender, birth_year int, nationality char(2),
  phone text, doc_masked text, email text, tags text[],
  total_stays int, total_nights int, last_stay_at timestamptz, last_branch_name text,
  has_blacklist boolean, has_attention boolean, tier text, ord bigint
)
language plpgsql security definer set search_path = '' as $$
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
         g.phone,
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
end $$;

-- Rà soát và loại bỏ quyền quản trị khỏi vai trò branch_manager nếu còn sót
delete from public.role_permissions
where role_id in (select id from public.roles where key = 'branch_manager')
  and permission_key in (
    'settings.branches',
    'settings.rooms',
    'settings.users',
    'settings.roles',
    'settings.modules',
    'settings.sources',
    'audit.view_all',
    'report.view_chain',
    'loyalty.configure'
  );

-- Đảm bảo vai trò technician có quyền room.block để khóa buồng phòng sự cố
insert into public.role_permissions (role_id, permission_key)
select r.id, 'room.block'
from public.roles r
where r.key = 'technician'
  and not exists (
    select 1 from public.role_permissions rp
    where rp.role_id = r.id and rp.permission_key = 'room.block'
  );
