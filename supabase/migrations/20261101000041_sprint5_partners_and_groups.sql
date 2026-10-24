-- 20261101000041_sprint5_partners_and_groups.sql
-- Triển khai §7: Đối tác lữ hành (partners), Hợp đồng giá (partner_contracts), Khách đoàn (group_bookings), Hoa hồng (commissions)

-- 1. Mở rộng bảng partners hiện có
alter table public.partners
  add column if not exists address text,
  add column if not exists bank_name text,
  add column if not exists bank_account text,
  add column if not exists bank_holder text,
  add column if not exists credit_limit numeric(12, 2) default 0,
  add column if not exists payment_terms text;

alter table public.partners drop constraint if exists partners_kind_check;
alter table public.partners add constraint partners_kind_check 
  check (kind in ('tour_operator', 'travel_agency', 'corporate', 'ota', 'guide_driver', 'other'));

-- 2. Tạo bảng partner_contracts (Hợp đồng đại lý / OTA / Doanh nghiệp)
create table if not exists public.partner_contracts (
  id                   uuid primary key default gen_random_uuid(),
  partner_id           uuid not null references public.partners(id) on delete cascade,
  contract_number      text not null,
  valid_from           date not null,
  valid_to             date not null,
  discount_pct         int not null default 0 check (discount_pct between 0 and 100),
  commission_rate_pct  int not null default 0 check (commission_rate_pct between 0 and 100),
  payment_terms        text,
  status               text not null default 'active' check (status in ('active', 'expired', 'terminated')),
  attachment_url       text,
  note                 text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  check (valid_to >= valid_from)
);

create index if not exists idx_partner_contracts_partner on public.partner_contracts(partner_id);

-- 3. Tạo bảng group_bookings (Quản lý và điều phối Khách đoàn)
create table if not exists public.group_bookings (
  id                      uuid primary key default gen_random_uuid(),
  code                    text not null unique,
  branch_id               uuid not null references public.branches(id),
  partner_id              uuid references public.partners(id),
  group_name              text not null,
  leader_name             text not null,
  leader_phone            text,
  leader_email            text,
  expected_check_in_at    timestamptz not null,
  expected_check_out_at   timestamptz not null,
  actual_check_in_at      timestamptz,
  actual_check_out_at     timestamptz,
  rooms_count             int not null default 1 check (rooms_count > 0),
  guests_count            int not null default 1 check (guests_count > 0),
  status                  text not null default 'confirmed' check (status in ('draft', 'confirmed', 'in_house', 'completed', 'cancelled')),
  estimated_amount        numeric(12, 2) not null default 0 check (estimated_amount >= 0),
  deposit_amount          numeric(12, 2) not null default 0 check (deposit_amount >= 0),
  billing_note            text,
  note                    text,
  created_by              uuid references auth.users(id),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  check (expected_check_out_at >= expected_check_in_at)
);

create index if not exists idx_group_bookings_branch on public.group_bookings(branch_id);
create index if not exists idx_group_bookings_partner on public.group_bookings(partner_id);

-- Sequence sinh mã đoàn tự động
create sequence if not exists public.group_booking_seq start 1001;

-- 4. Tạo bảng partner_commissions (Hoa hồng đại lý)
create table if not exists public.partner_commissions (
  id                uuid primary key default gen_random_uuid(),
  partner_id        uuid not null references public.partners(id) on delete cascade,
  branch_id         uuid not null references public.branches(id),
  stay_id           uuid references public.stays(id) on delete set null,
  group_booking_id  uuid references public.group_bookings(id) on delete set null,
  amount            numeric(12, 2) not null check (amount >= 0),
  rate_pct          int check (rate_pct between 0 and 100),
  base_revenue      numeric(12, 2) not null default 0 check (base_revenue >= 0),
  status            text not null default 'pending' check (status in ('pending', 'approved', 'paid', 'cancelled')),
  paid_at           timestamptz,
  paid_by           uuid references auth.users(id),
  note              text,
  created_at        timestamptz not null default now()
);

create index if not exists idx_commissions_partner on public.partner_commissions(partner_id);
create index if not exists idx_commissions_branch on public.partner_commissions(branch_id);

-- 5. Kích hoạt RLS cho các bảng
alter table public.partners enable row level security;
alter table public.partner_contracts enable row level security;
alter table public.group_bookings enable row level security;
alter table public.partner_commissions enable row level security;

-- Policies cho partners
drop policy if exists read_partners on public.partners;
create policy read_partners on public.partners
  for select to authenticated
  using (true);

drop policy if exists manage_partners on public.partners;
create policy manage_partners on public.partners
  for all to authenticated
  using (private.has_perm('partner.manage'))
  with check (private.has_perm('partner.manage'));

