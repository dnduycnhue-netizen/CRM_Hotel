-- 20261101000040_fix_guest_tier_overload_and_profile.sql
-- Khắc phục lỗi xem hồ sơ 360° khách hàng:
-- 1. Xóa các hàm signature cũ bị overload gây xung đột 'function private.guest_tier(uuid) is not unique'
-- 2. Viết lại private.guest_tier loại bỏ biến record chưa gán (record "v_manual" is not assigned yet)

-- 1. Xóa các hàm overload cũ
drop function if exists private.guest_tier(uuid, uuid);
drop function if exists private.guest_loyalty_value(uuid, uuid);
drop function if exists public.set_guest_tier_override(uuid, uuid, text, date);
drop function if exists public.export_guests(jsonb);

-- 2. Cập nhật private.guest_tier ổn định, an toàn tuyệt đối
create or replace function private.guest_tier(
  p_guest_id uuid,
  p_exclude uuid default null::uuid,
  p_date date default null::date
)
returns jsonb
language plpgsql
stable security definer
set search_path = ''
as $$
declare
  v_date date := coalesce(p_date, (now() at time zone 'Asia/Ho_Chi_Minh')::date);
  v_policy public.loyalty_policies;
  v_val int;
  
  v_earned_id uuid;
  v_earned_code text;
  v_earned_name text;
  v_earned_min int;
  v_earned_discount int;
  v_earned_benefits jsonb;
  v_earned_color text;
  
  v_manual_id uuid;
  v_manual_code text;
  v_manual_name text;
  v_manual_min int;
  v_manual_discount int;
  v_manual_benefits jsonb;
  v_manual_color text;

  v_best_id uuid;
  v_best_code text;
  v_best_name text;
  v_best_discount int;
  v_best_benefits jsonb;
  v_best_color text;
  v_best_source text;

  v_nxt_name text;
  v_nxt_min int;
  v_nxt_discount int;

  v_override_code text;
  v_override_until date;
begin
  v_policy := private.active_loyalty_policy(v_date);
  if v_policy.id is null then
    return jsonb_build_object(
      'tier_id', null, 'tier', 'none', 'name', 'Chưa có', 'discount_pct', 0,
      'benefits', null, 'color', '#9CA3AF', 'source', 'none', 'value', 0,
      'basis', 'stays', 'next', null
    );
  end if;

  v_val := private.guest_loyalty_value(p_guest_id, p_exclude, v_date);

  -- Hạng tích luỹ theo ngưỡng
  select id, code, name, min_value, discount_pct, benefits, color
    into v_earned_id, v_earned_code, v_earned_name, v_earned_min, v_earned_discount, v_earned_benefits, v_earned_color
  from public.loyalty_tiers
  where policy_id = v_policy.id
    and is_active
    and min_value <= v_val
  order by min_value desc
  limit 1;

  -- Hạng gán tay (kiểm tra theo code để ổn định qua các mùa chính sách)
  select coalesce(g.tier_override_code, (select code from public.loyalty_tiers where id = g.tier_override_id)),
         g.tier_override_until
    into v_override_code, v_override_until
  from public.guests g
  where g.id = p_guest_id;

  if v_override_code is not null and (v_override_until is null or v_override_until >= v_date) then
    select id, code, name, min_value, discount_pct, benefits, color
      into v_manual_id, v_manual_code, v_manual_name, v_manual_min, v_manual_discount, v_manual_benefits, v_manual_color
    from public.loyalty_tiers
    where policy_id = v_policy.id
      and is_active
      and code = v_override_code
    limit 1;
  end if;

  -- Chọn hạng cao nhất giữa tích lũy và gán tay
  if v_manual_id is not null and (v_earned_id is null or v_manual_min >= coalesce(v_earned_min, 0)) then
    v_best_id := v_manual_id;
    v_best_code := v_manual_code;
    v_best_name := v_manual_name;
    v_best_discount := coalesce(v_manual_discount, 0);
    v_best_benefits := v_manual_benefits;
    v_best_color := v_manual_color;
    v_best_source := 'manual';
  elsif v_earned_id is not null then
    v_best_id := v_earned_id;
    v_best_code := v_earned_code;
    v_best_name := v_earned_name;
    v_best_discount := coalesce(v_earned_discount, 0);
    v_best_benefits := v_earned_benefits;
    v_best_color := v_earned_color;
    v_best_source := 'earned';
  else
    v_best_id := null;
    v_best_code := 'standard';
    v_best_name := 'Thành viên tiêu chuẩn';
    v_best_discount := 0;
    v_best_benefits := null;
    v_best_color := '#9CA3AF';
    v_best_source := 'earned';
  end if;

  -- Hạng kế tiếp
  select name, min_value, discount_pct
    into v_nxt_name, v_nxt_min, v_nxt_discount
  from public.loyalty_tiers
  where policy_id = v_policy.id
    and is_active
    and min_value > v_val
  order by min_value asc
  limit 1;

  return jsonb_build_object(
    'policy_id', v_policy.id,
    'policy_name', v_policy.name,
    'tier_id', v_best_id,
    'tier', v_best_code,
    'name', v_best_name,
    'discount_pct', v_best_discount,
    'benefits', v_best_benefits,
    'color', v_best_color,
    'source', v_best_source,
    'value', v_val,
    'basis', v_policy.basis,
    'next', case when v_nxt_name is not null then
      jsonb_build_object(
        'name', v_nxt_name,
        'remaining', v_nxt_min - v_val,
        'discount_pct', v_nxt_discount
      ) else null end
  );
end;
$$;

-- Cấp quyền thực thi
grant execute on function private.guest_tier(uuid, uuid, date) to authenticated;
