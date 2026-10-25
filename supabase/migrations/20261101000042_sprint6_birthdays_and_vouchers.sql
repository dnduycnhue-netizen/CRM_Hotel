-- 20261101000042_sprint6_birthdays_and_vouchers.sql
-- Triển khai §9: Quản lý Sinh nhật (birthday) & Voucher ưu đãi khách hàng (vouchers)

-- 1. Bảng vouchers (Mã giảm giá, voucher quà tặng)
create table if not exists public.vouchers (
  id                      uuid primary key default gen_random_uuid(),
  code                    text not null unique check (length(code) >= 3 and length(code) <= 30),
  title                   text not null,
  discount_type           text not null check (discount_type in ('percent', 'fixed_amount')),
  discount_value          numeric(12, 2) not null check (discount_value > 0),
  max_discount_amount     numeric(12, 2) check (max_discount_amount is null or max_discount_amount > 0),
  min_spend_amount        numeric(12, 2) not null default 0 check (min_spend_amount >= 0),
  valid_from              date not null,
  valid_to                date not null,
  usage_limit             int not null default 1 check (usage_limit > 0),
  used_count              int not null default 0 check (used_count >= 0),
  target_guest_id         uuid references public.guests(id) on delete set null,
  applicable_branch_id    uuid references public.branches(id) on delete set null,
  status                  text not null default 'active' check (status in ('active', 'disabled', 'expired')),
  note                    text,
  created_by              uuid references auth.users(id),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  check (valid_to >= valid_from),
  check (used_count <= usage_limit)
);

create index if not exists idx_vouchers_code on public.vouchers(code);
create index if not exists idx_vouchers_guest on public.vouchers(target_guest_id);
create index if not exists idx_vouchers_valid on public.vouchers(valid_from, valid_to, status);

-- 2. Bảng voucher_redemptions (Lịch sử sử dụng voucher)
create table if not exists public.voucher_redemptions (
  id                uuid primary key default gen_random_uuid(),
  voucher_id        uuid not null references public.vouchers(id) on delete cascade,
  guest_id          uuid not null references public.guests(id),
  stay_id           uuid references public.stays(id) on delete set null,
  branch_id         uuid not null references public.branches(id),
  discount_applied  numeric(12, 2) not null check (discount_applied >= 0),
  redeemed_at       timestamptz not null default now(),
  redeemed_by       uuid references auth.users(id),
  note              text
);

create index if not exists idx_voucher_redemptions_voucher on public.voucher_redemptions(voucher_id);
create index if not exists idx_voucher_redemptions_guest on public.voucher_redemptions(guest_id);
create index if not exists idx_voucher_redemptions_stay on public.voucher_redemptions(stay_id);

-- 3. Mở rộng bảng stays liên kết voucher_id
alter table public.stays add column if not exists voucher_id uuid references public.vouchers(id) on delete set null;

-- 4. Bảng birthday_greetings (Lịch sử chúc mừng & chăm sóc sinh nhật)
create table if not exists public.birthday_greetings (
  id                uuid primary key default gen_random_uuid(),
  guest_id          uuid not null references public.guests(id) on delete cascade,
  branch_id         uuid not null references public.branches(id),
  year              int not null,
  channel           text not null default 'phone' check (channel in ('phone', 'sms', 'zalo', 'email', 'in_person', 'gift')),
  voucher_id        uuid references public.vouchers(id) on delete set null,
  gift_description  text,
  status            text not null default 'sent' check (status in ('planned', 'sent', 'cancelled')),
  note              text,
  created_by        uuid references auth.users(id),
  created_at        timestamptz not null default now(),
  unique (guest_id, year)
);

create index if not exists idx_birthday_greetings_guest_year on public.birthday_greetings(guest_id, year);

-- 5. Kích hoạt RLS cho các bảng
alter table public.vouchers enable row level security;
alter table public.voucher_redemptions enable row level security;
alter table public.birthday_greetings enable row level security;

