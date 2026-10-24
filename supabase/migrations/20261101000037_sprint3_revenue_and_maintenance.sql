-- ====================================================================
-- Migration 37: Sprint 3 - Revenue Input, Preventive Maintenance & Inspections
-- Modules: revenue_input, preventive, inspections
-- ====================================================================

-- 1. Cột khóa sổ cho branch_monthly_figures
alter table public.branch_monthly_figures
  add column if not exists locked_at timestamptz,
  add column if not exists locked_by uuid references public.profiles(id),
  add column if not exists unlock_reason text;

-- 2. Cột template_id cho pm_plans nếu kiểm tra định kỳ liên kết mẫu checklist
alter table public.pm_plans
  add column if not exists template_id uuid references public.checklist_templates(id);

-- --------------------------------------------------------------------
-- PHẦN I: REVENUE INPUT (NHẬP DOANH THU THÁNG)
-- --------------------------------------------------------------------

-- RPC: upsert_monthly_figures(p_rows jsonb)
create or replace function public.upsert_monthly_figures(p_rows jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_branch_id uuid;
  v_month date;
  v_arrivals int;
  v_guests int;
  v_room_nights int;
  v_available_room_nights int;
  v_room_revenue numeric;
  v_other_revenue numeric;
  v_note text;
  v_locked_at timestamptz;
  v_applied int := 0;
begin
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
    raise exception 'Dữ liệu đầu vào phải là một danh sách hợp lệ' using errcode = 'P0422';
  end if;

  for v_item in select * from jsonb_array_elements(p_rows)
  loop
    v_branch_id := (v_item ->> 'branch_id')::uuid;
    v_month := (v_item ->> 'month')::date;

    if extract(day from v_month) <> 1 then
      raise exception 'Ngày bắt đầu tháng phải là ngày mùng 1 (YYYY-MM-01)' using errcode = 'P0422';
    end if;

    -- Kiểm tra quyền và trạng thái module
    perform private.assert_perm_at('revenue.input', v_branch_id);
    perform private.assert_module(v_branch_id, 'revenue_input');

    -- Kiểm tra xem tháng này đã bị khóa sổ chưa
    select locked_at into v_locked_at
    from public.branch_monthly_figures
    where branch_id = v_branch_id and month = v_month;

    if v_locked_at is not null then
      raise exception 'Tháng % của cơ sở đã bị khóa sổ, không thể chỉnh sửa', to_char(v_month, 'MM/YYYY')
        using errcode = 'P0409';
    end if;

    v_arrivals := nullif(v_item ->> 'arrivals', '')::int;
    v_guests := nullif(v_item ->> 'guests', '')::int;
    v_room_nights := nullif(v_item ->> 'room_nights', '')::int;
    v_available_room_nights := nullif(v_item ->> 'available_room_nights', '')::int;
    v_room_revenue := nullif(v_item ->> 'room_revenue', '')::numeric;
    v_other_revenue := nullif(v_item ->> 'other_revenue', '')::numeric;
    v_note := nullif(trim(v_item ->> 'note'), '');

    -- Kiểm tra ràng buộc hợp lệ
    if v_arrivals < 0 or v_guests < 0 or v_room_nights < 0 then
      raise exception 'Số lượt đến, số khách và đêm phòng không được âm' using errcode = 'P0422';
    end if;

    if v_available_room_nights is not null and v_available_room_nights <= 0 then
      raise exception 'Số đêm phòng khả dụng phải lớn hơn 0' using errcode = 'P0422';
    end if;

    if v_room_nights is not null and v_available_room_nights is not null and v_room_nights > v_available_room_nights then
      raise exception 'Số đêm phòng bán (%) không thể lớn hơn số đêm phòng khả dụng (%)', v_room_nights, v_available_room_nights
        using errcode = 'P0422';
    end if;

    if v_room_revenue < 0 or v_other_revenue < 0 then
      raise exception 'Doanh thu không được âm' using errcode = 'P0422';
    end if;

    insert into public.branch_monthly_figures (
      branch_id, month, arrivals, guests, room_nights, available_room_nights,
      room_revenue, other_revenue, note, entered_by, entered_at
    )
    values (
      v_branch_id, v_month, v_arrivals, v_guests, v_room_nights, v_available_room_nights,
      v_room_revenue, v_other_revenue, v_note, (select auth.uid()), now()
    )
    on conflict (branch_id, month) do update set
      arrivals = excluded.arrivals,
      guests = excluded.guests,
      room_nights = excluded.room_nights,
      available_room_nights = excluded.available_room_nights,
      room_revenue = excluded.room_revenue,
      other_revenue = excluded.other_revenue,
      note = excluded.note,
      entered_by = (select auth.uid()),
      entered_at = now();

    v_applied := v_applied + 1;
  end loop;

  return jsonb_build_object('success', true, 'applied', v_applied);
end;
$$;

-- RPC: lock_monthly_figures(p_branch_id uuid, p_month date)
create or replace function public.lock_monthly_figures(p_branch_id uuid, p_month date)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_exists boolean;
  v_already_locked boolean;
begin
  perform private.assert_perm_at('revenue.input', p_branch_id);
  perform private.assert_module(p_branch_id, 'revenue_input');

  select exists(
    select 1 from public.branch_monthly_figures
    where branch_id = p_branch_id and month = p_month
  ), exists(
    select 1 from public.branch_monthly_figures
    where branch_id = p_branch_id and month = p_month and locked_at is not null
  ) into v_exists, v_already_locked;

  if not v_exists then
    raise exception 'Chưa có số liệu doanh thu cho tháng này để khóa sổ' using errcode = 'P0404';
  end if;

  if v_already_locked then
    raise exception 'Tháng này đã được khóa sổ trước đó' using errcode = 'P0409';
  end if;

  update public.branch_monthly_figures
  set locked_at = now(),
      locked_by = (select auth.uid()),
      unlock_reason = null
  where branch_id = p_branch_id and month = p_month;

  return jsonb_build_object('success', true, 'locked_at', now());
end;
$$;

-- RPC: unlock_monthly_figures(p_branch_id uuid, p_month date, p_reason text)
create or replace function public.unlock_monthly_figures(p_branch_id uuid, p_month date, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trimmed_reason text := trim(coalesce(p_reason, ''));
  v_is_authorized boolean;
begin
  perform private.assert_perm_at('revenue.input', p_branch_id);

  -- Mở khóa sổ là hành động nhạy cảm: chỉ cho phép người có quyền cấp chuỗi hoặc quản trị viên
  v_is_authorized := private.has_perm('report.view_chain') or exists (
    select 1 from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid() and r.key in ('owner', 'admin')
  );

  if not v_is_authorized then
    raise exception 'Chỉ cấp Quản trị viên chuỗi hoặc Chủ chuỗi mới có quyền mở khóa sổ'
      using errcode = 'P0403';
  end if;

  if char_length(v_trimmed_reason) < 10 then
    raise exception 'Lý do mở khóa sổ phải từ 10 ký tự trở lên' using errcode = 'P0422';
  end if;

  update public.branch_monthly_figures
  set locked_at = null,
      locked_by = null,
      unlock_reason = v_trimmed_reason
  where branch_id = p_branch_id and month = p_month;

  return jsonb_build_object('success', true, 'unlocked_at', now());
end;
$$;

-- RPC: get_monthly_input_matrix(p_month date, p_branch_id uuid default null)
create or replace function public.get_monthly_input_matrix(p_month date, p_branch_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_month_start date := date_trunc('month', p_month)::date;
  v_month_end date := (date_trunc('month', p_month) + interval '1 month')::date;
  v_days_in_month int := extract(day from (v_month_end - interval '1 day'))::int;
  v_allowed_branches uuid[];
  v_result jsonb := '[]'::jsonb;
  br record;
  fig record;
  v_crm_arrivals int := 0;
  v_crm_guests int := 0;
  v_crm_nights int := 0;
  v_active_rooms int := 0;
  v_blocked_nights int := 0;
  v_suggested_available int := 0;
  v_can_input boolean;
  v_can_lock boolean;
  v_can_unlock boolean;
begin
  v_allowed_branches := array(
    select b_id from (
      select x as b_id from private.branches_with('revenue.input') x
      union
      select y as b_id from private.branches_with('revenue.view') y
      union
      select z as b_id from private.branches_with('report.view_chain') z
    ) sub
    where p_branch_id is null or b_id = p_branch_id
  );

  if coalesce(array_length(v_allowed_branches, 1), 0) = 0 then
    return '[]'::jsonb;
  end if;

  for br in
    select b.id, b.name, b.code
    from public.branches b
    where b.id = any(v_allowed_branches) and b.is_active
    order by b.code
  loop
    v_can_input := private.has_perm('revenue.input', br.id);
    v_can_lock := v_can_input;
    v_can_unlock := private.has_perm('report.view_chain') or exists (
      select 1 from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid() and r.key in ('owner', 'admin')
    );

    -- 1. Lấy dữ liệu đã nhập
    select
      f.arrivals, f.guests, f.room_nights, f.available_room_nights,
      f.room_revenue, f.other_revenue, f.note,
      p.full_name as entered_by_name, f.entered_at,
      f.locked_at, lp.full_name as locked_by_name, f.unlock_reason
    into fig
    from public.branch_monthly_figures f
    left join public.profiles p on p.id = f.entered_by
    left join public.profiles lp on lp.id = f.locked_by
    where f.branch_id = br.id and f.month = v_month_start;

    -- 2. Thống kê số liệu thực tế từ CRM (stays)
    select
      coalesce(count(*) filter (where s.check_in_at::date >= v_month_start and s.check_in_at::date < v_month_end), 0),
      coalesce(sum((
        select count(*) from public.stay_guests sg where sg.stay_id = s.id
      )) filter (where s.check_in_at::date >= v_month_start and s.check_in_at::date < v_month_end), 0),
      coalesce(sum(
        greatest(0,
          least(s.check_out_at::date, v_month_end) -
          greatest(s.check_in_at::date, v_month_start)
        )
      ), 0)
    into v_crm_arrivals, v_crm_guests, v_crm_nights
    from public.stays s
    where s.branch_id = br.id
      and s.status in ('in_house', 'completed')
      and s.check_in_at::date < v_month_end
      and s.check_out_at::date >= v_month_start;

    -- 3. Tính số đêm phòng khả dụng đề xuất
    select count(*) into v_active_rooms
    from public.rooms
    where branch_id = br.id and is_active;

    select coalesce(sum(
      greatest(0,
        least(coalesce(rb.ends_at, now())::date, v_month_end) -
        greatest(rb.started_at::date, v_month_start)
      )
    ), 0) into v_blocked_nights
    from public.room_blocks rb
    where rb.branch_id = br.id
      and rb.started_at::date < v_month_end
      and coalesce(rb.ends_at, now())::date >= v_month_start;

    v_suggested_available := greatest(0, (v_active_rooms * v_days_in_month) - v_blocked_nights);

    v_result := v_result || jsonb_build_object(
      'branch_id', br.id,
      'branch_name', br.name,
      'branch_code', br.code,
      'is_locked', (fig.locked_at is not null),
      'can_input', (v_can_input and fig.locked_at is null),
      'can_lock', (v_can_lock and fig.locked_at is null and fig.room_revenue is not null),
      'can_unlock', (v_can_unlock and fig.locked_at is not null),
      'figures', jsonb_build_object(
        'arrivals', fig.arrivals,
        'guests', fig.guests,
        'room_nights', fig.room_nights,
        'available_room_nights', fig.available_room_nights,
        'room_revenue', fig.room_revenue,
        'other_revenue', fig.other_revenue,
        'note', fig.note,
        'entered_by_name', fig.entered_by_name,
        'entered_at', fig.entered_at,
        'locked_at', fig.locked_at,
        'locked_by_name', fig.locked_by_name,
        'unlock_reason', fig.unlock_reason
      ),
      'crm_figures', jsonb_build_object(
        'arrivals', v_crm_arrivals,
        'guests', v_crm_guests,
        'room_nights', v_crm_nights
      ),
      'suggested_available_room_nights', v_suggested_available,
      'active_rooms', v_active_rooms,
      'days_in_month', v_days_in_month
    );
  end loop;

  return v_result;
end;
$$;

-- --------------------------------------------------------------------
-- PHẦN II: PREVENTIVE MAINTENANCE (BẢO TRÌ ĐỊNH KỲ)
-- --------------------------------------------------------------------

-- RPC: update_pm_plan(p_id uuid, p_patch jsonb)
create or replace function public.update_pm_plan(p_id uuid, p_patch jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.pm_plans;
  v_name text;
  v_interval int;
  v_lead int;
  v_due date;
  v_assignee uuid;
  v_vendor uuid;
  v_active boolean;
  v_checklist text[];
  v_template_id uuid;
begin
  select * into v_plan from public.pm_plans where id = p_id;
  if not found then
    raise exception 'Kế hoạch bảo trì không tồn tại' using errcode = 'P0404';
  end if;

  perform private.assert_perm_at('pm.manage', v_plan.branch_id);
  perform private.assert_module(v_plan.branch_id, 'preventive');

  v_name := coalesce(nullif(trim(p_patch ->> 'name'), ''), v_plan.name);
  v_interval := coalesce(nullif(p_patch ->> 'interval_days', '')::int, v_plan.interval_days);
  v_lead := coalesce(nullif(p_patch ->> 'lead_days', '')::int, v_plan.lead_days);
  v_due := coalesce(nullif(p_patch ->> 'next_due_date', '')::date, v_plan.next_due_date);
  v_active := coalesce((p_patch ->> 'is_active')::boolean, v_plan.is_active);

  if p_patch ? 'default_assignee_id' then
    v_assignee := nullif(p_patch ->> 'default_assignee_id', '')::uuid;
  else
    v_assignee := v_plan.default_assignee_id;
  end if;

  if p_patch ? 'vendor_id' then
    v_vendor := nullif(p_patch ->> 'vendor_id', '')::uuid;
  else
    v_vendor := v_plan.vendor_id;
  end if;

  if p_patch ? 'template_id' then
    v_template_id := nullif(p_patch ->> 'template_id', '')::uuid;
  else
    v_template_id := v_plan.template_id;
  end if;

  if p_patch ? 'checklist' then
    select coalesce(array_agg(elem::text), '{}'::text[])
    into v_checklist
    from jsonb_array_elements_text(p_patch -> 'checklist') elem
    where trim(elem) <> '';
  else
    v_checklist := v_plan.checklist;
  end if;

  update public.pm_plans
  set name = v_name,
      interval_days = v_interval,
      lead_days = v_lead,
      next_due_date = v_due,
      default_assignee_id = v_assignee,
      vendor_id = v_vendor,
      template_id = v_template_id,
      checklist = v_checklist,
      is_active = v_active,
      updated_at = now()
  where id = p_id;

  return jsonb_build_object('success', true, 'id', p_id);
end;
$$;

-- RPC: delete_pm_plan(p_id uuid)
create or replace function public.delete_pm_plan(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.pm_plans;
  v_wo_count int;
begin
  select * into v_plan from public.pm_plans where id = p_id;
  if not found then
    raise exception 'Kế hoạch bảo trì không tồn tại' using errcode = 'P0404';
  end if;

  perform private.assert_perm_at('pm.manage', v_plan.branch_id);
  perform private.assert_module(v_plan.branch_id, 'preventive');

  -- Nếu đã có work orders tham chiếu, chuyển sang tạm ngưng thay vì xóa cứng
  select count(*) into v_wo_count from public.work_orders where pm_plan_id = p_id;
  if v_wo_count > 0 then
    update public.pm_plans set is_active = false, updated_at = now() where id = p_id;
    return jsonb_build_object('success', true, 'action', 'deactivated');
  else
    delete from public.pm_plans where id = p_id;
    return jsonb_build_object('success', true, 'action', 'deleted');
  end if;
end;
$$;

-- RPC: trigger_pm_now(p_plan_id uuid)
-- Cho phép quản trị viên kích hoạt sinh phiếu ngay lập tức cho 1 kế hoạch
create or replace function public.trigger_pm_now(p_plan_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  pl public.pm_plans;
  v_wo uuid;
  v_number bigint;
  v_open_wo_count int;
begin
  select * into pl from public.pm_plans where id = p_plan_id;
  if not found then
    raise exception 'Kế hoạch bảo trì không tồn tại' using errcode = 'P0404';
  end if;

  perform private.assert_perm_at('pm.manage', pl.branch_id);
  perform private.assert_module(pl.branch_id, 'preventive');

  -- Kiểm tra xem đã có phiếu đang mở chưa
  select count(*) into v_open_wo_count
  from public.work_orders
  where pm_plan_id = pl.id and status not in ('closed', 'cancelled');

  if v_open_wo_count > 0 then
    raise exception 'Kế hoạch này hiện đã có phiếu sự cố đang mở chưa xử lý xong' using errcode = 'P0409';
  end if;

  insert into public.work_orders (
    branch_id, kind, title, priority, status, asset_id, location_id,
    assignee_id, vendor_id, due_at, checklist, pm_plan_id, room_id
  )
  values (
    pl.branch_id, 'preventive', left('Bảo trì định kỳ: ' || pl.name, 200), 'normal',
    case when pl.default_assignee_id is not null or pl.vendor_id is not null
         then 'assigned'::public.wo_status else 'new' end,
    pl.asset_id, pl.location_id, pl.default_assignee_id, pl.vendor_id,
    ((now() + (pl.interval_days || ' days')::interval) at time zone 'Asia/Ho_Chi_Minh'),
    coalesce((select jsonb_agg(jsonb_build_object('label', c, 'done', false)) from unnest(pl.checklist) c), '[]'),
    pl.id,
    (select a.room_id from public.assets a where a.id = pl.asset_id)
  )
  returning id, number into v_wo, v_number;

  insert into public.work_order_events (work_order_id, to_status, comment)
  values (v_wo, 'new', 'Tạo phiếu bảo trì thủ công theo yêu cầu quản lý');

  return jsonb_build_object(
    'success', true,
    'work_order_id', v_wo,
    'work_order_number', v_number
  );
end;
$$;

-- --------------------------------------------------------------------
-- PHẦN III: INSPECTIONS & CHECKLIST TEMPLATES (KIỂM TRA PHÒNG / KHU VỰC)
-- --------------------------------------------------------------------

-- RPC: upsert_checklist_template(p jsonb)
create or replace function public.upsert_checklist_template(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  v_name text := trim(coalesce(p ->> 'name', ''));
  v_scope text := coalesce(p ->> 'scope', 'room');
  v_items jsonb := p -> 'items';
  v_is_active boolean := coalesce((p ->> 'is_active')::boolean, true);
  v_insp_count int := 0;
  v_new_id uuid;
begin
  perform private.assert_perm('inspection.manage');

  if char_length(v_name) < 3 then
    raise exception 'Tên mẫu checklist phải từ 3 ký tự trở lên' using errcode = 'P0422';
  end if;

  if v_scope not in ('room', 'area', 'fire_safety', 'other') then
    raise exception 'Phạm vi kiểm tra không hợp lệ' using errcode = 'P0422';
  end if;

  if jsonb_typeof(v_items) <> 'array' or jsonb_array_length(v_items) = 0 then
    raise exception 'Mẫu checklist phải có ít nhất 1 mục kiểm tra' using errcode = 'P0422';
  end if;

  if v_id is not null then
    -- Kiểm tra xem mẫu đã có lịch sử kiểm tra hay chưa
    select count(*) into v_insp_count from public.inspections where template_id = v_id;

    if v_insp_count > 0 then
      -- Nếu đã có kết quả kiểm tra cũ -> phiên bản mới: ẩn mẫu cũ, tạo mẫu mới
      update public.checklist_templates set is_active = false, updated_at = now() where id = v_id;

      insert into public.checklist_templates (name, scope, items, is_active, created_by)
      values (v_name, v_scope, v_items, v_is_active, (select auth.uid()))
      returning id into v_new_id;

      return jsonb_build_object('success', true, 'id', v_new_id, 'versioned', true);
    else
      -- Chưa có kết quả nào -> sửa trực tiếp
      update public.checklist_templates
      set name = v_name,
          scope = v_scope,
          items = v_items,
          is_active = v_is_active,
          updated_at = now()
      where id = v_id;

      return jsonb_build_object('success', true, 'id', v_id, 'versioned', false);
    end if;
  else
    -- Thêm mới
    insert into public.checklist_templates (name, scope, items, is_active, created_by)
    values (v_name, v_scope, v_items, v_is_active, (select auth.uid()))
    returning id into v_new_id;

    return jsonb_build_object('success', true, 'id', v_new_id, 'created', true);
  end if;
end;
$$;

-- RPC: get_checklist_templates(p_scope text default null)
create or replace function public.get_checklist_templates(p_scope text default null)
returns table (
  id uuid,
  name text,
  scope text,
  items jsonb,
  is_active boolean,
  created_at timestamptz,
  usage_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.assert_perm('inspection.perform');

  return query
  select
    t.id,
    t.name,
    t.scope,
    t.items,
    t.is_active,
    t.created_at,
    (select count(*) from public.inspections i where i.template_id = t.id) as usage_count
  from public.checklist_templates t
  where (p_scope is null or t.scope = p_scope)
  order by t.is_active desc, t.scope asc, t.name asc;
end;
$$;

-- RPC: get_inspections_list(p_branch_id uuid default null, p_limit int default 50)
create or replace function public.get_inspections_list(p_branch_id uuid default null, p_limit int default 50)
returns table (
  id uuid,
  branch_id uuid,
  branch_name text,
  template_id uuid,
  template_name text,
  room_id uuid,
  room_number text,
  location_id uuid,
  location_name text,
  inspector_id uuid,
  inspector_name text,
  performed_at timestamptz,
  results jsonb,
  passed int,
  failed int,
  score numeric,
  note text,
  work_order_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_allowed_branches uuid[];
begin
  v_allowed_branches := array(
    select x from private.branches_with('facility.view') x
    where p_branch_id is null or x = p_branch_id
  );

  return query
  select
    i.id,
    i.branch_id,
    b.name as branch_name,
    i.template_id,
    t.name as template_name,
    i.room_id,
    r.number as room_number,
    i.location_id,
    fl.name as location_name,
    i.inspector_id,
    p.full_name as inspector_name,
    i.performed_at,
    i.results,
    i.passed,
    i.failed,
    i.score,
    i.note,
    (select count(*) from public.work_orders wo where wo.inspection_id = i.id) as work_order_count
  from public.inspections i
  join public.branches b on b.id = i.branch_id
  join public.checklist_templates t on t.id = i.template_id
  left join public.rooms r on r.id = i.room_id
  left join public.facility_locations fl on fl.id = i.location_id
  left join public.profiles p on p.id = i.inspector_id
  where i.branch_id = any(v_allowed_branches)
  order by i.performed_at desc
  limit coalesce(p_limit, 50);
end;
$$;

-- --------------------------------------------------------------------
-- CẤP QUYỀN THỰC THI (GRANTS)
-- --------------------------------------------------------------------
grant execute on function public.upsert_monthly_figures(jsonb) to authenticated;
grant execute on function public.lock_monthly_figures(uuid, date) to authenticated;
grant execute on function public.unlock_monthly_figures(uuid, date, text) to authenticated;
grant execute on function public.get_monthly_input_matrix(date, uuid) to authenticated;

grant execute on function public.update_pm_plan(uuid, jsonb) to authenticated;
grant execute on function public.delete_pm_plan(uuid) to authenticated;
grant execute on function public.trigger_pm_now(uuid) to authenticated;

grant execute on function public.upsert_checklist_template(jsonb) to authenticated;
grant execute on function public.get_checklist_templates(text) to authenticated;
grant execute on function public.get_inspections_list(uuid, int) to authenticated;

-- --------------------------------------------------------------------
-- BẬT IS_AVAILABLE CHO CÁC MODULE HOÀN THÀNH
-- --------------------------------------------------------------------
update public.modules
set is_available = true
where key in ('revenue_input', 'preventive', 'inspections');

