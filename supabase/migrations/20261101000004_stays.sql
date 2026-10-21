-- 20261101000004_stays.sql
create table public.stays (
  id                    uuid primary key default gen_random_uuid(),
  branch_id             uuid not null references public.branches(id),
  room_id               uuid not null,
  status                public.stay_status not null default 'in_house',
  check_in_at           timestamptz not null default now(),
  expected_check_out_at timestamptz not null,
  checked_out_at        timestamptz,
  business_date         date not null,                -- trigger điền
  nights                smallint not null,            -- trigger điền
  source_channel_id     uuid not null references public.source_channels(id),
  partner_id            uuid references public.partners(id),
  source_detail         text check (char_length(source_detail) <= 120),   -- mã đặt phòng OTA, tên người giới thiệu...
  entry_mode            public.entry_mode not null default 'live',
  tier_id               uuid references public.loyalty_tiers(id),     -- hạng của người đại diện lúc check-in (ảnh chụp)
  discount_pct          numeric(5, 2) not null default 0,             -- % giảm giá được hưởng lúc check-in (ảnh chụp, không đổi khi sửa cấu hình)
  discount_applied      boolean,                                      -- lễ tân xác nhận đã áp giảm giá trên ezCloud
  external_ref          text,                         -- mã booking ezCloud/OTA, dùng khi tích hợp
  note                  text check (char_length(note) <= 1000),
  cancel_reason         text,
  blacklist_ack_by      uuid references public.profiles(id),
  blacklist_ack_at      timestamptz,
  created_by            uuid not null references public.profiles(id),
  updated_by            uuid references public.profiles(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  foreign key (room_id, branch_id) references public.rooms(id, branch_id),   -- phòng phải thuộc cơ sở
  check (expected_check_out_at > check_in_at),
  check (checked_out_at is null or checked_out_at >= check_in_at),
  check (status <> 'checked_out' or checked_out_at is not null),
  check (status <> 'cancelled' or char_length(cancel_reason) >= 5)
);

-- Một phòng chỉ có 1 lượt "đang ở"
create unique index stays_one_in_house_per_room on public.stays(room_id) where status = 'in_house';
create index stays_branch_status_idx  on public.stays(branch_id, status);
create index stays_branch_checkin_idx on public.stays(branch_id, check_in_at desc);
create index stays_branch_bdate_idx   on public.stays(branch_id, business_date) where status <> 'cancelled';  -- báo cáo
create index stays_room_bdate_idx     on public.stays(room_id, business_date);
create index stays_channel_idx        on public.stays(source_channel_id);
create unique index stays_external_ref_uq on public.stays(branch_id, external_ref) where external_ref is not null;

create table public.stay_guests (
  stay_id    uuid not null references public.stays(id) on delete cascade,
  guest_id   uuid not null references public.guests(id),
  is_primary boolean not null default false,
  primary key (stay_id, guest_id)
);
create unique index stay_guests_one_primary on public.stay_guests(stay_id) where is_primary;
create index stay_guests_guest_idx on public.stay_guests(guest_id);

-- Tính ngày kinh doanh và số đêm theo giờ cắt đêm của cơ sở
create or replace function private.stays_compute()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_cutoff time;
begin
  select b.night_cutoff into v_cutoff from public.branches b where b.id = new.branch_id;
  new.business_date := ((new.check_in_at at time zone 'Asia/Ho_Chi_Minh') - (v_cutoff - time '00:00'))::date;
  new.nights := greatest(
    1,
    (coalesce(new.checked_out_at, new.expected_check_out_at) at time zone 'Asia/Ho_Chi_Minh')::date
      - new.business_date
  );
  return new;
end $$;

create trigger stays_compute before insert or update of check_in_at, expected_check_out_at, checked_out_at, branch_id
  on public.stays for each row execute function private.stays_compute();
create trigger stays_updated_at before update on public.stays
  for each row execute function private.set_updated_at();

-- Làm mới guest_stats cho danh sách khách
create or replace function private.refresh_guest_stats(p_guest_ids uuid[])
returns void language sql security definer set search_path = '' as $$
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
  left join public.stay_guests sg on sg.guest_id = g.id
  left join public.stays s        on s.id = sg.stay_id and s.status <> 'cancelled'
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

create or replace function private.stays_after_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.refresh_guest_stats(
    array(select sg.guest_id from public.stay_guests sg where sg.stay_id = new.id));
  return null;
end $$;

create trigger stays_after_change
  after update of status, nights, check_in_at, branch_id on public.stays
  for each row execute function private.stays_after_change();

create or replace function private.stay_guests_after_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.refresh_guest_stats(
    array_remove(array[
      case when tg_op in ('INSERT', 'UPDATE') then new.guest_id end,
      case when tg_op in ('DELETE', 'UPDATE') then old.guest_id end
    ], null));
  return null;
end $$;

create trigger stay_guests_after_change
  after insert or update or delete on public.stay_guests
  for each row execute function private.stay_guests_after_change();
