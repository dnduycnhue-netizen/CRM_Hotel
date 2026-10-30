-- Migration 63: Xóa mềm khách hàng tiềm năng B2B (Soft delete, Thùng rác, Khôi phục, Xóa vĩnh viễn)
-- và hỗ trợ xuất file Excel không giới hạn 1000 dòng theo quyết định User 30/10.
-- ----------------------------------------------------------------------------------------------------

-- 1. Bổ sung các cột xóa mềm vào bảng tour_prospects
alter table public.tour_prospects
  add column if not exists deleted_at timestamptz default null,
  add column if not exists deleted_by uuid references public.profiles(id) default null;

create index if not exists tour_prospects_deleted_idx
  on public.tour_prospects (deleted_at);

-- 2. Cập nhật unique index cho tax_code và phone để các bản ghi trong thùng rác không chặn tạo mới
drop index if exists public.tour_prospects_tax_uq;
drop index if exists public.tour_prospects_phone_uq;

create unique index tour_prospects_tax_uq
  on public.tour_prospects (tax_code_norm)
  where tax_code_norm is not null and status <> 'duplicate' and deleted_at is null;

create unique index tour_prospects_phone_uq
  on public.tour_prospects (phone_norm)
  where phone_norm is not null and status <> 'duplicate' and deleted_at is null;

-- 3. Phân quyền:
-- Cấp lại quyền prospect.delete cho sales (xóa mềm 1-click vào thùng rác)
-- Lễ tân vẫn KHÔNG có quyền prospect.delete.
-- Thêm quyền prospect.purge (xóa vĩnh viễn từ thùng rác) chỉ cho branch_manager và owner.
insert into public.permissions (key, module_key, kind, label, sort) values
  ('prospect.purge', 'prospects', 'write', 'Xóa vĩnh viễn khách tiềm năng trong thùng rác', 347)
on conflict (key) do nothing;

insert into public.role_permissions (role_id, permission_key)
select r.id, 'prospect.delete'
from public.roles r
where r.key in ('sales', 'branch_manager', 'owner')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_key)
select r.id, 'prospect.purge'
from public.roles r
where r.key in ('branch_manager', 'owner')
on conflict do nothing;

-- 4. Cập nhật hàm chống trùng để bỏ qua bản ghi trong thùng rác
create or replace function private.find_prospect_duplicates(
  p_name text, p_phone text, p_tax_code text, p_website text,
  p_province text, p_exclude_id uuid
)
returns table (match_type text, source text, id uuid, name text, phone text,
               assigned_to uuid, status text)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_name   text := private.normalize_company_name(p_name);
  v_phone  text := private.normalize_phone(p_phone);
  v_tax    text := private.normalize_tax_code(p_tax_code);
  v_domain text := case when private.is_generic_domain(private.normalize_domain(p_website))
                        then null else private.normalize_domain(p_website) end;
  v_prov   text := nullif(lower(btrim(coalesce(p_province, ''))), '');
begin
  -- Lớp 1: chặn cứng MST
  if v_tax is not null then
    return query
      select 'hard_tax'::text, 'prospect'::text, t.id, t.company_name, t.phone_norm, t.assigned_to, t.status
        from public.tour_prospects t
       where t.tax_code_norm = v_tax and t.status <> 'duplicate'
         and t.deleted_at is null
         and (p_exclude_id is null or t.id <> p_exclude_id);
    return query
      select 'hard_tax'::text, 'partner'::text, p.id, p.name, private.normalize_phone(p.phone), null::uuid, null::text
        from public.partners p
       where private.normalize_tax_code(p.tax_code) = v_tax;
  end if;

  -- Lớp 1: chặn cứng SĐT
  if v_phone is not null then
    return query
      select 'hard_phone'::text, 'prospect'::text, t.id, t.company_name, t.phone_norm, t.assigned_to, t.status
        from public.tour_prospects t
       where t.phone_norm = v_phone and t.status <> 'duplicate'
         and t.deleted_at is null
         and (p_exclude_id is null or t.id <> p_exclude_id);
    return query
      select 'hard_phone'::text, 'partner'::text, p.id, p.name, private.normalize_phone(p.phone), null::uuid, null::text
        from public.partners p
       where private.normalize_phone(p.phone) = v_phone;
  end if;

  -- Lớp 2: nghi trùng theo tên chuẩn hóa + cùng tỉnh
  if v_name is not null then
    return query
      select 'soft_name'::text, 'prospect'::text, t.id, t.company_name, t.phone_norm, t.assigned_to, t.status
        from public.tour_prospects t
       where t.name_norm = v_name and t.status <> 'duplicate'
         and t.deleted_at is null
         and (p_exclude_id is null or t.id <> p_exclude_id)
         and (v_prov is null or t.province is null or lower(btrim(t.province)) = v_prov);
    return query
      select 'soft_name'::text, 'partner'::text, p.id, p.name, private.normalize_phone(p.phone), null::uuid, null::text
        from public.partners p
       where private.normalize_company_name(p.name) = v_name;
  end if;

  -- Lớp 2: nghi trùng theo domain website
  if v_domain is not null then
    return query
      select 'soft_domain'::text, 'prospect'::text, t.id, t.company_name, t.phone_norm, t.assigned_to, t.status
        from public.tour_prospects t
       where t.website_domain = v_domain and t.status <> 'duplicate'
         and t.deleted_at is null
         and (p_exclude_id is null or t.id <> p_exclude_id);
    return query
      select 'soft_domain'::text, 'partner'::text, p.id, p.name, private.normalize_phone(p.phone), null::uuid, null::text
        from public.partners p
       where private.normalize_domain(p.website) = v_domain;
  end if;