-- Policies cho partner_contracts
drop policy if exists read_partner_contracts on public.partner_contracts;
create policy read_partner_contracts on public.partner_contracts
  for select to authenticated
  using (private.has_perm('partner.view'));

drop policy if exists manage_partner_contracts on public.partner_contracts;
create policy manage_partner_contracts on public.partner_contracts
  for all to authenticated
  using (private.has_perm('contract.manage'))
  with check (private.has_perm('contract.manage'));

-- Policies cho group_bookings
drop policy if exists read_group_bookings on public.group_bookings;
create policy read_group_bookings on public.group_bookings
  for select to authenticated
  using (
    private.has_perm('group.manage')
    or private.has_perm('stay.view', branch_id)
  );

drop policy if exists manage_group_bookings on public.group_bookings;
create policy manage_group_bookings on public.group_bookings
  for all to authenticated
  using (private.has_perm('group.manage'))
  with check (private.has_perm('group.manage'));

-- Policies cho partner_commissions
drop policy if exists read_partner_commissions on public.partner_commissions;
create policy read_partner_commissions on public.partner_commissions
  for select to authenticated
  using (
    private.has_perm('commission.view')
    or private.has_perm('commission.manage')
  );

drop policy if exists manage_partner_commissions on public.partner_commissions;
create policy manage_partner_commissions on public.partner_commissions
  for all to authenticated
  using (private.has_perm('commission.manage'))
  with check (private.has_perm('commission.manage'));

-- 6. Kích hoạt các module trong public.modules
update public.modules
   set is_available = true,
       default_state = 'on'
 where key in ('partners', 'partner_contracts', 'group_bookings', 'commissions');

insert into public.branch_modules (branch_id, module_key, state)
select b.id, m.key, 'on'
from public.branches b
cross join (
  select unnest(array['partners', 'partner_contracts', 'group_bookings', 'commissions']) as key
) m
on conflict (branch_id, module_key) do update set state = 'on';

