-- Migration 20261101000039_sprint4_consent.sql
-- Module §4: Quản lý đồng ý nhận tin (consent)
-- Tuân thủ Nghị định 13/2023/NĐ-CP về Bảo vệ dữ liệu cá nhân:
-- 1. Thêm cột note cho guest_consents
-- 2. Tạo bảng append-only guest_consent_events lưu giữ lịch sử đồng ý / rút đồng ý
-- 3. Trigger tự động ghi nhận event từ guest_consents
-- 4. Cập nhật set_guest_consent nhận thêm p_note và ghi nhật ký
-- 5. RPC get_guest_consent_history
-- 6. Cập nhật get_guests_list lọc theo p_consent_channel
-- 7. Cập nhật export_guests lọc theo kênh và ẩn CCCD khi xuất danh sách marketing
-- 8. Kích hoạt is_available = true cho module 'consent'

-- 1. Bổ sung cột note cho bảng guest_consents
alter table public.guest_consents add column if not exists note text;

-- 2. Bảng append-only lưu vết lịch sử đồng ý / rút đồng ý
create table if not exists public.guest_consent_events (
  id           bigint generated always as identity primary key,
  guest_id     uuid not null references public.guests(id) on delete cascade,
  channel      text not null check (channel in ('zalo', 'sms', 'email', 'phone')),
  granted      boolean not null,
  source       text not null default 'front_desk',
  recorded_by  uuid references public.profiles(id),
  recorded_at  timestamptz not null default now(),
  note         text
);

create index if not exists guest_consent_events_guest_idx
  on public.guest_consent_events(guest_id, recorded_at desc);

-- RLS cho guest_consent_events
alter table public.guest_consent_events enable row level security;

drop policy if exists read_consent_events on public.guest_consent_events;
create policy read_consent_events on public.guest_consent_events
  for select to authenticated
  using (
    private.has_perm('guest.view_summary') or private.has_perm('consent.manage')
  );