end $$;

-- 5. RPC Xóa mềm (delete_prospect): Chuyển vào thùng rác
create or replace function public.delete_prospect(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_p public.tour_prospects%rowtype;
  v_uid uuid := (select auth.uid());
begin
  perform private.assert_perm('prospect.delete');

  select * into v_p from public.tour_prospects where id = p_id;
  if not found then
    raise exception 'Không tìm thấy khách tiềm năng' using errcode = 'P0404';
  end if;

  if v_p.deleted_at is not null then
    raise exception 'Khách tiềm năng này đã nằm trong thùng rác' using errcode = 'P0422';
  end if;

  -- Thực hiện xóa mềm
  update public.tour_prospects
     set deleted_at = now(),
         deleted_by = v_uid,
         updated_at = now()
   where id = p_id;

  -- Ghi nhận nhật ký tương tác hệ thống
  insert into public.prospect_interactions (
    prospect_id, entry_type, channel, outcome, note, created_by
  ) values (
    p_id, 'system', null, null, 'Đã chuyển hồ sơ vào thùng rác', v_uid
  );

  perform private.log_event(
    'prospect.delete_soft',
    'tour_prospects',
    p_id,
    null,
    jsonb_build_object('company_name', v_p.company_name, 'status', v_p.status)
  );

  return jsonb_build_object('success', true, 'id', p_id, 'company_name', v_p.company_name);
end;
$$;

-- 6. RPC Khôi phục từ thùng rác (restore_prospect)
create or replace function public.restore_prospect(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_p public.tour_prospects%rowtype;
  v_uid uuid := (select auth.uid());
begin
  perform private.assert_perm('prospect.delete');

  select * into v_p from public.tour_prospects where id = p_id;
  if not found then
    raise exception 'Không tìm thấy khách tiềm năng' using errcode = 'P0404';
  end if;

  if v_p.deleted_at is null then
    raise exception 'Khách tiềm năng không ở trong thùng rác' using errcode = 'P0422';
  end if;

  -- Khôi phục hồ sơ
  update public.tour_prospects
     set deleted_at = null,
         deleted_by = null,
         updated_at = now()
   where id = p_id;

  -- Ghi nhận nhật ký tương tác hệ thống
  insert into public.prospect_interactions (
    prospect_id, entry_type, channel, outcome, note, created_by
  ) values (
    p_id, 'system', null, null, 'Đã khôi phục hồ sơ từ thùng rác', v_uid
  );

  perform private.log_event(
    'prospect.restore',
    'tour_prospects',
    p_id,
    null,
    jsonb_build_object('company_name', v_p.company_name, 'status', v_p.status)
  );

  return jsonb_build_object('success', true, 'id', p_id, 'company_name', v_p.company_name);
end;
$$;

-- 7. RPC Xóa vĩnh viễn (purge_prospect) - Chỉ cho phép từ thùng rác, và chặn nếu đã converted
create or replace function public.purge_prospect(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_p public.tour_prospects%rowtype;
begin
  perform private.assert_perm('prospect.purge');

  select * into v_p from public.tour_prospects where id = p_id;
  if not found then
    raise exception 'Không tìm thấy khách tiềm năng' using errcode = 'P0404';
  end if;

  if v_p.deleted_at is null then
    raise exception 'Chỉ có thể xóa vĩnh viễn khách tiềm năng đã ở trong thùng rác' using errcode = 'P0422';
  end if;

  if v_p.converted_partner_id is not null or v_p.status = 'converted' then
    raise exception 'Không thể xóa vĩnh viễn khách tiềm năng đã chuyển đổi thành đối tác' using errcode = 'P0422';
  end if;

  -- Gỡ liên kết duplicate_of_id nếu có
  update public.tour_prospects
     set duplicate_of_id = null
   where duplicate_of_id = p_id;

  -- Xóa cứng (cascade tương tác)
  delete from public.tour_prospects where id = p_id;

  perform private.log_event(
    'prospect.purge',
    'tour_prospects',
    p_id,
    null,
    jsonb_build_object('company_name', v_p.company_name)
  );

  return jsonb_build_object('success', true, 'id', p_id);
end;
$$;

-- 8. Cập nhật private.prospect_to_json để bổ sung trường deleted_at, deleted_by
create or replace function private.prospect_to_json(t public.tour_prospects)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid  uuid := (select auth.uid());
  v_mgr  boolean := private.has_perm('prospect.assign');
  v_full boolean;
begin
  v_full := v_mgr or coalesce(t.assigned_to = v_uid, false);
  return jsonb_build_object(
    'id', t.id, 'company_name', t.company_name, 'kind', t.kind,
    'tax_code', t.tax_code, 'email', t.email, 'website', t.website,
    'address', t.address, 'province', t.province,
    'phone_display', case when v_full then t.phone else private.mask_phone(t.phone) end,
    'contact_phone_display', case when v_full then t.contact_phone else private.mask_phone(t.contact_phone) end,
    'is_masked', not v_full,
    'contact_name', t.contact_name, 'contact_title', t.contact_title,
    'source', t.source,
    'estimated_groups_per_year', t.estimated_groups_per_year,
    'estimated_guests_per_year', t.estimated_guests_per_year,
    'assigned_to', t.assigned_to,
    'assigned_to_name', (select pr.full_name from public.profiles pr where pr.id = t.assigned_to),
    'status', t.status, 'lost_reason', t.lost_reason, 'duplicate_of_id', t.duplicate_of_id,
    'priority', t.priority, 'note', t.note,
    'last_contacted_at', t.last_contacted_at, 'next_follow_up_at', t.next_follow_up_at,
    'dup_override_reason', t.dup_override_reason, 'dup_reviewed', t.dup_reviewed,
    'converted_partner_id', t.converted_partner_id,
    'converted_partner_name', (select p.name from public.partners p where p.id = t.converted_partner_id),
    'converted_at', t.converted_at,
    'created_at', t.created_at, 'updated_at', t.updated_at,
    'deleted_at', t.deleted_at, 'deleted_by', t.deleted_by,
    'is_overdue', (t.status in ('new','contacted','nurturing','negotiating')
                   and t.next_follow_up_at is not null
                   and t.next_follow_up_at < (now() at time zone 'Asia/Ho_Chi_Minh')::date),
    'can_edit', (t.deleted_at is null and t.status <> 'converted' and private.has_perm('prospect.manage')
                 and (v_mgr or coalesce(t.assigned_to = v_uid, false))),
    'can_claim', (t.deleted_at is null and t.assigned_to is null
                  and t.status in ('new','contacted','nurturing','negotiating')
                  and private.has_perm('prospect.manage')),
    'interaction_count', (select count(*) from public.prospect_interactions i
                           where i.prospect_id = t.id and i.entry_type = 'contact')
  );
end $$;

-- 9. Cập nhật public.get_prospects hỗ trợ lọc Thùng rác (p_in_trash) và nới lỏng p_limit khi export
drop function if exists public.get_prospects(text, text, text, text, uuid, boolean, boolean, int, boolean);
drop function if exists public.get_prospects;

create or replace function public.get_prospects(
  p_search text default null,
  p_status text default null,
  p_kind text default null,
  p_province text default null,
  p_assigned_to uuid default null,
  p_overdue_only boolean default false,
  p_dup_pending boolean default false,
  p_limit int default 500,
  p_unassigned_only boolean default false,
  p_in_trash boolean default false
) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_q      text := nullif(btrim(coalesce(p_search, '')), '');
  v_qname  text := private.normalize_company_name(p_search);
  v_qphone text := private.normalize_phone(p_search);
  v_today  date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_limit  int;
  v_res    jsonb;
begin
  perform private.assert_perm('prospect.view');

  if p_limit is null or p_limit <= 0 then
    v_limit := 100000;
  else
    v_limit := p_limit;
  end if;

  with filtered as (
    select t.id
      from public.tour_prospects t
     where ((not coalesce(p_in_trash, false) and t.deleted_at is null)
            or (coalesce(p_in_trash, false) and t.deleted_at is not null))
       and (v_q is null
            or (v_qname is not null and t.name_norm like '%' || v_qname || '%')
            or (v_qphone is not null and length(v_qphone) >= 4
                and (t.phone_norm like '%' || v_qphone || '%' or t.contact_phone_norm like '%' || v_qphone || '%'))
            or t.website_domain like '%' || lower(v_q) || '%'
            or lower(coalesce(t.contact_name, '')) like '%' || lower(v_q) || '%')
       and (p_status is null or t.status = p_status)
       and (p_kind is null or t.kind = p_kind)
       and (nullif(btrim(coalesce(p_province, '')), '') is null
            or lower(coalesce(t.province, '')) = lower(btrim(p_province)))
       and (
         case
           when coalesce(p_unassigned_only, false) then t.assigned_to is null
           when p_assigned_to is not null then t.assigned_to = p_assigned_to
           else true
         end
       )
       and (not coalesce(p_overdue_only, false)
            or (t.status in ('new','contacted','nurturing','negotiating') and t.next_follow_up_at < v_today))
       and (not coalesce(p_dup_pending, false) or not t.dup_reviewed)
     order by t.created_at desc
     limit v_limit
  )
  select coalesce(jsonb_agg(private.prospect_to_json(tp) order by
           coalesce(tp.status in ('new','contacted','nurturing','negotiating')
                    and tp.next_follow_up_at < v_today, false) desc,
           tp.next_follow_up_at asc nulls last, tp.created_at desc), '[]'::jsonb)
    into v_res
    from filtered f
    join public.tour_prospects tp on tp.id = f.id;
  return v_res;
end $$;

-- 10. Cập nhật public.get_prospects_overview để đếm riêng in_trash
create or replace function public.get_prospects_overview()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_conv int; v_lost int;
begin
  perform private.assert_perm('prospect.view');
  select count(*) filter (where status = 'converted'), count(*) filter (where status = 'lost')
    into v_conv, v_lost from public.tour_prospects
   where deleted_at is null;

  return jsonb_build_object(
    'total', (select count(*) from public.tour_prospects where deleted_at is null),
    'in_trash', (select count(*) from public.tour_prospects where deleted_at is not null),
    'by_status', coalesce((select jsonb_object_agg(s.status, s.n)
                             from (select status, count(*) n from public.tour_prospects
                                    where deleted_at is null group by status) s), '{}'::jsonb),
    'overdue', (select count(*) from public.tour_prospects
                 where deleted_at is null and status in ('new','contacted','nurturing','negotiating') and next_follow_up_at < v_today),
    'dup_pending', (select count(*) from public.tour_prospects where deleted_at is null and not dup_reviewed),
    'conversion_rate', case when v_conv + v_lost = 0 then null
                            else round(v_conv::numeric * 100 / (v_conv + v_lost), 1) end,
    'top_sales', coalesce((
      select jsonb_agg(jsonb_build_object('user_id', x.converted_by, 'name', x.full_name, 'converted', x.n)
                       order by x.n desc)
        from (select t.converted_by, pr.full_name, count(*) n
                from public.tour_prospects t
                join public.profiles pr on pr.id = t.converted_by
               where t.deleted_at is null and t.status = 'converted'
               group by t.converted_by, pr.full_name
               order by count(*) desc limit 5) x), '[]'::jsonb),
    'assignees', coalesce((
      select jsonb_agg(jsonb_build_object('id', pr.id, 'name', pr.full_name) order by pr.full_name)
        from public.profiles pr
       where pr.is_active and exists (
         select 1 from public.user_effective_permissions u
          where u.user_id = pr.id and u.permission_key = 'prospect.manage')), '[]'::jsonb)
  );
end $$;

grant execute on function public.delete_prospect(uuid) to authenticated;
grant execute on function public.restore_prospect(uuid) to authenticated;
grant execute on function public.purge_prospect(uuid) to authenticated;

-- 11. Rebuild all permissions
select private.rebuild_all_permissions();
