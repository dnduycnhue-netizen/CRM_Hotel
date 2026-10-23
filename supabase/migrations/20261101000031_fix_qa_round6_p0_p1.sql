-- 20261101000031_fix_qa_round6_p0_p1.sql
-- Fix toàn diện các vấn đề phát hiện sau QA Vòng 6:
-- P0-1: Bật module revenue_input để xem báo cáo doanh thu 12 tháng (/reports/monthly)
-- P0-2 & P1-4: Sửa get_guests_list: sửa type mismatch (integer), thêm p_branch_id, che email/dob theo phân quyền
-- P0-3: Siết RLS audit_logs chặn xem user_roles đối với vai trò quản lý cơ sở
-- P0-4: Sửa search_guests: thêm p_branch_ids, check guest.view_full theo branch_id của khách
-- P1-1: Thêm cột source_channel_id vào bảng public.guests
-- P1-2: Dọn dead code và siết quyền transition_work_order dùng v_t.assignee_may

-- 1. Bật module revenue_input (P0-1)
update public.modules
set default_state = 'on'
where key = 'revenue_input';

insert into public.branch_modules (branch_id, module_key, state)
select b.id, 'revenue_input', 'on'
from public.branches b
on conflict (branch_id, module_key)
do update set state = 'on';

-- 2. Thêm cột source_channel_id vào public.guests (P1-1)
alter table public.guests
add column if not exists source_channel_id uuid references public.source_channels(id);

create index if not exists idx_guests_source_channel on public.guests(source_channel_id);

-- 3. Siết RLS trên public.audit_logs (P0-3)
drop policy if exists read_audit on public.audit_logs;
create policy read_audit on public.audit_logs
  for select to authenticated
  using (
    private.has_perm('audit.view_all')
    or (
      branch_id in (select private.branches_with('audit.view_branch'))
      and entity not in ('user_roles', 'role_permissions', 'permissions', 'roles')
    )
  );

-- 4. Cập nhật transition_work_order: dọn dead code & siết quyền qua v_t.assignee_may (P1-2)
create or replace function public.transition_work_order(
  p_id uuid,
  p_to wo_status,
  p_comment text default null::text,
  p_patch jsonb default '{}'::jsonb,
  p_expected_status wo_status default null::wo_status
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_me  uuid := (select auth.uid());
  v_wo  public.work_orders;
  v_t   public.wo_transitions;
  v_assignee uuid;
  v_vendor   uuid;
  v_plan     public.pm_plans;
  v_next     date;
begin
  select * into v_wo from public.work_orders where id = p_id for update;
  if not found then raise exception 'work order not found' using errcode = 'P0404'; end if;
  if p_expected_status is not null and p_expected_status <> v_wo.status then
    raise exception 'status changed by someone else' using errcode = 'P0409';
  end if;

  select * into v_t from public.wo_transitions where from_status = v_wo.status and to_status = p_to;
  if not found then raise exception 'invalid transition % -> %', v_wo.status, p_to using errcode = 'P0422'; end if;

  -- Kiểm tra quyền:
  -- 1. Có quyền quản lý phiếu (v_t.permission_key, e.g. wo.assign, wo.close) tại cơ sở
  -- HOẶC
  -- 2. Transition cho phép người thực hiện (v_t.assignee_may) VÀ có quyền wo.work VÀ (là assignee HOẶC phiếu chưa gán ai)
  if not (
    private.has_perm(v_t.permission_key, v_wo.branch_id)
    or (
      v_t.assignee_may
      and private.has_perm('wo.work', v_wo.branch_id)
      and (v_wo.assignee_id = v_me or v_wo.assignee_id is null)
    )
  ) then
    raise exception 'forbidden: %', v_t.permission_key using errcode = 'P0403';
  end if;

  if v_t.requires_comment and char_length(btrim(coalesce(p_comment, ''))) < 3 then
    raise exception 'comment required' using errcode = 'P0422';
  end if;

  if p_to = 'assigned' then
    v_assignee := coalesce(nullif(p_patch ->> 'assignee_id', '')::uuid, v_wo.assignee_id);
    v_vendor   := coalesce(nullif(p_patch ->> 'vendor_id', '')::uuid, v_wo.vendor_id);
    if v_assignee is null and v_vendor is null then
      raise exception 'assignee or vendor required' using errcode = 'P0422';
    end if;
    if v_assignee is not null and not exists (
      select 1 from public.user_effective_permissions
      where user_id = v_assignee and branch_id = v_wo.branch_id and permission_key = 'wo.work') then
      raise exception 'assignee cannot work on this branch' using errcode = 'P0422';
    end if;
    update public.work_orders set assignee_id = v_assignee, vendor_id = v_vendor where id = p_id;

  elsif p_to = 'in_progress' then
    update public.work_orders
       set started_at = coalesce(started_at, now()),
           completed_at = null,
           assignee_id = coalesce(assignee_id, v_me)
     where id = p_id;
    if v_wo.asset_id is not null then
      update public.assets set status = 'under_repair' where id = v_wo.asset_id and status in ('in_use', 'broken');
    end if;

  elsif p_to = 'done' then
    if char_length(btrim(coalesce(p_patch ->> 'resolution', v_wo.resolution, ''))) < 3 then
      raise exception 'resolution required' using errcode = 'P0422';
    end if;
    update public.work_orders set
      resolution   = coalesce(nullif(p_patch ->> 'resolution', ''), resolution),
      labor_cost   = coalesce((p_patch ->> 'labor_cost')::numeric, labor_cost),
      parts_cost   = coalesce((p_patch ->> 'parts_cost')::numeric, parts_cost),
      vendor_cost  = coalesce((p_patch ->> 'vendor_cost')::numeric, vendor_cost),
      checklist    = coalesce(p_patch -> 'checklist', checklist),
      completed_at = now()
    where id = p_id;

  elsif p_to in ('closed', 'cancelled') then
    update public.work_orders
       set closed_at = now(), closed_by = v_me
     where id = p_id;
    update public.room_blocks set released_at = now(), released_by = v_me
     where work_order_id = p_id and released_at is null;

    if p_to = 'closed' and v_wo.pm_plan_id is not null then
      select * into v_plan from public.pm_plans where id = v_wo.pm_plan_id for update;
      v_next := v_plan.next_due_date + v_plan.interval_days;
      while v_next <= (v_wo.completed_at at time zone 'Asia/Ho_Chi_Minh')::date loop
        v_next := v_next + v_plan.interval_days;
      end loop;
      update public.pm_plans
         set last_done_date = (v_wo.completed_at at time zone 'Asia/Ho_Chi_Minh')::date, next_due_date = v_next
       where id = v_plan.id;
    end if;
  end if;

  update public.work_orders set status = p_to where id = p_id;

  insert into public.work_order_events (work_order_id, actor_id, from_status, to_status, comment)
  values (p_id, v_me, v_wo.status, p_to, p_comment);

  perform private.log_event('wo.transition', 'work_orders', p_id, v_wo.branch_id,
                            jsonb_build_object('from', v_wo.status, 'to', p_to));
end $function$;

-- 5. Sửa get_guests_list (P0-2, P1-4)
drop function if exists public.get_guests_list(integer, uuid, text);
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
  source_channel_id uuid
)
language plpgsql
security definer
set search_path to ''
as $function$
begin
  perform private.assert_perm('guest.search');

  return query
  select
    g.id,
    g.full_name,
    g.gender::text,
    case
      when private.has_perm('guest.view_full', s.last_branch_id)
           or private.has_perm('report.view_chain')
           or (g.sales_owner_id = (select auth.uid()) and private.has_perm('guest.view_full_own')) then g.dob
      else null::date
    end as dob,
    case
      when private.has_perm('guest.view_full', s.last_branch_id)
           or private.has_perm('report.view_chain')
           or (g.sales_owner_id = (select auth.uid()) and private.has_perm('guest.view_full_own')) then g.phone
      when length(g.phone) >= 7 then overlay(g.phone placing '****' from 4 for 4)
      else g.phone
    end as phone,
    case
      when private.has_perm('guest.view_full', s.last_branch_id)
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
    case
      when private.has_perm('guest.view_full', s.last_branch_id)
           or private.has_perm('report.view_chain')
           or (g.sales_owner_id = (select auth.uid()) and private.has_perm('guest.view_full_own')) then d.doc_number
      else private.mask_doc(d.doc_number)
    end as doc_number,
    d.doc_type::text,
    g.source_channel_id
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
    and (
      p_branch_id is null
      or s.last_branch_id = p_branch_id
      or exists (
        select 1 from public.stay_guests sg
        join public.stays st on st.id = sg.stay_id
        where sg.guest_id = g.id and st.branch_id = p_branch_id
      )
    )
  order by g.created_at desc
  limit least(coalesce(p_limit, 50), 200);
