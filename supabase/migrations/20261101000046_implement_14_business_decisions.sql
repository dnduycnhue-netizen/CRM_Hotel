-- 20261101000046_implement_14_business_decisions.sql
-- Triển khai trọn vẹn 14 quyết định nghiệp vụ đã được phê duyệt (§9):
-- (b) Chính sách hạng tính theo Số đêm (basis = 'nights')
-- (c) Lượt ĐÃ HỦY không tính tích lũy; chỉ tính các lượt 'completed'
-- (e) Kích hoạt Inspections & Compliance cho 8 cơ sở
-- (i) Đoàn khách tự sinh dự toán hoa hồng (pending) khi tạo/xác nhận đoàn
-- (m) Quản lý cơ sở xem được toàn bộ khách tiềm năng (lead chưa có lượt ở)
-- (n) Tạo tài khoản sales2@khachsan.vn kiểm chứng masking giữa 2 sales

-- ==============================================================================
-- 1. (b) CHÍNH SÁCH HẠNG TÍNH THEO SỐ ĐÊM (basis = 'nights')
-- ==============================================================================
alter table public.loyalty_policies alter column basis set default 'nights';

update public.loyalty_policies
   set basis = 'nights',
       updated_at = now()
 where basis <> 'nights';

-- ==============================================================================
-- 2. (c) LƯỢT ĐÃ HỦY TUYỆT ĐỐI KHÔNG TÍNH; CHỈ TÍNH LƯỢT 'completed'
-- ==============================================================================

-- 2.1 Cập nhật private.guest_loyalty_value
create or replace function private.guest_loyalty_value(
  p_guest_id uuid,
  p_exclude uuid default null::uuid,
  p_date date default null::date
)
returns int
language plpgsql
stable security definer
set search_path = ''
as $$
declare
  v_date date := coalesce(p_date, (now() at time zone 'Asia/Ho_Chi_Minh')::date);
  v_policy public.loyalty_policies;
  v_val int;
begin
  v_policy := private.active_loyalty_policy(v_date);
  if v_policy.id is null then
    return 0;
  end if;

  select coalesce(case when v_policy.basis = 'nights' then sum(s.nights) else count(*) end, 0)::int
    into v_val
  from public.stay_guests sg
  join public.stays s on s.id = sg.stay_id and s.status = 'checked_out'
  where sg.guest_id = p_guest_id
    and sg.counts_for_loyalty = true
    and (p_exclude is null or s.id <> p_exclude)
    and (v_policy.window_months = 0
         or s.business_date > v_date - make_interval(months => v_policy.window_months));

  return coalesce(v_val, 0);
end $$;

-- 2.2 Cập nhật private.refresh_guest_stats
create or replace function private.refresh_guest_stats(p_guest_ids uuid[])
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.guest_stats as gs
    (guest_id, total_stays, total_nights, first_stay_at, last_stay_at, last_branch_id, updated_at)
  select g.id,
         count(s.id),
         coalesce(sum(s.nights), 0),
         min(s.check_in_at),
         max(s.check_in_at),
         (array_agg(s.branch_id order by s.check_in_at desc) filter (where s.id is not null))[1],
         now()
  from public.guests g
  left join public.stay_guests sg on sg.guest_id = g.id and sg.counts_for_loyalty = true
  left join public.stays s        on s.id = sg.stay_id and s.status = 'checked_out'
  where g.id = any (p_guest_ids)
  group by g.id
  on conflict (guest_id) do update set
    total_stays    = excluded.total_stays,
    total_nights   = excluded.total_nights,
    first_stay_at  = excluded.first_stay_at,
    last_stay_at   = excluded.last_stay_at,
    last_branch_id = excluded.last_branch_id,
    updated_at     = excluded.updated_at;
$$;
revoke all on function private.refresh_guest_stats(uuid[]) from public;

-- Chạy refresh lại toàn bộ khách hàng
do $$
begin
  perform private.refresh_guest_stats(array(select id from public.guests));
end $$;

-- ==============================================================================
-- 3. (e) KÍCH HOẠT INSPECTIONS & COMPLIANCE CHO 8 CƠ SỞ
-- ==============================================================================
update public.modules
   set is_available = true,
       default_state = 'on'
 where key in ('inspections', 'compliance');

insert into public.branch_modules (branch_id, module_key, state, config)
select b.id, m.key, 'on'::public.module_state, '{}'::jsonb
from public.branches b
cross join (values ('inspections'), ('compliance')) as m(key)
on conflict (branch_id, module_key) do update set state = 'on', updated_at = now();

