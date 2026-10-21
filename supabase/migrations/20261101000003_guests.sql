-- 20261101000003_guests.sql

-- Hạng thành viên: danh sách động, quản lý tự thêm/sửa tên, ngưỡng, % giảm giá (04 §3 nạp giá trị mẫu)
create table public.loyalty_tiers (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique check (code ~ '^[a-z0-9_]{2,30}$'),
  name         text not null check (char_length(name) between 2 and 40),
  min_value    int not null check (min_value >= 0),      -- ngưỡng: số lần lưu trú hoặc số đêm (theo loyalty.rules.basis)
  discount_pct numeric(5, 2) not null default 0 check (discount_pct between 0 and 100),
  benefits     text check (char_length(benefits) <= 500), -- quyền lợi khác: nhận phòng sớm, trả phòng muộn, nước uống...
  color        text check (color ~ '^#[0-9a-fA-F]{6}$'),
  sort         int not null default 0,
  is_active    boolean not null default true,
  updated_at   timestamptz not null default now()
);
create unique index loyalty_tiers_threshold_uq on public.loyalty_tiers(min_value) where is_active;
create trigger loyalty_tiers_updated_at before update on public.loyalty_tiers
  for each row execute function private.set_updated_at();

create table public.guests (
  id            uuid primary key default gen_random_uuid(),
  full_name     text not null check (char_length(full_name) between 2 and 120),
  search_name   text not null default '',            -- trigger điền, không ghi tay
  gender        public.gender not null,
  dob           date check (dob >= '1900-01-01'),
  nationality   char(2) not null default 'VN' check (nationality ~ '^[A-Z]{2}$'),
  phone         text check (phone ~ '^0[35789][0-9]{8}$'),             -- di động VN đã chuẩn hoá
  phone_intl    text check (phone_intl ~ '^\+[1-9][0-9]{6,14}$'),     -- E.164 cho khách quốc tế / WhatsApp
  email         text check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  address_line  text check (char_length(address_line) <= 200),
  province_code text references public.admin_provinces(code),
  ward_code     text references public.admin_wards(code),
  tags          text[] not null default '{}',
  merged_into   uuid references public.guests(id),
  sales_owner_id uuid references public.profiles(id),  -- sales phụ trách: được xem hồ sơ đầy đủ (quyền guest.view_full_own)
  tier_override_id     uuid references public.loyalty_tiers(id),   -- hạng gán tay (khách VIP, đối tác...), làm "sàn": không thấp hơn
  tier_override_until  date,                                       -- null = không hết hạn
  tier_override_reason text,
  tier_override_by     uuid references public.profiles(id),
  created_by    uuid references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (merged_into is null or merged_into <> id)
);

-- SĐT là khóa tra cứu chính: duy nhất trong các hồ sơ còn hiệu lực
create unique index guests_phone_uq      on public.guests(phone) where merged_into is null and phone is not null;
create index guests_search_name_trgm     on public.guests using gin (search_name extensions.gin_trgm_ops) where merged_into is null;
create index guests_phone_trgm           on public.guests using gin (phone extensions.gin_trgm_ops) where merged_into is null;
create index guests_email_idx            on public.guests(email) where merged_into is null and email is not null;
create index guests_dob_idx              on public.guests(dob);
create index guests_tags_gin             on public.guests using gin (tags);
create index guests_sales_owner_idx      on public.guests(sales_owner_id) where sales_owner_id is not null;

create or replace function private.guests_before_write()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.full_name   := normalize(regexp_replace(btrim(new.full_name), '\s+', ' ', 'g'), NFC);
  new.search_name := private.normalize_search(new.full_name);
  new.email       := nullif(lower(btrim(new.email)), '');
  return new;
end $$;

create trigger guests_before_write before insert or update on public.guests
  for each row execute function private.guests_before_write();
create trigger guests_updated_at before update on public.guests
  for each row execute function private.set_updated_at();

create table public.guest_documents (
  id              uuid primary key default gen_random_uuid(),
  guest_id        uuid not null references public.guests(id) on delete cascade,
  doc_type        public.doc_type not null,
  doc_number      text not null,
  issuing_country char(2) not null default 'VN',
  created_at      timestamptz not null default now(),
  unique (doc_type, issuing_country, doc_number),
  check (
    (doc_type = 'cccd' and issuing_country = 'VN' and doc_number ~ '^[0-9]{12}$')
    or (doc_type = 'passport' and doc_number ~ '^[A-Z0-9]{6,12}$')
  )
);
create index guest_documents_guest_idx on public.guest_documents(guest_id);
create index guest_documents_trgm      on public.guest_documents using gin (doc_number extensions.gin_trgm_ops);

-- Tóm tắt dẫn xuất, phục vụ tìm kiếm/sắp xếp nhanh. Chỉ trigger ghi.
create table public.guest_stats (
  guest_id       uuid primary key references public.guests(id) on delete cascade,
  total_stays    int not null default 0,
  total_nights   int not null default 0,
  first_stay_at  timestamptz,
  last_stay_at   timestamptz,
  last_branch_id uuid references public.branches(id),
  updated_at     timestamptz not null default now()
);
create index guest_stats_last_stay_idx on public.guest_stats(last_stay_at desc);