-- Policies cho vouchers
drop policy if exists read_vouchers on public.vouchers;
create policy read_vouchers on public.vouchers
  for select to authenticated
  using (
    private.has_perm('voucher.issue')
    or private.has_perm('voucher.redeem')
    or private.has_perm('birthday.view')
  );

drop policy if exists manage_vouchers on public.vouchers;
create policy manage_vouchers on public.vouchers
  for all to authenticated
  using (private.has_perm('voucher.issue'))
  with check (private.has_perm('voucher.issue'));

-- Policies cho voucher_redemptions
drop policy if exists read_voucher_redemptions on public.voucher_redemptions;
create policy read_voucher_redemptions on public.voucher_redemptions
  for select to authenticated
  using (
    private.has_perm('voucher.redeem')
    or private.has_perm('voucher.issue')
  );

drop policy if exists insert_voucher_redemptions on public.voucher_redemptions;
create policy insert_voucher_redemptions on public.voucher_redemptions
  for insert to authenticated
  with check (private.has_perm('voucher.redeem'));

-- Policies cho birthday_greetings
drop policy if exists read_birthday_greetings on public.birthday_greetings;
create policy read_birthday_greetings on public.birthday_greetings
  for select to authenticated
  using (private.has_perm('birthday.view'));

drop policy if exists manage_birthday_greetings on public.birthday_greetings;
create policy manage_birthday_greetings on public.birthday_greetings
  for all to authenticated
  using (private.has_perm('birthday.view'))
  with check (private.has_perm('birthday.view'));

-- 6. Kích hoạt modules trong public.modules và public.branch_modules
update public.modules
   set is_available = true,
       default_state = 'on'
 where key in ('birthday', 'vouchers');

insert into public.branch_modules (branch_id, module_key, state)
select b.id, m.key, 'on'
from public.branches b
cross join (
  select unnest(array['birthday', 'vouchers']) as key
) m
on conflict (branch_id, module_key) do update set state = 'on';

