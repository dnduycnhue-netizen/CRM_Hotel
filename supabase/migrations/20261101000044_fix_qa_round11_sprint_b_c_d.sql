-- Migration 44: Sprint B, C, D Fixes for QA Round 11
-- 1. Cập nhật RPC get_upcoming_birthdays: Hỗ trợ linh hoạt branch_id và mask SĐT cho Sales
-- 2. Cấp quyền pm.manage và facility.manage cho vai trò technician
-- 3. Seed dữ liệu mẫu cho assets và compliance_docs, liên kết work_orders với asset_id

-- 1. Sửa RPC get_upcoming_birthdays
create or replace function public.get_upcoming_birthdays(
  p_days_ahead int default 30,
  p_branch_id uuid default null
)
returns table (
  guest_id uuid,
  full_name text,
  dob date,
  phone text,
  email text,
  gender text,
  days_until int,
  birthday_this_year date,
  age int,
  marketing_consent boolean,
  tier_code text,
  tier_name text,
  total_stays bigint,
  last_stay_date date,
  last_branch_name text,
  greeting_status text,
  greeting_channel text,
  greeting_gift text,
  greeting_voucher_code text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_year int := extract(year from current_date)::int;
  v_today date := current_date;
  v_has_view_full boolean;
  v_uid uuid := auth.uid();
  v_effective_branch_id uuid := p_branch_id;
begin
  -- Nếu không truyền branch_id, kiểm tra xem có quyền chain không.
  -- Nếu không có quyền chain, tự động fallback về branch đầu tiên mà user có quyền birthday.view
  if v_effective_branch_id is null and not private.has_perm('birthday.view') then
    select b.id into v_effective_branch_id
    from public.branches b
    where private.has_perm('birthday.view', b.id)
    limit 1;
  end if;

  if v_effective_branch_id is not null then
    perform private.assert_perm('birthday.view', v_effective_branch_id);
  else
    perform private.assert_perm('birthday.view');
  end if;

  v_has_view_full := private.has_perm('guest.view_full');

  return query
  with base_guests as (
    select
      g.id as b_guest_id,
      g.full_name as b_full_name,
      g.dob as b_dob,
      case
        when v_has_view_full or (g.sales_owner_id = v_uid and private.has_perm('guest.view_full_own')) then g.phone
        when length(g.phone) >= 7 then overlay(g.phone placing '****' from 4 for 4)
        else g.phone
      end as b_phone,
      case
        when v_has_view_full or (g.sales_owner_id = v_uid and private.has_perm('guest.view_full_own')) then g.email
        else null
      end as b_email,
      g.gender as b_gender,
      -- Tính ngày sinh nhật trong năm hiện tại
      case 
        when make_date(v_current_year, extract(month from g.dob)::int, extract(day from g.dob)::int) >= v_today then
          make_date(v_current_year, extract(month from g.dob)::int, extract(day from g.dob)::int)
        else
          make_date(v_current_year + 1, extract(month from g.dob)::int, extract(day from g.dob)::int)
      end as b_bday_date
    from public.guests g
    where g.dob is not null
      and g.merged_into is null
  ),
  filtered as (
    select
      bg.*,
      (bg.b_bday_date - v_today)::int as b_days_until,
      (extract(year from bg.b_bday_date) - extract(year from bg.b_dob))::int as b_age
    from base_guests bg
    where (bg.b_bday_date - v_today) between 0 and coalesce(p_days_ahead, 30)
  ),
  guest_stats as (
    select
      sg.guest_id as s_guest_id,
      count(distinct s.id) as s_total_stays,
      max(s.business_date) as s_last_stay_date,
      (array_agg(br.name order by s.check_in_at desc))[1] as s_last_branch_name
    from public.stay_guests sg
    join public.stays s on s.id = sg.stay_id
    join public.branches br on br.id = s.branch_id
    where s.status in ('in_house', 'checked_out')
      and (v_effective_branch_id is null or s.branch_id = v_effective_branch_id)
    group by sg.guest_id
  )
  select
    f.b_guest_id as guest_id,
    f.b_full_name as full_name,
    f.b_dob as dob,
    f.b_phone as phone,
    f.b_email as email,
    f.b_gender::text as gender,
    f.b_days_until as days_until,
    f.b_bday_date as birthday_this_year,
    f.b_age as age,
    coalesce(gc.granted, false) as marketing_consent,
    coalesce(l.gt->>'tier', 'member')::text as tier_code,
    coalesce(l.gt->>'name', 'Thành viên')::text as tier_name,
    coalesce(gs.s_total_stays, 0) as total_stays,
    gs.s_last_stay_date as last_stay_date,
    gs.s_last_branch_name as last_branch_name,
    bg.status as greeting_status,
    bg.channel as greeting_channel,
    bg.gift_description as greeting_gift,
    v.code as greeting_voucher_code
  from filtered f
  left join guest_stats gs on gs.s_guest_id = f.b_guest_id
  cross join lateral (select private.guest_tier(f.b_guest_id) as gt) l
  left join public.guest_consents gc on gc.guest_id = f.b_guest_id and gc.channel = 'marketing'
  left join public.birthday_greetings bg on bg.guest_id = f.b_guest_id and bg.year = extract(year from f.b_bday_date)::int
  left join public.vouchers v on v.id = bg.voucher_id
  where (v_effective_branch_id is null or gs.s_last_branch_name is not null or f.b_days_until <= 7)
  order by f.b_days_until asc, coalesce(gs.s_total_stays, 0) desc;
end;
$$;

grant execute on function public.get_upcoming_birthdays(int, uuid) to authenticated;

-- 2. Cấp quyền pm.manage và facility.manage cho vai trò technician
insert into public.role_permissions (role_id, permission_key)
select r.id, p.key
from public.roles r
cross join (values ('pm.manage'), ('facility.manage')) as p(key)
where r.key = 'technician'
on conflict do nothing;

-- 3. Seed dữ liệu mẫu cho Assets (Tài sản CSVC)
do $$
declare
  v_b_boutique uuid;
  v_b_aloha uuid;
  v_b_sun uuid;
  v_cat_hvac uuid;
  v_cat_el uuid;
  v_cat_plumb uuid;
  v_cat_elec uuid;
  v_a1 uuid;
  v_a2 uuid;
  v_a3 uuid;
  v_a4 uuid;
begin
  select id into v_b_boutique from public.branches where code = 'BOUTIQUE' limit 1;
  select id into v_b_aloha from public.branches where code = 'ALOHA' limit 1;
  select id into v_b_sun from public.branches where code = 'SUN' limit 1;

  select id into v_cat_hvac from public.asset_categories where code = 'HVAC' or name like '%Lạnh%' or name like '%Điều hòa%' limit 1;
  if v_cat_hvac is null then select id into v_cat_hvac from public.asset_categories limit 1; end if;

  select id into v_cat_el from public.asset_categories where code = 'ELEV' or name like '%Thang máy%' limit 1;
  if v_cat_el is null then v_cat_el := v_cat_hvac; end if;

  select id into v_cat_plumb from public.asset_categories where code = 'PLUMB' or name like '%Nước%' limit 1;
  if v_cat_plumb is null then v_cat_plumb := v_cat_hvac; end if;

  select id into v_cat_elec from public.asset_categories where code = 'ELEC' or name like '%Điện%' limit 1;
  if v_cat_elec is null then v_cat_elec := v_cat_hvac; end if;

  -- Chèn tài sản mẫu nếu chưa có
  if not exists (select 1 from public.assets limit 1) then
    insert into public.assets (id, branch_id, category_id, code, name, model, serial_no, status, purchase_date, purchase_cost, expected_life_months)
    values
      (gen_random_uuid(), v_b_boutique, v_cat_hvac, 'AC-BTQ-601', 'Điều hòa Daikin Inverter 12000BTU P.601', 'FTKC35UAVMV', 'DK-2024-8831', 'in_use', current_date - 300, 12500000, 60)
      returning id into v_a1;

    insert into public.assets (id, branch_id, category_id, code, name, model, serial_no, status, purchase_date, purchase_cost, expected_life_months)
    values
      (gen_random_uuid(), v_b_boutique, v_cat_hvac, 'AC-BTQ-602', 'Điều hòa Daikin Inverter 12000BTU P.602', 'FTKC35UAVMV', 'DK-2024-8832', 'in_use', current_date - 300, 12500000, 60)
      returning id into v_a2;

    insert into public.assets (id, branch_id, category_id, code, name, model, serial_no, status, purchase_date, purchase_cost, expected_life_months)
    values
      (gen_random_uuid(), v_b_boutique, v_cat_el, 'ELEV-BTQ-01', 'Thang máy khách Schindler 750kg', 'Schindler 3300', 'SC-BTQ-019', 'in_use', current_date - 800, 450000000, 120)
      returning id into v_a3;

    insert into public.assets (id, branch_id, category_id, code, name, model, serial_no, status, purchase_date, purchase_cost, expected_life_months)
    values
      (gen_random_uuid(), v_b_boutique, v_cat_plumb, 'PUMP-BTQ-01', 'Máy bơm tăng áp Wilo 1.5kW', 'Wilo PB-201EA', 'WL-9921', 'in_use', current_date - 400, 8500000, 48)
      returning id into v_a4;

    -- Thêm cho Aloha và Sun
    if v_b_aloha is not null then
      insert into public.assets (branch_id, category_id, code, name, model, serial_no, status, purchase_date, purchase_cost, expected_life_months)
      values
        (v_b_aloha, v_cat_hvac, 'AC-ALH-101', 'Điều hòa Panasonic 9000BTU P.101', 'CS-PU9XKH-8M', 'PA-2024-1101', 'in_use', current_date - 200, 9500000, 60),
        (v_b_aloha, v_cat_el, 'ELEV-ALH-01', 'Thang máy Mitsubishi 630kg', 'NEXIEZ-MRL', 'MB-ALH-552', 'in_use', current_date - 500, 380000000, 120);
    end if;

    if v_b_sun is not null then
      insert into public.assets (branch_id, category_id, code, name, model, serial_no, status, purchase_date, purchase_cost, expected_life_months)
      values
        (v_b_sun, v_cat_hvac, 'AC-SUN-201', 'Điều hòa Casper 12000BTU P.201', 'TC-12IS35', 'CP-SUN-0021', 'in_use', current_date - 150, 7800000, 48),
        (v_b_sun, v_cat_elec, 'GEN-SUN-01', 'Máy phát điện dự phòng Cummins 50kVA', 'C50D5', 'CU-2023-77', 'in_use', current_date - 600, 220000000, 180);
    end if;

    -- Gắn asset_id và chi phí cho một số work_orders của Boutique để bảng by_category có số liệu
    update public.work_orders
       set asset_id = v_a1, labor_cost = 100000, parts_cost = 100000, completed_at = current_date - 3
     where branch_id = v_b_boutique and id = (select id from public.work_orders where branch_id = v_b_boutique order by created_at desc limit 1);

    update public.work_orders
       set asset_id = v_a3, labor_cost = 350000, parts_cost = 500000, completed_at = current_date - 18
     where branch_id = v_b_boutique and id = (select id from public.work_orders where branch_id = v_b_boutique and id <> (select id from public.work_orders where branch_id = v_b_boutique order by created_at desc limit 1) limit 1);
  end if;
end $$;

-- 4. Seed dữ liệu mẫu cho compliance_docs (Hồ sơ pháp lý & PCCC)
do $$
declare
  v_b_boutique uuid;
  v_b_aloha uuid;
  v_t_pccc uuid;
  v_t_kdks uuid;
  v_t_atvstp uuid;
  v_t_antt uuid;
begin
  select id into v_b_boutique from public.branches where code = 'BOUTIQUE' limit 1;
  select id into v_b_aloha from public.branches where code = 'ALOHA' limit 1;

  select id into v_t_pccc from public.compliance_doc_types where code = 'FIRE_SAFETY' or name like '%PCCC%' limit 1;
  select id into v_t_kdks from public.compliance_doc_types where code = 'HOTEL_BIZ' or name like '%kinh doanh%' limit 1;
  select id into v_t_atvstp from public.compliance_doc_types where code = 'FOOD_SAFETY' or name like '%thực phẩm%' limit 1;
  select id into v_t_antt from public.compliance_doc_types where code = 'SECURITY' or name like '%an ninh%' limit 1;

  if not exists (select 1 from public.compliance_docs limit 1) then
    if v_t_pccc is not null and v_b_boutique is not null then
      insert into public.compliance_docs (branch_id, doc_type_id, number, issued_on, expires_on, issuer, is_current, note)
      values
        (v_b_boutique, v_t_pccc, 'CN-PCCC-2025/08', current_date - 300, current_date + 365, 'Phòng Cảnh sát PCCC & CNCH', true, 'Đã nghiệm thu phương án chữa cháy định kỳ');
    end if;

    if v_t_kdks is not null and v_b_boutique is not null then
      insert into public.compliance_docs (branch_id, doc_type_id, number, issued_on, expires_on, issuer, is_current, note)
      values
        (v_b_boutique, v_t_kdks, 'GDK-KDKS-7721', current_date - 600, current_date + 730, 'Sở Du Lịch Tỉnh Thừa Thiên Huế', true, 'Đủ điều kiện kinh doanh dịch vụ lưu trú du lịch');
    end if;

    if v_t_antt is not null and v_b_boutique is not null then
      insert into public.compliance_docs (branch_id, doc_type_id, number, issued_on, expires_on, issuer, is_current, note)
      values
        (v_b_boutique, v_t_antt, 'GCN-ANTT-1092', current_date - 400, current_date + 300, 'Công an Thành phố', true, 'Đủ điều kiện về an ninh, trật tự để kinh doanh');
    end if;

    if v_t_atvstp is not null and v_b_boutique is not null then
      insert into public.compliance_docs (branch_id, doc_type_id, number, issued_on, expires_on, issuer, is_current, note)
      values
        (v_b_boutique, v_t_atvstp, 'ATTP-2026/041', current_date - 180, current_date + 185, 'Chi cục An toàn vệ sinh thực phẩm', true, 'Bếp ăn và nhà hàng đạt chuẩn vệ sinh an toàn thực phẩm');
    end if;

    -- Thêm tài liệu cho Aloha
    if v_b_aloha is not null and v_t_pccc is not null then
      insert into public.compliance_docs (branch_id, doc_type_id, number, issued_on, expires_on, issuer, is_current, note)
      values
        (v_b_aloha, v_t_pccc, 'CN-PCCC-ALH-2025/12', current_date - 250, current_date + 115, 'Phòng Cảnh sát PCCC TP Đà Nẵng', true, 'Hệ thống báo cháy tự động hoạt động tốt');
    end if;
  end if;
end $$;