-- 7. Các RPC nghiệp vụ
-- 7.1 RPC lưu đối tác
create or replace function public.save_partner(
  p_id uuid,
  p_name text,
  p_kind text,
  p_contact_name text default null,
  p_phone text default null,
  p_email text default null,
  p_tax_code text default null,
  p_address text default null,
  p_bank_name text default null,
  p_bank_account text default null,
  p_bank_holder text default null,
  p_credit_limit numeric default 0,
  p_payment_terms text default null,
  p_note text default null,
  p_is_active boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_res record;
begin
  perform private.assert_perm('partner.manage');

  if p_name is null or length(btrim(p_name)) < 2 then
    raise exception 'Tên đối tác phải có ít nhất 2 ký tự' using errcode = 'P0422';
  end if;

  if p_kind is null or p_kind not in ('tour_operator', 'travel_agency', 'corporate', 'ota', 'guide_driver', 'other') then
    raise exception 'Loại đối tác không hợp lệ' using errcode = 'P0422';
  end if;

  if p_id is null then
    insert into public.partners (
      name, kind, contact_name, phone, email, tax_code, address,
      bank_name, bank_account, bank_holder, credit_limit, payment_terms,
      note, is_active
    )
    values (
      btrim(p_name), p_kind, nullif(btrim(p_contact_name), ''),
      nullif(btrim(p_phone), ''), nullif(btrim(p_email), ''),
      nullif(btrim(p_tax_code), ''), nullif(btrim(p_address), ''),
      nullif(btrim(p_bank_name), ''), nullif(btrim(p_bank_account), ''),
      nullif(btrim(p_bank_holder), ''), coalesce(p_credit_limit, 0),
      nullif(btrim(p_payment_terms), ''), nullif(btrim(p_note), ''),
      coalesce(p_is_active, true)
    )
    returning * into v_res;
  else
    update public.partners
       set name = btrim(p_name),
           kind = p_kind,
           contact_name = nullif(btrim(p_contact_name), ''),
           phone = nullif(btrim(p_phone), ''),
           email = nullif(btrim(p_email), ''),
           tax_code = nullif(btrim(p_tax_code), ''),
           address = nullif(btrim(p_address), ''),
           bank_name = nullif(btrim(p_bank_name), ''),
           bank_account = nullif(btrim(p_bank_account), ''),
           bank_holder = nullif(btrim(p_bank_holder), ''),
           credit_limit = coalesce(p_credit_limit, 0),
           payment_terms = nullif(btrim(p_payment_terms), ''),
           note = nullif(btrim(p_note), ''),
           is_active = coalesce(p_is_active, true),
           updated_at = now()
     where id = p_id
    returning * into v_res;

    if not found then
      raise exception 'Không tìm thấy đối tác để cập nhật' using errcode = 'P0404';
    end if;
  end if;

  return to_jsonb(v_res);
end;
$$;

-- 7.2 RPC lưu hợp đồng giá
create or replace function public.save_partner_contract(
  p_id uuid,
  p_partner_id uuid,
  p_contract_number text,
  p_valid_from date,
  p_valid_to date,
  p_discount_pct int default 0,
  p_commission_rate_pct int default 0,
  p_payment_terms text default null,
  p_status text default 'active',
  p_attachment_url text default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_res record;
begin
  perform private.assert_perm('contract.manage');

  if not exists (select 1 from public.partners where id = p_partner_id) then
    raise exception 'Không tìm thấy đối tác tương ứng' using errcode = 'P0404';
  end if;

  if p_valid_to < p_valid_from then
    raise exception 'Ngày kết thúc hợp đồng phải sau hoặc bằng ngày bắt đầu' using errcode = 'P0422';
  end if;

  if p_id is null then
    insert into public.partner_contracts (
      partner_id, contract_number, valid_from, valid_to,
      discount_pct, commission_rate_pct, payment_terms,
      status, attachment_url, note
    )
    values (
      p_partner_id, btrim(p_contract_number), p_valid_from, p_valid_to,
      coalesce(p_discount_pct, 0), coalesce(p_commission_rate_pct, 0),
      nullif(btrim(p_payment_terms), ''), coalesce(p_status, 'active'),
      nullif(btrim(p_attachment_url), ''), nullif(btrim(p_note), '')
    )
    returning * into v_res;
  else
    update public.partner_contracts
       set contract_number = btrim(p_contract_number),
           valid_from = p_valid_from,
           valid_to = p_valid_to,
           discount_pct = coalesce(p_discount_pct, 0),
           commission_rate_pct = coalesce(p_commission_rate_pct, 0),
           payment_terms = nullif(btrim(p_payment_terms), ''),
           status = coalesce(p_status, 'active'),
           attachment_url = nullif(btrim(p_attachment_url), ''),
           note = nullif(btrim(p_note), ''),
           updated_at = now()
     where id = p_id
    returning * into v_res;

    if not found then
      raise exception 'Không tìm thấy hợp đồng để cập nhật' using errcode = 'P0404';
    end if;
  end if;

  return to_jsonb(v_res);
end;
$$;

-- 7.3 RPC lưu khách đoàn (group_bookings)
create or replace function public.save_group_booking(
  p_id uuid,
  p_branch_id uuid,
  p_partner_id uuid,
  p_group_name text,
  p_leader_name text,
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
  end if;

  return to_jsonb(v_res);
end;
$$;

-- 7.4 RPC ghi nhận / duyệt / thanh toán hoa hồng
create or replace function public.decide_partner_commission(
  p_id uuid,
  p_action text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_res record;
begin
  perform private.assert_perm('commission.manage');

  if p_action not in ('approve', 'pay', 'cancel') then
    raise exception 'Thao tác hoa hồng không hợp lệ' using errcode = 'P0422';
  end if;

  if p_action = 'approve' then
    update public.partner_commissions
       set status = 'approved',
           note = coalesce(nullif(btrim(p_note), ''), note)
     where id = p_id and status = 'pending'
    returning * into v_res;
  elsif p_action = 'pay' then
    update public.partner_commissions
       set status = 'paid',
           paid_at = now(),
           paid_by = (select auth.uid()),
           note = coalesce(nullif(btrim(p_note), ''), note)
     where id = p_id and status in ('pending', 'approved')
    returning * into v_res;
  elsif p_action = 'cancel' then
    update public.partner_commissions
       set status = 'cancelled',
           note = coalesce(nullif(btrim(p_note), ''), note)
     where id = p_id and status <> 'paid'
    returning * into v_res;
  end if;

  if not found then
    raise exception 'Không tìm thấy bản ghi hoa hồng hoặc trạng thái không cho phép thao tác' using errcode = 'P0404';
  end if;

  return to_jsonb(v_res);
end;
$$;

-- 8. Cấp quyền thực thi các RPC cho authenticated
grant execute on function public.save_partner(uuid, text, text, text, text, text, text, text, text, text, text, numeric, text, text, boolean) to authenticated;
grant execute on function public.save_partner_contract(uuid, uuid, text, date, date, int, int, text, text, text, text) to authenticated;
grant execute on function public.save_group_booking(uuid, uuid, uuid, text, text, text, text, timestamptz, timestamptz, int, int, text, numeric, numeric, text, text) to authenticated;
grant execute on function public.decide_partner_commission(uuid, text, text) to authenticated;
