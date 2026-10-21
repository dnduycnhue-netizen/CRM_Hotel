-- 20261101000005_guest_extras.sql
create table public.guest_notes (
  id         uuid primary key default gen_random_uuid(),
  guest_id   uuid not null references public.guests(id) on delete cascade,
  branch_id  uuid references public.branches(id),        -- null = ghi chú toàn chuỗi (sales)
  kind       public.note_kind not null default 'general',
  body       text not null check (char_length(body) between 1 and 2000),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index guest_notes_guest_idx on public.guest_notes(guest_id, created_at desc) where deleted_at is null;

create table public.guest_flags (
  id             uuid primary key default gen_random_uuid(),
  guest_id       uuid not null references public.guests(id) on delete cascade,
  flag_type      public.flag_type not null,
  status         public.flag_status not null default 'proposed',
  reason         text not null check (char_length(reason) between 10 and 1000),
  evidence_paths text[] not null default '{}',             -- đường dẫn trong bucket Storage riêng tư
  branch_id      uuid not null references public.branches(id),
  proposed_by    uuid not null references public.profiles(id),
  proposed_at    timestamptz not null default now(),
  decided_by     uuid references public.profiles(id),
  decided_at     timestamptz,
  decision_note  text,
  removed_by     uuid references public.profiles(id),
  removed_at     timestamptz,
  removed_reason text,
  check (status <> 'removed' or char_length(removed_reason) >= 5)
);
create index guest_flags_active_idx on public.guest_flags(guest_id) where status in ('proposed', 'approved');

create table public.guest_consents (
  guest_id    uuid not null references public.guests(id) on delete cascade,
  channel     text not null check (channel in ('zalo', 'sms', 'email', 'phone')),
  granted     boolean not null,
  recorded_at timestamptz not null default now(),
  recorded_by uuid not null references public.profiles(id),
  source      text not null default 'front_desk',
  primary key (guest_id, channel)
);

-- Lịch sử thay đổi hạng (tự nâng khi check-in, gán tay)
create table public.guest_tier_events (
  id           bigint generated always as identity primary key,
  guest_id     uuid not null references public.guests(id) on delete cascade,
  from_tier_id uuid references public.loyalty_tiers(id),
  to_tier_id   uuid references public.loyalty_tiers(id),
  kind         text not null check (kind in ('auto_upgrade', 'manual')),
  stay_id      uuid references public.stays(id),
  actor_id     uuid references public.profiles(id),
  note         text,
  at           timestamptz not null default now()
);
create index guest_tier_events_guest_idx on public.guest_tier_events(guest_id, at desc);

create table public.merge_requests (
  id            uuid primary key default gen_random_uuid(),
  keep_guest_id uuid not null references public.guests(id),
  drop_guest_id uuid not null references public.guests(id),
  source        text not null check (source in ('system', 'user')),
  match_reason  text not null,                 -- 'same_name_dob' | 'cccd_one_digit' | 'same_phone' | 'manual'
  status        public.merge_status not null default 'pending',
  field_choices jsonb,                         -- {"full_name":"keep","phone":"drop",...}
  proposed_by   uuid references public.profiles(id),
  created_at    timestamptz not null default now(),
  decided_by    uuid references public.profiles(id),
  decided_at    timestamptz,
  check (keep_guest_id <> drop_guest_id)
);
create unique index merge_requests_pending_pair on public.merge_requests
  (least(keep_guest_id, drop_guest_id), greatest(keep_guest_id, drop_guest_id))
  where status = 'pending';
