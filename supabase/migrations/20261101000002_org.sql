-- 20261101000002_org.sql
create table public.branches (
  id                    uuid primary key default gen_random_uuid(),
  code                  text not null unique check (code ~ '^[A-Z0-9_]{2,10}$'),
  name                  text not null check (char_length(name) between 2 and 120),
  address               text,
  phone                 text,
  google_review_url     text,
  night_cutoff          time not null default '06:00',   -- nhận phòng trước giờ này = đêm hôm trước
  default_checkout_time time not null default '12:00',
  idle_logout_minutes   smallint not null default 15 check (idle_logout_minutes between 5 and 240),
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table public.rooms (
  id         uuid primary key default gen_random_uuid(),
  branch_id  uuid not null references public.branches(id) on delete restrict,
  number     text not null check (char_length(number) between 1 and 10),
  floor      smallint,
  room_type  text,
  opened_on  date,                     -- ngày bắt đầu đưa vào kinh doanh (null = có từ đầu); dùng tính công suất lịch sử
  closed_on  date,                     -- ngày ngừng kinh doanh vĩnh viễn
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  unique (branch_id, number),
  unique (id, branch_id),              -- để stays dùng khóa ngoại phức hợp
  check (closed_on is null or opened_on is null or closed_on > opened_on)
);

-- Kênh nguồn khách: danh mục do quản lý cấu hình, không hardcode enum
create table public.source_channels (
  id               uuid primary key default gen_random_uuid(),
  code             text not null unique check (code ~ '^[a-z0-9_]{2,30}$'),
  name             text not null,
  kind             text not null check (kind in ('direct', 'ota', 'partner', 'corporate', 'other')),
  requires_partner boolean not null default false,   -- bắt buộc chọn đối tác cụ thể
  is_active        boolean not null default true,
  sort             int not null default 0
);

-- Đối tác tối thiểu (công ty tour, đại lý, công ty khách hàng, HDV/tài xế) để ghi nguồn khách.
-- Module "Đối tác tour" sau này mở rộng bảng này (hợp đồng, hoa hồng), không tạo bảng mới.
create table public.partners (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(name) between 2 and 160),
  kind         text not null check (kind in ('tour_operator', 'travel_agency', 'corporate', 'guide_driver', 'other')),
  contact_name text,
  phone        text,
  email        text,
  tax_code     text,
  note         text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create unique index partners_name_uq on public.partners (lower(name));

-- Hồ sơ nhân viên, 1-1 với auth.users
create table public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  full_name         text not null,
  phone             text,
  default_branch_id uuid references public.branches(id),
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table public.app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);
-- Giá trị mặc định nạp ở migration catalog (04 §3): loyalty.rules, stay.self_cancel_hours, stay.backdate_after_hours,
-- export.max_rows_branch, export.max_rows_chain, app.go_live_date, security.require_mfa

-- Khóa phòng ngừng bán (hỏng hóc, sửa chữa, cải tạo). Check-in bị chặn khi phòng đang khóa;
-- phòng-ngày bị khóa được trừ khỏi mẫu số công suất. work_order_id gắn ở migration CSVC (12).
create table public.room_blocks (
  id            uuid primary key default gen_random_uuid(),
  branch_id     uuid not null references public.branches(id),
  room_id       uuid not null,
  starts_at     timestamptz not null default now(),
  ends_at       timestamptz,                         -- null = chưa biết khi nào xong
  reason        text not null check (char_length(reason) >= 3),
  work_order_id uuid,
  created_by    uuid not null references public.profiles(id),
  created_at    timestamptz not null default now(),
  released_at   timestamptz,
  released_by   uuid references public.profiles(id),
  foreign key (room_id, branch_id) references public.rooms(id, branch_id),
  check (ends_at is null or ends_at > starts_at),
  check (released_at is null or released_at >= starts_at)
);
create index room_blocks_open_idx on public.room_blocks(room_id) where released_at is null;
create index room_blocks_branch_idx on public.room_blocks(branch_id, starts_at);

-- Phòng có đang bị khóa tại thời điểm p_at không
create or replace function private.room_blocked_at(p_room uuid, p_at timestamptz)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.room_blocks rb
    where rb.room_id = p_room
      and rb.starts_at <= p_at
      and p_at < least(coalesce(rb.ends_at, 'infinity'), coalesce(rb.released_at, 'infinity')));
$$;

-- Đơn vị hành chính 2 cấp (sau sắp xếp 01/07/2025): 34 tỉnh/thành, ~3.300 phường/xã.
-- Nạp từ danh mục chính thức bằng seed riêng; không hardcode trong code.
create table public.admin_provinces (
  code text primary key,
  name text not null
);
create table public.admin_wards (
  code          text primary key,
  province_code text not null references public.admin_provinces(code),
  name          text not null
);
create index admin_wards_province_idx on public.admin_wards(province_code);

create trigger branches_updated_at before update on public.branches
  for each row execute function private.set_updated_at();
create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger partners_updated_at before update on public.partners
  for each row execute function private.set_updated_at();
