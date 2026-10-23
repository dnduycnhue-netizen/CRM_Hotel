-- Migration 20261101000029_fix_qa_round5_permissions_and_rpc.sql
-- Khắc phục các vấn đề phân quyền, RPC và hiệu lực quyền trong QA Vòng 5

-- 1. Sửa RPC add_guest_note: cho phép p_branch_id null và gán default null
create or replace function public.add_guest_note(
  p_guest_id uuid,
  p_branch_id uuid default null,
  p_kind public.note_kind default 'general'::public.note_kind,
  p_body text default ''
)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_note_id uuid;
  v_author_name text;
begin
  perform private.assert_perm('guest.note_create');
  
  if char_length(btrim(coalesce(p_body, ''))) < 1 then
    raise exception 'note body required' using errcode = 'P0422';
  end if;

  insert into public.guest_notes (guest_id, branch_id, kind, body, created_by)
  values (p_guest_id, p_branch_id, coalesce(p_kind, 'general'::public.note_kind), btrim(p_body), (select auth.uid()))
  returning id into v_note_id;

  select full_name into v_author_name from public.profiles where id = (select auth.uid());

  perform private.log_event('guest.note_create', 'guest_notes', v_note_id, p_branch_id, 
                            jsonb_build_object('guest_id', p_guest_id, 'kind', p_kind));

  return jsonb_build_object(
    'id', v_note_id,
    'guest_id', p_guest_id,
    'branch_id', p_branch_id,
    'kind', p_kind,
    'body', btrim(p_body),
    'author', coalesce(v_author_name, 'Hệ thống'),
    'created_at', now()
  );
end $$;

-- 2. Cập nhật wo_transitions: cho phép kỹ thuật có wo.work tự nhận phiếu (new -> in_progress)
update public.wo_transitions
set assignee_may = true
where from_status = 'new' and to_status = 'in_progress';

-- 3. Cập nhật transition_work_order: cho phép người có wo.work chuyển phiếu sang in_progress
create or replace function public.transition_work_order(
  p_id uuid, p_to public.wo_status, p_comment text default null,
  p_patch jsonb default '{}', p_expected_status public.wo_status default null)
returns void language plpgsql security definer set search_path = '' as $$
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

  -- Kiểm tra quyền: có quyền permission_key của transition, hoặc là người được giao việc / tự nhận việc có quyền wo.work
  if not (
    private.has_perm(v_t.permission_key, v_wo.branch_id)
    or (
      private.has_perm('wo.work', v_wo.branch_id)
      and (v_wo.assignee_id = v_me or v_wo.assignee_id is null or p_to = 'in_progress')
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
end $$;

-- 4. Chuẩn hóa quyền vai trò Technician: Cấp wo.assign
insert into public.role_permissions (role_id, permission_key)
select r.id, k
from public.roles r, unnest(array['wo.assign', 'wo.create', 'wo.work', 'room.block', 'facility.view', 'wo.view']) k
where r.key = 'technician'
on conflict do nothing;

-- 5. Rà soát loại bỏ triệt để quyền cấp chuỗi và phê duyệt cấp chuỗi khỏi Branch Manager
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
    'loyalty.configure',
    'merge.approve',
    'blacklist.approve'
  );

-- 6. Đảm bảo vai trò Owner có đầy đủ tất cả permissions
insert into public.role_permissions (role_id, permission_key)
select r.id, p.key
from public.roles r cross join public.permissions p
where r.key = 'owner'
on conflict do nothing;

-- 7. REBUILD LẠI TOÀN BỘ USER EFFECTIVE PERMISSIONS CHO TẤT CẢ TÀI KHOẢN
select private.rebuild_all_permissions();