-- 7. Các RPC nghiệp vụ
-- 7.1 RPC lấy danh sách sinh nhật sắp tới
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
begin
  perform private.assert_perm('birthday.view', p_branch_id);

  return query
  with base_guests as (
    select
      g.id as b_guest_id,
      g.full_name as b_full_name,
      g.dob as b_dob,
      g.phone as b_phone,
      g.email as b_email,
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
      and (p_branch_id is null or s.branch_id = p_branch_id)
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
  where (p_branch_id is null or gs.s_last_branch_name is not null or f.b_days_until <= 7)
  order by f.b_days_until asc, coalesce(gs.s_total_stays, 0) desc;
end;
$$;

-- 7.2 RPC tạo voucher mới
create or replace function public.create_voucher(
  p_code text,
  p_title text,
  p_discount_type text,
  p_discount_value numeric,
  p_max_discount_amount numeric default null,
  p_min_spend_amount numeric default 0,
  p_valid_from date default current_date,
  p_valid_to date default (current_date + interval '90 days')::date,
  p_usage_limit int default 1,
  p_target_guest_id uuid default null,
  p_applicable_branch_id uuid default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_res record;
  v_clean_code text := upper(btrim(p_code));
begin
  perform private.assert_perm('voucher.issue');

  if length(v_clean_code) < 3 then
    raise exception 'Mã voucher phải có ít nhất 3 ký tự' using errcode = 'P0422';
  end if;

  if exists (select 1 from public.vouchers where code = v_clean_code) then
    raise exception 'Mã voucher "%" đã tồn tại trên hệ thống' , v_clean_code using errcode = 'P0409';
  end if;

  if p_discount_type not in ('percent', 'fixed_amount') then
    raise exception 'Loại giảm giá không hợp lệ' using errcode = 'P0422';
  end if;

  if p_discount_value <= 0 then
    raise exception 'Giá trị giảm giá phải lớn hơn 0' using errcode = 'P0422';
  end if;

  if p_discount_type = 'percent' and p_discount_value > 100 then
    raise exception 'Giảm giá phần trăm không được vượt quá 100%%' using errcode = 'P0422';
  end if;

  if p_valid_to < p_valid_from then
    raise exception 'Ngày hết hạn voucher phải sau hoặc bằng ngày hiệu lực' using errcode = 'P0422';
  end if;

  insert into public.vouchers (
    code, title, discount_type, discount_value, max_discount_amount,
    min_spend_amount, valid_from, valid_to, usage_limit, target_guest_id,
    applicable_branch_id, note, created_by
  )
  values (
    v_clean_code, btrim(p_title), p_discount_type, p_discount_value,
    p_max_discount_amount, coalesce(p_min_spend_amount, 0),
    p_valid_from, p_valid_to, coalesce(p_usage_limit, 1),
    p_target_guest_id, p_applicable_branch_id, nullif(btrim(p_note), ''),
    auth.uid()
  )
  returning * into v_res;

  return to_jsonb(v_res);
end;
$$;

-- 7.3 RPC đổi / áp dụng voucher (Redeem Voucher)
create or replace function public.redeem_voucher(
  p_code text,
  p_guest_id uuid,
  p_branch_id uuid,
  p_stay_id uuid default null,
  p_bill_amount numeric default 0,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_voucher record;
  v_discount numeric(12, 2) := 0;
  v_redemption record;
  v_clean_code text := upper(btrim(p_code));
begin
  perform private.assert_perm('voucher.redeem', p_branch_id);

  select * into v_voucher
  from public.vouchers
  where code = v_clean_code
  for update;

  if not found then
    raise exception 'Mã voucher "%" không tồn tại', v_clean_code using errcode = 'P0404';
  end if;

  if v_voucher.status <> 'active' then
    raise exception 'Voucher "%" hiện đang ở trạng thái %', v_clean_code, v_voucher.status using errcode = 'P0422';
  end if;

  if current_date < v_voucher.valid_from then
    raise exception 'Voucher "%" chưa tới ngày hiệu lực (từ %)', v_clean_code, v_voucher.valid_from using errcode = 'P0422';
  end if;

  if current_date > v_voucher.valid_to then
    update public.vouchers set status = 'expired' where id = v_voucher.id;
    raise exception 'Voucher "%" đã hết hạn sử dụng vào ngày %', v_clean_code, v_voucher.valid_to using errcode = 'P0422';
  end if;

  if v_voucher.used_count >= v_voucher.usage_limit then
    raise exception 'Voucher "%" đã đạt giới hạn số lần sử dụng tối đa (%/%)', v_clean_code, v_voucher.used_count, v_voucher.usage_limit using errcode = 'P0422';
  end if;

  if v_voucher.applicable_branch_id is not null and v_voucher.applicable_branch_id <> p_branch_id then
    raise exception 'Voucher "%" không áp dụng tại cơ sở này', v_clean_code using errcode = 'P0422';
  end if;

  if v_voucher.target_guest_id is not null and v_voucher.target_guest_id <> p_guest_id then
    raise exception 'Voucher "%" là ưu đãi cá nhân được cấp riêng cho khách hàng khác', v_clean_code using errcode = 'P0403';
  end if;

  if p_bill_amount > 0 and p_bill_amount < v_voucher.min_spend_amount then
    raise exception 'Hóa đơn chưa đạt giá trị tối thiểu để áp dụng voucher (yêu cầu tối thiểu % đ)', v_voucher.min_spend_amount using errcode = 'P0422';
  end if;

  -- Tính toán số tiền chiết khấu thực tế
  if v_voucher.discount_type = 'percent' then
    v_discount := (p_bill_amount * v_voucher.discount_value / 100.0);
    if v_voucher.max_discount_amount is not null and v_discount > v_voucher.max_discount_amount then
      v_discount := v_voucher.max_discount_amount;
    end if;
  else
    v_discount := v_voucher.discount_value;
    if p_bill_amount > 0 and v_discount > p_bill_amount then
      v_discount := p_bill_amount;
    end if;
  end if;

  -- Ghi nhận giao dịch đổi voucher
  insert into public.voucher_redemptions (
    voucher_id, guest_id, stay_id, branch_id, discount_applied, redeemed_by, note
  )
  values (
    v_voucher.id, p_guest_id, p_stay_id, p_branch_id, v_discount, auth.uid(), nullif(btrim(p_note), '')
  )
  returning * into v_redemption;

  -- Cập nhật số lần dùng của voucher
  update public.vouchers
     set used_count = used_count + 1,
         updated_at = now()
   where id = v_voucher.id;

  -- Nếu có stay_id, cập nhật discount_applied vào lượt ở
  if p_stay_id is not null then
    update public.stays
       set voucher_id = v_voucher.id,
           discount_applied = true,
           updated_at = now()
     where id = p_stay_id;
  end if;

  return jsonb_build_object(
    'redemption_id', v_redemption.id,
    'voucher_id', v_voucher.id,
    'code', v_voucher.code,
    'title', v_voucher.title,
    'discount_type', v_voucher.discount_type,
    'discount_value', v_voucher.discount_value,
    'discount_applied', v_discount,
    'remaining_uses', (v_voucher.usage_limit - v_voucher.used_count - 1)
  );
end;
$$;

-- 7.4 RPC ghi nhận lời chúc & quà tặng sinh nhật (Record Birthday Greeting)
create or replace function public.record_birthday_greeting(
  p_guest_id uuid,
  p_branch_id uuid,
  p_year int,
  p_channel text,
  p_gift_description text default null,
  p_auto_issue_voucher boolean default false,
  p_voucher_discount_pct int default 15,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_res record;
  v_voucher_id uuid := null;
  v_voucher_code text;
  v_guest record;
begin
  perform private.assert_perm('birthday.view', p_branch_id);

  select full_name, phone into v_guest
  from public.guests
  where id = p_guest_id;

  if not found then
    raise exception 'Không tìm thấy hồ sơ khách hàng' using errcode = 'P0404';
  end if;

  -- Nếu chọn tự động phát voucher sinh nhật độc quyền
  if p_auto_issue_voucher then
    v_voucher_code := 'BDAY' || p_year || '-' || upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 6));
    
    insert into public.vouchers (
      code, title, discount_type, discount_value, max_discount_amount,
      min_spend_amount, valid_from, valid_to, usage_limit, target_guest_id,
      applicable_branch_id, note, created_by
    )
    values (
      v_voucher_code,
      'Ưu đãi mừng sinh nhật ' || p_year || ' - ' || v_guest.full_name,
      'percent',
      coalesce(p_voucher_discount_pct, 15),
      500000, -- Tối đa giảm 500k
      0,
      current_date,
      (current_date + interval '60 days')::date,
      1,
      p_guest_id,
      null, -- Toàn chuỗi
      'Voucher sinh nhật cấp tự động cho ' || v_guest.full_name,
      auth.uid()
    )
    returning id into v_voucher_id;
  end if;

  insert into public.birthday_greetings (
    guest_id, branch_id, year, channel, voucher_id,
    gift_description, status, note, created_by
  )
  values (
    p_guest_id, p_branch_id, p_year, p_channel, v_voucher_id,
    nullif(btrim(p_gift_description), ''), 'sent',
    nullif(btrim(p_note), ''), auth.uid()
  )
  on conflict (guest_id, year) do update
    set branch_id = excluded.branch_id,
        channel = excluded.channel,
        voucher_id = coalesce(excluded.voucher_id, birthday_greetings.voucher_id),
        gift_description = coalesce(excluded.gift_description, birthday_greetings.gift_description),
        note = coalesce(excluded.note, birthday_greetings.note),
        status = 'sent'
  returning * into v_res;

  return jsonb_build_object(
    'greeting_id', v_res.id,
    'guest_id', v_res.guest_id,
    'year', v_res.year,
    'channel', v_res.channel,
    'voucher_id', v_res.voucher_id,
    'voucher_code', v_voucher_code,
    'status', v_res.status
  );
end;
$$;