-- ==============================================================================
-- 4. (i) ĐOÀN KHÁCH TỰ ĐỘNG SINH DỰ TOÁN HOA HỒNG KHI TẠO / CẬP NHẬT
-- ==============================================================================
create or replace function public.save_group_booking(
  p_id uuid default null,
  p_branch_id uuid default null,
  p_partner_id uuid default null,
  p_group_name text default null,
  p_leader_name text default null,
  p_leader_phone text default null,
  p_leader_email text default null,
  p_expected_check_in timestamptz default null,
  p_expected_check_out timestamptz default null,
  p_rooms_count int default 1,
  p_guests_count int default 1,
  p_status text default 'confirmed',
  p_estimated_amount numeric default 0,
  p_deposit_amount numeric default 0,
  p_billing_note text default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_res record;
  v_code text;
  v_rate_pct int;
  v_comm_amount numeric(12, 2);
  v_contract_rate int;
begin
  perform private.assert_perm('group.manage');

  if p_branch_id is null or not exists (select 1 from public.branches where id = p_branch_id) then
    raise exception 'Cơ sở nhận đoàn không hợp lệ' using errcode = 'P0422';
  end if;

  if p_group_name is null or length(btrim(p_group_name)) < 2 then
    raise exception 'Tên đoàn phải có ít nhất 2 ký tự' using errcode = 'P0422';
  end if;

  if p_expected_check_out <= p_expected_check_in then
    raise exception 'Thời gian trả phòng phải sau thời gian nhận phòng' using errcode = 'P0422';
  end if;

  if p_id is null then
    v_code := 'GRP-' || to_char(now(), 'YYYYMM') || '-' || lpad(nextval('public.group_booking_seq')::text, 4, '0');
    insert into public.group_bookings (
      code, branch_id, partner_id, group_name,
      leader_name, leader_phone, leader_email,
      expected_check_in_at, expected_check_out_at,
      rooms_count, guests_count, status,
      estimated_amount, deposit_amount, billing_note,
      note, created_by
    )
    values (
      v_code, p_branch_id, p_partner_id, btrim(p_group_name),
      btrim(p_leader_name), nullif(btrim(p_leader_phone), ''),
      nullif(btrim(p_leader_email), ''), p_expected_check_in,
      p_expected_check_out, greatest(coalesce(p_rooms_count, 1), 1),
      greatest(coalesce(p_guests_count, 1), 1), coalesce(p_status, 'confirmed'),
      greatest(coalesce(p_estimated_amount, 0), 0),
      greatest(coalesce(p_deposit_amount, 0), 0),
      nullif(btrim(p_billing_note), ''), nullif(btrim(p_note), ''),
      (select auth.uid())
    )
    returning * into v_res;

    -- Tự động sinh dự toán hoa hồng nếu đoàn có đối tác và có dự toán doanh thu
    if p_partner_id is not null and coalesce(p_estimated_amount, 0) > 0 then
      select commission_rate_pct into v_contract_rate
      from public.partner_contracts
      where partner_id = p_partner_id
        and status = 'active'
        and (valid_to is null or valid_to >= current_date)
      order by valid_from desc
      limit 1;

      v_rate_pct := coalesce(v_contract_rate, 10);
      v_comm_amount := round(greatest(coalesce(p_estimated_amount, 0), 0) * v_rate_pct / 100.0, 2);

      insert into public.partner_commissions (
        partner_id, branch_id, group_booking_id,
        amount, rate_pct, base_revenue, status, note
      ) values (
        p_partner_id, p_branch_id, v_res.id,
        v_comm_amount, v_rate_pct, greatest(coalesce(p_estimated_amount, 0), 0),
        'pending',
        'Dự toán hoa hồng đoàn ' || v_code || ' (' || v_rate_pct || '%)'
      );
    end if;

  else
    update public.group_bookings
       set branch_id = p_branch_id,
           partner_id = p_partner_id,
           group_name = btrim(p_group_name),
           leader_name = btrim(p_leader_name),
           leader_phone = nullif(btrim(p_leader_phone), ''),
           leader_email = nullif(btrim(p_leader_email), ''),
           expected_check_in_at = p_expected_check_in,
           expected_check_out_at = p_expected_check_out,
           rooms_count = greatest(coalesce(p_rooms_count, 1), 1),
           guests_count = greatest(coalesce(p_guests_count, 1), 1),
           status = coalesce(p_status, status),
           estimated_amount = greatest(coalesce(p_estimated_amount, 0), 0),
           deposit_amount = greatest(coalesce(p_deposit_amount, 0), 0),
           billing_note = nullif(btrim(p_billing_note), ''),
           note = nullif(btrim(p_note), ''),
           updated_at = now()
     where id = p_id
    returning * into v_res;

    if not found then
      raise exception 'Không tìm thấy thông tin đoàn để cập nhật' using errcode = 'P0404';
    end if;

    -- Đồng bộ hoa hồng dự kiến (nếu bản ghi hoa hồng vẫn đang ở trạng thái pending)
    if p_partner_id is not null and coalesce(p_estimated_amount, 0) > 0 then
      select commission_rate_pct into v_contract_rate
      from public.partner_contracts
      where partner_id = p_partner_id
        and status = 'active'
        and (valid_to is null or valid_to >= current_date)
      order by valid_from desc
      limit 1;

      v_rate_pct := coalesce(v_contract_rate, 10);
      v_comm_amount := round(greatest(coalesce(p_estimated_amount, 0), 0) * v_rate_pct / 100.0, 2);

      -- Cập nhật nếu đã có bản ghi pending
      update public.partner_commissions
         set partner_id = p_partner_id,
             branch_id = p_branch_id,
             amount = v_comm_amount,
             rate_pct = v_rate_pct,
             base_revenue = greatest(coalesce(p_estimated_amount, 0), 0),
             note = 'Dự toán hoa hồng đoàn ' || v_res.code || ' (' || v_rate_pct || '%)'
       where group_booking_id = v_res.id and status = 'pending';

      -- Nếu chưa có bản ghi hoa hồng nào thì tạo mới
      if not exists (select 1 from public.partner_commissions where group_booking_id = v_res.id) then
        insert into public.partner_commissions (
          partner_id, branch_id, group_booking_id,
          amount, rate_pct, base_revenue, status, note
        ) values (
          p_partner_id, p_branch_id, v_res.id,
          v_comm_amount, v_rate_pct, greatest(coalesce(p_estimated_amount, 0), 0),
          'pending',
          'Dự toán hoa hồng đoàn ' || v_res.code || ' (' || v_rate_pct || '%)'
        );
      end if;
    elsif p_partner_id is null then
      -- Nếu chuyển sang đoàn tự đặt (không qua đối tác), hủy hoa hồng pending
      update public.partner_commissions
         set status = 'cancelled',
             note = 'Đã hủy hoa hồng vì chuyển sang đoàn tự đặt trực tiếp'
       where group_booking_id = v_res.id and status = 'pending';
    end if;

  end if;

  return to_jsonb(v_res);
end;
$$;

grant execute on function public.save_group_booking(uuid, uuid, uuid, text, text, text, text, timestamptz, timestamptz, int, int, text, numeric, numeric, text, text) to authenticated;

-- ==============================================================================
-- 5. (m) QUẢN LÝ CƠ SỞ XEM ĐƯỢC TOÀN BỘ KHÁCH TIỀM NĂNG (LEAD CHƯA CÓ LƯỢT Ở)
-- ==============================================================================
drop function if exists public.get_guests_list(integer, uuid, text, uuid, text);

create or replace function public.get_guests_list(
  p_limit integer default 50,
  p_sales_owner_id uuid default null::uuid,
  p_tag text default null::text,
  p_branch_id uuid default null::uuid,
  p_consent_channel text default null::text
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
      p_consent_channel is null
      or exists (
        select 1 from public.guest_consents gc
        where gc.guest_id = g.id
          and gc.channel = p_consent_channel
          and gc.granted = true
      )
    )
    and (
      v_effective_branches is null
      or s.last_branch_id = any(v_effective_branches)
      or exists (
        select 1 from public.stay_guests sg
        join public.stays st on st.id = sg.stay_id
        where sg.guest_id = g.id and st.branch_id = any(v_effective_branches)
      )
      or g.sales_owner_id = (select auth.uid())
      -- Khách tiềm năng (lead do sales tạo chưa có lượt ở): Quản lý chi nhánh thấy để chuẩn bị tiếp đón
      or coalesce(s.total_stays, 0) = 0
    )
  order by g.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
end $function$;

grant execute on function public.get_guests_list(integer, uuid, text, uuid, text) to authenticated;

-- ==============================================================================
-- 6. (n) TẠO TÀI KHOẢN sales2@khachsan.vn ĐỂ KIỂM CHỨNG MASKING GIỮA 2 SALES
-- ==============================================================================
do $$
declare
  v_user_id uuid;
  v_sales_role_id uuid;
begin
  select id into v_sales_role_id from public.roles where key = 'sales' limit 1;

  select id into v_user_id from auth.users where email = 'sales2@khachsan.vn';

  if v_user_id is null then
    v_user_id := gen_random_uuid();

    insert into auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      role, aud, is_sso_user
    ) values (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'sales2@khachsan.vn',
      '$2a$10$GW8QywHCY6iwpw1Avh/yeOdtYH12qkBGrmHvj.a8bCfM32vLOy6A.', -- Test1234!@#$
      now(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      '{"full_name": "Lê Thảo My (Sales 2 - Khách Đoàn)", "email_verified": true}'::jsonb,
      now(),
      now(),
      'authenticated',
      'authenticated',
      false
    );

    insert into public.profiles (id, full_name, default_branch_id, created_at, updated_at)
    values (v_user_id, 'Lê Thảo My (Sales 2 - Khách Đoàn)', null, now(), now())
    on conflict (id) do update set
      full_name = 'Lê Thảo My (Sales 2 - Khách Đoàn)';

    if v_sales_role_id is not null then
      insert into public.user_roles (user_id, role_id, branch_id)
      values (v_user_id, v_sales_role_id, null)
      on conflict do nothing;
    end if;
  else
    -- Nếu user đã tồn tại, đảm bảo profile và role được gắn chuẩn
    insert into public.profiles (id, full_name, default_branch_id, created_at, updated_at)
    values (v_user_id, 'Lê Thảo My (Sales 2 - Khách Đoàn)', null, now(), now())
    on conflict (id) do update set
      full_name = 'Lê Thảo My (Sales 2 - Khách Đoàn)';

    if v_sales_role_id is not null then
      insert into public.user_roles (user_id, role_id, branch_id)
      values (v_user_id, v_sales_role_id, null)
      on conflict do nothing;
    end if;
  end if;
end $$;