end;
$function$;

-- 6. Sửa search_guests: lọc theo p_branch_ids và bảo vệ SĐT theo chi nhánh (P0-4)
drop function if exists public.search_guests(text, text, integer);
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
           when private.has_perm('guest.view_full', s.last_branch_id)
                or private.has_perm('report.view_chain')
                or (g.sales_owner_id = (select auth.uid()) and private.has_perm('guest.view_full_own')) then g.phone
           when length(g.phone) >= 7 then overlay(g.phone placing '****' from 4 for 4)
           else g.phone
         end as phone,
         (select private.mask_doc(d.doc_number) from public.guest_documents d
          where d.guest_id = g.id order by (d.doc_type = 'cccd') desc, d.created_at desc limit 1),
         case
           when private.has_perm('guest.view_full', s.last_branch_id)
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
  where (
    p_branch_ids is null
    or s.last_branch_id = any(p_branch_ids)
    or exists (
      select 1 from public.stay_guests sg
      join public.stays st on st.id = sg.stay_id
      where sg.guest_id = g.id and st.branch_id = any(p_branch_ids)
    )
    or g.sales_owner_id = (select auth.uid())
  )
  order by t.ord;
end;
$function$;

-- 7. Cập nhật create_guest lưu source_channel_id và tags (P1-1 & P2-7)
create or replace function public.create_guest(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_id       uuid;
  v_phone    text := nullif(p ->> 'phone', '');
  v_doc_type text := nullif(p -> 'document' ->> 'type', '');
  v_doc_no   text := upper(nullif(btrim(p -> 'document' ->> 'number'), ''));
  v_tags     text[];
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
    v_tags := array(select jsonb_array_elements_text(p -> 'tags'));
  end if;

  update public.guests
     set sales_owner_id = (select auth.uid()),
         source_channel_id = nullif(p ->> 'source_channel_id', '')::uuid,
         tags = coalesce(v_tags, tags, '{}'::text[])
   where id = v_id;

  perform private.refresh_guest_stats(array[v_id]);
  return jsonb_build_object('guest_id', v_id, 'existing', false);
end;
$function$;