-- 3. Trigger tự động ghi nhận event từ guest_consents
create or replace function private.trg_guest_consents_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_note text;
begin
  if (tg_op = 'INSERT') or (tg_op = 'UPDATE' and (old.granted is distinct from new.granted or old.source is distinct from new.source or old.note is distinct from new.note)) then
    v_note := coalesce(
      new.note,
      case
        when tg_op = 'INSERT' then (case when new.granted then 'Đồng ý nhận tin lần đầu' else 'Từ chối nhận tin' end)
        else (case when new.granted then 'Cấp lại đồng ý nhận tin' else 'Rút đồng ý nhận tin' end)
      end
    );

    insert into public.guest_consent_events (
      guest_id,
      channel,
      granted,
      source,
      recorded_by,
      recorded_at,
      note
    ) values (
      new.guest_id,
      new.channel,
      new.granted,
      new.source,
      new.recorded_by,
      new.recorded_at,
      v_note
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guest_consents_audit on public.guest_consents;
create trigger trg_guest_consents_audit
after insert or update on public.guest_consents
for each row
execute function private.trg_guest_consents_audit();

-- Di chuyển dữ liệu ban đầu từ guest_consents sang guest_consent_events nếu chưa có
insert into public.guest_consent_events (guest_id, channel, granted, source, recorded_by, recorded_at, note)
select c.guest_id, c.channel, c.granted, c.source, c.recorded_by, c.recorded_at, 'Dữ liệu đồng ý ban đầu'
from public.guest_consents c
where not exists (
  select 1 from public.guest_consent_events e
  where e.guest_id = c.guest_id and e.channel = c.channel
);

-- 4. Cập nhật RPC set_guest_consent nhận thêm p_note
drop function if exists public.set_guest_consent(uuid, text, boolean, text);
drop function if exists public.set_guest_consent(uuid, text, boolean, text, text);

create or replace function public.set_guest_consent(
  p_guest_id uuid,
  p_channel text,
  p_granted boolean,
  p_source text default 'front_desk',
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_src text := coalesce(p_source, 'front_desk');
begin
  perform private.assert_perm('consent.manage');

  if p_channel not in ('zalo', 'sms', 'email', 'phone') then
    raise exception 'Kênh liên lạc không hợp lệ (zalo, sms, email, phone)' using errcode = 'P0422';
  end if;

  insert into public.guest_consents (guest_id, channel, granted, recorded_at, recorded_by, source, note)
  values (p_guest_id, p_channel, p_granted, now(), v_uid, v_src, p_note)
  on conflict (guest_id, channel) do update
    set granted = excluded.granted,
        recorded_at = excluded.recorded_at,
        recorded_by = excluded.recorded_by,
        source = excluded.source,
        note = excluded.note;

  perform private.log_event(
    'consent.update',
    'guest_consents',
    null,
    null,
    jsonb_build_object(
      'guest_id', p_guest_id,
      'channel', p_channel,
      'granted', p_granted,
      'source', v_src,
      'note', p_note
    )
  );
end $$;

grant execute on function public.set_guest_consent(uuid, text, boolean, text, text) to authenticated;

-- 5. RPC get_guest_consent_history
create or replace function public.get_guest_consent_history(p_guest_id uuid)
returns table (
  id bigint,
  channel text,
  granted boolean,
  source text,
  recorded_by uuid,
  recorded_by_name text,
  recorded_at timestamptz,
  note text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_perm('guest.view_summary');

  return query
  select
    e.id,
    e.channel,
    e.granted,
    e.source,
    e.recorded_by,
    p.full_name as recorded_by_name,
    e.recorded_at,
    e.note
  from public.guest_consent_events e
  left join public.profiles p on p.id = e.recorded_by
  where e.guest_id = p_guest_id
  order by e.recorded_at desc, e.id desc;
end;
$$;

grant execute on function public.get_guest_consent_history(uuid) to authenticated;

-- 6. Cập nhật RPC get_guests_list hỗ trợ tham số p_consent_channel
drop function if exists public.get_guests_list(integer, uuid, text, uuid);
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
    )
  order by g.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
end $function$;

grant execute on function public.get_guests_list(integer, uuid, text, uuid, text) to authenticated;

-- 7. Cập nhật RPC export_guests hỗ trợ p_consent_channel
drop function if exists public.export_guests(text, int);
drop function if exists public.export_guests(text, int, text);

create or replace function public.export_guests(
  p_reason text,
  p_limit int default 500,
  p_consent_channel text default null::text
)
returns table (
  id uuid,
  full_name text,
  gender text,
  dob date,
  phone text,
  email text,
  nationality text,
  tags text[],
  sales_name text,
  total_stays int,
  total_nights int,
  doc_number text,
  is_full boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_has_full boolean;
  v_limit int;
begin
  -- 1. Kiểm tra quyền export
  perform private.assert_perm('guest.export');

  -- 2. Kiểm tra lý do xuất file
  if length(trim(coalesce(p_reason, ''))) < 3 then
    raise exception 'Cần nhập lý do xuất dữ liệu khách hàng (tối thiểu 3 ký tự)' using errcode = 'P0400';
  end if;

  v_has_full := private.has_perm('guest.export_full');
  v_limit := least(greatest(coalesce(p_limit, 500), 1), 2000);

  -- 3. Ghi log kiểm toán
  perform private.log_event(
    'guest.export_excel',
    'guests',
    null,
    null,
    jsonb_build_object(
      'reason', p_reason,
      'has_full_perm', v_has_full,
      'requested_limit', v_limit,
      'consent_channel', p_consent_channel
    )
  );

  -- 4. Trả về bảng dữ liệu
  -- LƯU Ý BẢO MẬT: Khi lọc xuất danh sách đồng ý kênh truyền thông (Zalo/SMS/Email/Phone),
  -- TUYỆT ĐỐI không xuất số giấy tờ CCCD/Passport (doc_number luôn null) theo nguyên tắc tối thiểu dữ liệu
  return query
  select
    g.id,
    g.full_name,
    g.gender::text,
    case when p_consent_channel is not null then null::date else g.dob end as dob,
    case
      when v_has_full then g.phone
      when length(g.phone) >= 7 then overlay(g.phone placing '****' from 4 for 4)
      else g.phone
    end as phone,
    g.email,
    g.nationality::text,
    g.tags,
    p.full_name as sales_name,
    coalesce(gs.total_stays, 0) as total_stays,
    coalesce(gs.total_nights, 0) as total_nights,
    case
      when p_consent_channel is not null then null::text
      when v_has_full then d.doc_number
      else private.mask_doc(d.doc_number)
    end as doc_number,
    (v_has_full and p_consent_channel is null) as is_full
  from public.guests g
  left join public.profiles p on p.id = g.sales_owner_id
  left join public.guest_stats gs on gs.guest_id = g.id
  left join lateral (
    select gd.doc_number
    from public.guest_documents gd
    where gd.guest_id = g.id
    order by (gd.doc_type = 'cccd') desc, gd.created_at desc
    limit 1
  ) d on true
  where g.merged_into is null
    and (
      p_consent_channel is null
      or exists (
        select 1 from public.guest_consents gc
        where gc.guest_id = g.id
          and gc.channel = p_consent_channel
          and gc.granted = true
      )
    )
  order by gs.total_stays desc nulls last, g.created_at desc
  limit v_limit;
end;
$$;

grant execute on function public.export_guests(text, int, text) to authenticated;

-- 8. Kích hoạt module consent trong danh mục
update public.modules
set is_available = true
where key = 'consent';
