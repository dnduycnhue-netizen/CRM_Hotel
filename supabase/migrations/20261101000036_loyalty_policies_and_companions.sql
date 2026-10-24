-- 20261101000036_loyalty_policies_and_companions.sql
-- Sprint 2: §3 Chính sách hạng theo mùa/năm + §2 Người đi cùng có lựa chọn tích lũy hạng

create extension if not exists btree_gist;

-- 1. Bảng loyalty_policies: chính sách hạng theo mùa/năm
create table if not exists public.loyalty_policies (
  id                       uuid primary key default gen_random_uuid(),
  name                     text not null check (char_length(name) between 2 and 100),
  valid_from               date not null,
  valid_to                 date,
  basis                    text not null check (basis in ('stays', 'nights')) default 'stays',
  window_months            int not null default 24 check (window_months between 0 and 120),
  count_current_stay       boolean not null default false,
  companions_count_default boolean not null default true,
  status                   text not null check (status in ('draft', 'active', 'archived')) default 'draft',
  note                     text check (char_length(note) <= 1000),
  created_by               uuid references public.profiles(id),
  approved_by              uuid references public.profiles(id),
  approved_at              timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  check (valid_to is null or valid_to >= valid_from),
  constraint loyalty_policies_no_overlap exclude using gist (
    daterange(valid_from, coalesce(valid_to, 'infinity'::date), '[]') with &&
  ) where (status = 'active')
);

drop trigger if exists loyalty_policies_updated_at on public.loyalty_policies;
create trigger loyalty_policies_updated_at before update on public.loyalty_policies
  for each row execute function private.set_updated_at();

alter table public.loyalty_policies enable row level security;
drop policy if exists read_policies on public.loyalty_policies;
create policy read_policies on public.loyalty_policies for select to authenticated using (true);


-- 2. Cột counts_for_loyalty trên stay_guests
alter table public.stay_guests add column if not exists counts_for_loyalty boolean not null default true;
alter table public.stay_guests drop constraint if exists stay_guests_primary_loyalty_chk;
alter table public.stay_guests add constraint stay_guests_primary_loyalty_chk check (is_primary = false or counts_for_loyalty = true);
update public.stay_guests set counts_for_loyalty = true where is_primary = true;

-- 3. Cột policy_id trên loyalty_tiers
alter table public.loyalty_tiers add column if not exists policy_id uuid references public.loyalty_policies(id) on delete cascade;

-- Tạo chính sách mặc định ban đầu nếu chưa có chính sách active nào
do $$
declare
  v_default_policy_id uuid;
  v_rules jsonb;
begin
  select id into v_default_policy_id from public.loyalty_policies where status = 'active' limit 1;

  if v_default_policy_id is null then
    select value into v_rules from public.app_settings where key = 'loyalty.rules';

    insert into public.loyalty_policies (
      name, valid_from, valid_to, basis, window_months, count_current_stay, companions_count_default, status, note
    ) values (
      'Chính sách mặc định (2020 - 2026)',
      '2020-01-01',
      null,
      coalesce(v_rules ->> 'basis', 'stays'),
      coalesce((v_rules ->> 'window_months')::int, 24),
      coalesce((v_rules ->> 'count_current_stay')::boolean, false),
      true,
      'active',
      'Chính sách khởi tạo hệ thống từ cấu hình ban đầu'
    )
    returning id into v_default_policy_id;
  end if;

  update public.loyalty_tiers set policy_id = v_default_policy_id where policy_id is null;
end $$;

alter table public.loyalty_tiers alter column policy_id set not null;

-- Đổi ràng buộc duy nhất trên loyalty_tiers theo từng policy_id
alter table public.loyalty_tiers drop constraint if exists loyalty_tiers_code_key;
drop index if exists public.loyalty_tiers_threshold_uq;
create unique index if not exists loyalty_tiers_policy_code_uq on public.loyalty_tiers(policy_id, code);
create unique index if not exists loyalty_tiers_policy_min_value_uq on public.loyalty_tiers(policy_id, min_value);

-- 4. Bổ sung policy_id vào guest_tier_events
alter table public.guest_tier_events add column if not exists policy_id uuid references public.loyalty_policies(id);
update public.guest_tier_events e
set policy_id = (select policy_id from public.loyalty_tiers where id = coalesce(e.to_tier_id, e.from_tier_id))
where policy_id is null;

-- 5. Bổ sung cột chốt hạng lúc check-in trên stays
alter table public.stays add column if not exists tier_id_at_checkin uuid references public.loyalty_tiers(id);
alter table public.stays add column if not exists policy_id_at_checkin uuid references public.loyalty_policies(id);
update public.stays s
set tier_id_at_checkin = s.tier_id,
    policy_id_at_checkin = (select policy_id from public.loyalty_tiers where id = s.tier_id)
where s.tier_id is not null and s.tier_id_at_checkin is null;

-- 6. Bổ sung tier_override_code trên guests
alter table public.guests add column if not exists tier_override_code text;
update public.guests g
set tier_override_code = (select code from public.loyalty_tiers where id = g.tier_override_id)
where g.tier_override_id is not null and g.tier_override_code is null;

-- 7. Cập nhật private.refresh_guest_stats chỉ đếm khi counts_for_loyalty = true
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
  left join public.stay_guests sg on sg.guest_id = g.id and sg.counts_for_loyalty = true
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

-- 8. Hàm tìm chính sách hạng active tại ngày bất kỳ
create or replace function private.active_loyalty_policy(
  p_date date default (now() at time zone 'Asia/Ho_Chi_Minh')::date
)
returns public.loyalty_policies language plpgsql stable security definer set search_path = '' as $$
declare
  v_rec public.loyalty_policies;
begin
  select * into v_rec from public.loyalty_policies
  where status = 'active'
    and p_date >= valid_from
    and (valid_to is null or p_date <= valid_to)
  order by valid_from desc
  limit 1;

  if v_rec.id is null then
    select * into v_rec from public.loyalty_policies
    where status = 'active'
    order by valid_from desc
    limit 1;
  end if;

  return v_rec;
end $$;

-- 9. Hàm tính giá trị tích luỹ hạng theo chính sách hiệu lực và counts_for_loyalty = true
create or replace function private.guest_loyalty_value(
  p_guest_id uuid,
  p_exclude uuid default null,
  p_date date default null
)
returns int language plpgsql stable security definer set search_path = '' as $$
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
  join public.stays s on s.id = sg.stay_id and s.status <> 'cancelled'
  where sg.guest_id = p_guest_id
    and sg.counts_for_loyalty = true
    and (p_exclude is null or s.id <> p_exclude)
    and (v_policy.window_months = 0
         or s.business_date > v_date - make_interval(months => v_policy.window_months));

  return coalesce(v_val, 0);
end $$;

-- 10. Hàm tính hạng khách: private.guest_tier
create or replace function private.guest_tier(
  p_guest_id uuid,
  p_exclude uuid default null,
  p_date date default null
)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_date date := coalesce(p_date, (now() at time zone 'Asia/Ho_Chi_Minh')::date);
  v_policy public.loyalty_policies;
  v_val int;
  v_earned record;
  v_manual record;
  v_best record;
  v_nxt record;
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
  select id, code, name, min_value, discount_pct, benefits, color, 'earned' as source
    into v_earned
  from public.loyalty_tiers
  where policy_id = v_policy.id
    and is_active
    and min_value <= v_val
  order by min_value desc
  limit 1;

  -- Hạng gán tay (kiểm tra theo code để ổn định qua các mùa)
  select coalesce(g.tier_override_code, (select code from public.loyalty_tiers where id = g.tier_override_id)),
         g.tier_override_until
    into v_override_code, v_override_until
  from public.guests g
  where g.id = p_guest_id;

  if v_override_code is not null and (v_override_until is null or v_override_until >= v_date) then
    select id, code, name, min_value, discount_pct, benefits, color, 'manual' as source
      into v_manual
    from public.loyalty_tiers
    where policy_id = v_policy.id
      and is_active
      and code = v_override_code
    limit 1;
  end if;

  -- Chọn hạng cao nhất giữa tích lũy và gán tay
  if v_manual.id is not null and (v_earned.id is null or v_manual.min_value >= v_earned.min_value) then
    v_best := v_manual;
  else
    v_best := v_earned;
  end if;

  -- Hạng kế tiếp
  select id, code, name, min_value, discount_pct
    into v_nxt
  from public.loyalty_tiers
  where policy_id = v_policy.id
    and is_active
    and min_value > v_val
  order by min_value asc
  limit 1;

  return jsonb_build_object(
    'policy_id', v_policy.id,
    'policy_name', v_policy.name,
    'tier_id', v_best.id,
    'tier', v_best.code,
    'name', v_best.name,
    'discount_pct', coalesce(v_best.discount_pct, 0),
    'benefits', v_best.benefits,
    'color', v_best.color,
    'source', coalesce(v_best.source, 'earned'),
    'value', v_val,
    'basis', v_policy.basis,
    'next', case when v_nxt.id is not null then
      jsonb_build_object(
        'name', v_nxt.name,
        'remaining', v_nxt.min_value - v_val,
        'discount_pct', v_nxt.discount_pct
      ) else null end
  );
end $$;

-- Overload tiện lợi
create or replace function private.guest_tier_at(
  p_guest_id uuid,
  p_date date,
  p_exclude uuid default null
)
returns jsonb language sql stable security definer set search_path = '' as $$
  select private.guest_tier(p_guest_id, p_exclude, p_date);
$$;

-- 11. Gán / gỡ hạng thủ công (hỗ trợ p_tier_code)
create or replace function public.set_guest_tier_override(
  p_guest_id uuid,
  p_tier_id uuid default null,
  p_reason text default null,
  p_until date default null,
  p_tier_code text default null
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_before jsonb := private.guest_tier(p_guest_id);
  v_code text := p_tier_code;
  v_tier_id uuid := p_tier_id;
  v_policy public.loyalty_policies;
begin
  perform private.assert_perm('loyalty.override');

  if v_code is null and v_tier_id is not null then
    select code into v_code from public.loyalty_tiers where id = v_tier_id;
  end if;

  v_policy := private.active_loyalty_policy();

  if v_code is not null then
    if char_length(btrim(coalesce(p_reason, ''))) < 5 then
      raise exception 'reason required' using errcode = 'P0422';
    end if;

    select id into v_tier_id from public.loyalty_tiers
    where policy_id = v_policy.id and code = v_code limit 1;
  else
    v_tier_id := null;
  end if;

  update public.guests
     set tier_override_id = v_tier_id,
         tier_override_code = v_code,
         tier_override_until = p_until,
         tier_override_reason = nullif(btrim(p_reason), ''),
         tier_override_by = (select auth.uid())
   where id = p_guest_id and merged_into is null;
  if not found then raise exception 'guest not found' using errcode = 'P0404'; end if;

  insert into public.guest_tier_events (guest_id, from_tier_id, to_tier_id, kind, actor_id, note, policy_id)
  values (
    p_guest_id,
    (v_before ->> 'tier_id')::uuid,
    v_tier_id,
    'manual',
    (select auth.uid()),
    p_reason,
    v_policy.id
  );

  return private.guest_tier(p_guest_id);
end $$;

-- 12. RPCs Quản lý Chính sách Hạng (perm 'loyalty.configure')
create or replace function public.upsert_loyalty_policy(p jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  v_name text := btrim(coalesce(p ->> 'name', ''));
  v_from date := (p ->> 'valid_from')::date;
  v_to date := nullif(p ->> 'valid_to', '')::date;
  v_basis text := coalesce(p ->> 'basis', 'stays');
  v_window int := coalesce((p ->> 'window_months')::int, 24);
  v_cur_stay boolean := coalesce((p ->> 'count_current_stay')::boolean, false);
  v_comp_def boolean := coalesce((p ->> 'companions_count_default')::boolean, true);
  v_note text := nullif(btrim(coalesce(p ->> 'note', '')), '');
  v_cur public.loyalty_policies;
  v_res public.loyalty_policies;
begin
  perform private.assert_perm('loyalty.configure');

  if char_length(v_name) < 2 or char_length(v_name) > 100 then
    raise exception 'invalid policy name' using errcode = 'P0422';
  end if;
  if v_basis not in ('stays', 'nights') then
    raise exception 'invalid basis' using errcode = 'P0422';
  end if;
  if v_window < 0 or v_window > 120 then
    raise exception 'invalid window months' using errcode = 'P0422';
  end if;
  if v_from is null then
    raise exception 'valid_from required' using errcode = 'P0422';
  end if;
  if v_to is not null and v_to < v_from then
    raise exception 'valid_to must be after valid_from' using errcode = 'P0422';
  end if;

  if v_id is not null then
    select * into v_cur from public.loyalty_policies where id = v_id;
    if v_cur.id is null then
      raise exception 'policy not found' using errcode = 'P0404';
    end if;

    if v_cur.status = 'archived' then
      raise exception 'cannot edit archived policy' using errcode = 'P0422';
    elsif v_cur.status = 'active' then
      -- Chỉ được sửa name, note, valid_to (rút ngắn, không lùi về quá khứ)
      if v_to is not null and v_to < (now() at time zone 'Asia/Ho_Chi_Minh')::date then
        raise exception 'valid_to cannot be in the past' using errcode = 'P0422';
      end if;
      update public.loyalty_policies
         set name = v_name,
             note = v_note,
             valid_to = v_to,
             companions_count_default = v_comp_def,
             updated_at = now()
       where id = v_id
       returning * into v_res;
    else
      -- Draft: sửa toàn bộ
      update public.loyalty_policies
         set name = v_name,
             valid_from = v_from,
             valid_to = v_to,
             basis = v_basis,
             window_months = v_window,
             count_current_stay = v_cur_stay,
             companions_count_default = v_comp_def,
             note = v_note,
             updated_at = now()
       where id = v_id
       returning * into v_res;
    end if;
  else
    insert into public.loyalty_policies (
      name, valid_from, valid_to, basis, window_months, count_current_stay, companions_count_default,
      status, note, created_by
    ) values (
      v_name, v_from, v_to, v_basis, v_window, v_cur_stay, v_comp_def,
      'draft', v_note, (select auth.uid())
    )
    returning * into v_res;
  end if;

  return to_jsonb(v_res);
end $$;

-- Upsert tier trong chính sách draft
create or replace function public.upsert_loyalty_tier(p jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  v_policy_id uuid := (p ->> 'policy_id')::uuid;
  v_code text := lower(btrim(coalesce(p ->> 'code', '')));
  v_name text := btrim(coalesce(p ->> 'name', ''));
  v_min int := (p ->> 'min_value')::int;
  v_disc numeric(5, 2) := coalesce((p ->> 'discount_pct')::numeric, 0);
  v_benefits text := nullif(btrim(coalesce(p ->> 'benefits', '')), '');
  v_color text := coalesce(nullif(btrim(p ->> 'color'), ''), '#64748B');
  v_sort int := coalesce((p ->> 'sort')::int, 0);
  v_policy public.loyalty_policies;
  v_res public.loyalty_tiers;
begin
  perform private.assert_perm('loyalty.configure');

  select * into v_policy from public.loyalty_policies where id = v_policy_id;
  if v_policy.id is null then raise exception 'policy not found' using errcode = 'P0404'; end if;
  if v_policy.status <> 'draft' then
    raise exception 'tiers can only be edited on draft policies' using errcode = 'P0422';
  end if;

  if v_code !~ '^[a-z0-9_]{2,30}$' then raise exception 'invalid tier code' using errcode = 'P0422'; end if;
  if char_length(v_name) < 2 or char_length(v_name) > 40 then raise exception 'invalid tier name' using errcode = 'P0422'; end if;
  if v_min < 0 then raise exception 'min_value must be >= 0' using errcode = 'P0422'; end if;
  if v_disc < 0 or v_disc > 100 then raise exception 'discount_pct must be between 0 and 100' using errcode = 'P0422'; end if;

  if v_id is not null then
    update public.loyalty_tiers
       set code = v_code, name = v_name, min_value = v_min, discount_pct = v_disc,
           benefits = v_benefits, color = v_color, sort = v_sort, updated_at = now()
     where id = v_id and policy_id = v_policy_id
     returning * into v_res;
  else
    insert into public.loyalty_tiers (
      policy_id, code, name, min_value, discount_pct, benefits, color, sort, is_active
    ) values (
      v_policy_id, v_code, v_name, v_min, v_disc, v_benefits, v_color, v_sort, true
    )
    returning * into v_res;
  end if;

  return to_jsonb(v_res);
end $$;

-- Xóa tier trong chính sách draft
create or replace function public.delete_loyalty_tier(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_policy_id uuid;
  v_status text;
  v_count int;
begin
  perform private.assert_perm('loyalty.configure');

  select t.policy_id, p.status into v_policy_id, v_status
  from public.loyalty_tiers t
  join public.loyalty_policies p on p.id = t.policy_id
  where t.id = p_id;

  if v_policy_id is null then raise exception 'tier not found' using errcode = 'P0404'; end if;
  if v_status <> 'draft' then raise exception 'can only delete tiers from draft policy' using errcode = 'P0422'; end if;

  select count(*) into v_count from public.loyalty_tiers where policy_id = v_policy_id;
  if v_count <= 1 then
    raise exception 'policy must have at least one tier' using errcode = 'P0422';
  end if;

  delete from public.loyalty_tiers where id = p_id;
end $$;

-- Nhân bản chính sách sang bản nháp mới
create or replace function public.clone_loyalty_policy(
  p_from_id uuid,
  p_name text,
  p_valid_from date
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_src public.loyalty_policies;
  v_new_id uuid;
begin
  perform private.assert_perm('loyalty.configure');

  select * into v_src from public.loyalty_policies where id = p_from_id;
  if v_src.id is null then raise exception 'source policy not found' using errcode = 'P0404'; end if;
  if char_length(btrim(coalesce(p_name, ''))) < 2 then raise exception 'invalid name' using errcode = 'P0422'; end if;
  if p_valid_from is null then raise exception 'valid_from required' using errcode = 'P0422'; end if;

  insert into public.loyalty_policies (
    name, valid_from, valid_to, basis, window_months, count_current_stay, companions_count_default,
    status, note, created_by
  ) values (
    btrim(p_name), p_valid_from, null, v_src.basis, v_src.window_months,
    v_src.count_current_stay, v_src.companions_count_default,
    'draft', 'Nhân bản từ ' || v_src.name, (select auth.uid())
  )
  returning id into v_new_id;

  insert into public.loyalty_tiers (policy_id, code, name, min_value, discount_pct, benefits, color, sort, is_active)
  select v_new_id, code, name, min_value, discount_pct, benefits, color, sort, is_active
  from public.loyalty_tiers
  where policy_id = p_from_id;

  return v_new_id;
end $$;

-- Xem trước ảnh hưởng của chính sách
create or replace function public.preview_loyalty_policy(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_pol public.loyalty_policies;
  v_tiers_cnt int;
  v_cur_active public.loyalty_policies;
  v_total int := 0;
  v_upgrades int := 0;
  v_downgrades int := 0;
  v_unchanged int := 0;
  v_counts jsonb := '{}'::jsonb;
  r record;
  v_cur_tier jsonb;
  v_cand_val int;
  v_cand_tier record;
  v_cand_min int;
  v_cur_min int;
begin
  select * into v_pol from public.loyalty_policies where id = p_id;
  if v_pol.id is null then raise exception 'policy not found' using errcode = 'P0404'; end if;

  select count(*) into v_tiers_cnt from public.loyalty_tiers where policy_id = p_id and is_active;
  if v_tiers_cnt = 0 then
    return jsonb_build_object(
      'error', 'Chính sách chưa có hạng nào',
      'total_guests', 0, 'upgrades', 0, 'downgrades', 0, 'unchanged', 0, 'counts_by_tier', '{}'::jsonb
    );
  end if;

  v_cur_active := private.active_loyalty_policy();

  for r in (
    select g.id as guest_id,
           coalesce(g.tier_override_code, (select code from public.loyalty_tiers where id = g.tier_override_id)) as override_code,
           g.tier_override_until
    from public.guests g
    where g.merged_into is null
      and exists (select 1 from public.stay_guests sg where sg.guest_id = g.id and sg.counts_for_loyalty = true)
    limit 1000
  ) loop
    v_total := v_total + 1;
    v_cur_tier := private.guest_tier(r.guest_id);
    v_cur_min := coalesce((select min_value from public.loyalty_tiers where id = (v_cur_tier ->> 'tier_id')::uuid), 0);

    -- Tính giá trị ứng viên
    select coalesce(case when v_pol.basis = 'nights' then sum(s.nights) else count(*) end, 0)::int
      into v_cand_val
    from public.stay_guests sg
    join public.stays s on s.id = sg.stay_id and s.status <> 'cancelled'
    where sg.guest_id = r.guest_id
      and sg.counts_for_loyalty = true
      and (v_pol.window_months = 0
           or s.business_date > v_pol.valid_from - make_interval(months => v_pol.window_months));

    -- Hạng ứng viên theo ngưỡng
    select id, code, min_value into v_cand_tier
    from public.loyalty_tiers
    where policy_id = p_id and is_active and min_value <= v_cand_val
    order by min_value desc limit 1;

    -- Kiểm tra override
    if r.override_code is not null and (r.tier_override_until is null or r.tier_override_until >= v_pol.valid_from) then
      select id, code, min_value into v_cand_tier
      from public.loyalty_tiers
      where policy_id = p_id and is_active and code = r.override_code
        and min_value >= coalesce(v_cand_tier.min_value, 0)
      limit 1;
    end if;

    v_cand_min := coalesce(v_cand_tier.min_value, 0);

    if v_cand_min > v_cur_min then
      v_upgrades := v_upgrades + 1;
    elsif v_cand_min < v_cur_min then
      v_downgrades := v_downgrades + 1;
    else
      v_unchanged := v_unchanged + 1;
    end if;

    if v_cand_tier.code is not null then
      v_counts := jsonb_set(
        v_counts,
        array[v_cand_tier.code],
        to_jsonb(coalesce((v_counts ->> v_cand_tier.code)::int, 0) + 1)
      );
    end if;
  end loop;

  return jsonb_build_object(
    'total_guests', v_total,
    'upgrades', v_upgrades,
    'downgrades', v_downgrades,
    'unchanged', v_unchanged,
    'counts_by_tier', v_counts
  );
end $$;

-- Kích hoạt chính sách
create or replace function public.activate_loyalty_policy(p_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_pol public.loyalty_policies;
  v_tiers_cnt int;
  v_has_zero boolean;
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  r record;
  v_new_tier jsonb;
  v_prev_tier_id uuid;
begin
  perform private.assert_perm('loyalty.configure');

  select * into v_pol from public.loyalty_policies where id = p_id;
  if v_pol.id is null then raise exception 'policy not found' using errcode = 'P0404'; end if;
  if v_pol.status <> 'draft' then raise exception 'only draft policies can be activated' using errcode = 'P0422'; end if;

  select count(*), bool_or(min_value = 0) into v_tiers_cnt, v_has_zero
  from public.loyalty_tiers where policy_id = p_id and is_active;

  if coalesce(v_tiers_cnt, 0) = 0 then
    raise exception 'policy must have at least one active tier' using errcode = 'P0422';
  end if;
  if not coalesce(v_has_zero, false) then
    raise exception 'policy must have a baseline tier with min_value = 0' using errcode = 'P0422';
  end if;

  if v_pol.valid_from < v_today then
    raise exception 'cannot activate policy in the past' using errcode = 'P0422';
  end if;

  -- Đóng chính sách active trước đó nếu nó đang kéo dài (valid_to is null hoặc valid_to >= valid_from)
  update public.loyalty_policies
     set valid_to = v_pol.valid_from - interval '1 day',
         updated_at = now()
   where status = 'active'
     and valid_from < v_pol.valid_from
     and (valid_to is null or valid_to >= v_pol.valid_from);

  -- Đổi trạng thái sang active
  update public.loyalty_policies
     set status = 'active',
         approved_by = (select auth.uid()),
         approved_at = now(),
         updated_at = now()
   where id = p_id;

  -- Nếu có hiệu lực ngay hôm nay: tính lại hạng cho khách
  if v_pol.valid_from = v_today then
    for r in (
      select g.id as guest_id
      from public.guests g
      where g.merged_into is null
        and exists (select 1 from public.stay_guests sg where sg.guest_id = g.id and sg.counts_for_loyalty = true)
    ) loop
      v_new_tier := private.guest_tier(r.guest_id);
      select to_tier_id into v_prev_tier_id
      from public.guest_tier_events
      where guest_id = r.guest_id
      order by at desc, id desc limit 1;

      if (v_new_tier ->> 'tier_id')::uuid is distinct from v_prev_tier_id then
        insert into public.guest_tier_events (guest_id, from_tier_id, to_tier_id, kind, actor_id, note, policy_id)
        values (
          r.guest_id,
          v_prev_tier_id,
          (v_new_tier ->> 'tier_id')::uuid,
          'auto_upgrade',
          (select auth.uid()),
          'Kích hoạt chính sách ' || v_pol.name,
          p_id
        );
      end if;
    end loop;
  end if;

  insert into public.audit_logs (actor_id, action, target_type, target_id, after)
  values ((select auth.uid()), 'activate', 'loyalty_policy', p_id, jsonb_build_object('name', v_pol.name, 'valid_from', v_pol.valid_from));

  return (select to_jsonb(p) from public.loyalty_policies p where p.id = p_id);
end $$;

-- Lưu trữ chính sách đã hết hạn
create or replace function public.archive_loyalty_policy(p_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_pol public.loyalty_policies;
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
begin
  perform private.assert_perm('loyalty.configure');

  select * into v_pol from public.loyalty_policies where id = p_id;
  if v_pol.id is null then raise exception 'policy not found' using errcode = 'P0404'; end if;
  if v_pol.valid_to is null or v_pol.valid_to >= v_today then
    raise exception 'only expired policies can be archived' using errcode = 'P0422';
  end if;

  update public.loyalty_policies
     set status = 'archived', updated_at = now()
   where id = p_id;

  return (select to_jsonb(p) from public.loyalty_policies p where p.id = p_id);
end $$;

-- 13. RPCs Người đi cùng (Companions)
create or replace function public.add_stay_companion(p_stay_id uuid, p_guest jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_branch uuid;
  v_status public.stay_status;
  v_out timestamptz;
  v_upd timestamptz;
  v_count int;
  v_gid uuid;
  v_policy public.loyalty_policies;
  v_counts boolean;
  v_can_update boolean;
begin
  select branch_id, status, checked_out_at, updated_at
    into v_branch, v_status, v_out, v_upd
  from public.stays where id = p_stay_id;

  if v_branch is null then raise exception 'stay not found' using errcode = 'P0404'; end if;
  perform private.assert_perm_at('companion.manage', v_branch);
  perform private.assert_module(v_branch, 'companions');

  if v_status in ('checked_out', 'cancelled') then
    if coalesce(v_out, v_upd) < now() - interval '24 hours' then
      raise exception 'stay is closed' using errcode = 'P0422';
    end if;
  end if;

  select count(*) into v_count from public.stay_guests where stay_id = p_stay_id;
  if v_count >= 11 then
    raise exception 'maximum 10 companions per stay' using errcode = 'P0422';
  end if;

  v_can_update := private.has_perm('guest.update', v_branch);
  v_gid := private.upsert_guest(p_guest, false, v_can_update);

  if exists (select 1 from public.stay_guests where stay_id = p_stay_id and guest_id = v_gid) then
    raise exception 'guest already in stay' using errcode = 'P0422';
  end if;

  v_policy := private.active_loyalty_policy();
  if p_guest ? 'counts_for_loyalty' then
    v_counts := (p_guest ->> 'counts_for_loyalty')::boolean;
  else
    v_counts := coalesce(v_policy.companions_count_default, true);
  end if;

  insert into public.stay_guests (stay_id, guest_id, is_primary, counts_for_loyalty)
  values (p_stay_id, v_gid, false, coalesce(v_counts, true));

  insert into public.audit_logs (branch_id, actor_id, action, target_type, target_id, after)
  values (v_branch, (select auth.uid()), 'add_companion', 'stay', p_stay_id, jsonb_build_object('guest_id', v_gid, 'counts_for_loyalty', v_counts));

  return jsonb_build_object('guest_id', v_gid, 'stay_id', p_stay_id, 'counts_for_loyalty', v_counts);
end $$;

create or replace function public.remove_stay_companion(p_stay_id uuid, p_guest_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_branch uuid;
  v_bdate date;
  v_cutoff time;
  v_today_bdate date;
  v_is_primary boolean;
begin
  select s.branch_id, s.business_date, b.night_cutoff
    into v_branch, v_bdate, v_cutoff
  from public.stays s
  join public.branches b on b.id = s.branch_id
  where s.id = p_stay_id;

  if v_branch is null then raise exception 'stay not found' using errcode = 'P0404'; end if;
  perform private.assert_perm_at('companion.manage', v_branch);

  v_today_bdate := ((now() at time zone 'Asia/Ho_Chi_Minh') - (v_cutoff - time '00:00'))::date;
  if v_bdate <> v_today_bdate then
    raise exception 'companion can only be removed on check-in day' using errcode = 'P0422';
  end if;

  select is_primary into v_is_primary from public.stay_guests where stay_id = p_stay_id and guest_id = p_guest_id;
  if v_is_primary is null then raise exception 'companion not in stay' using errcode = 'P0404'; end if;
  if v_is_primary then raise exception 'cannot remove primary guest' using errcode = 'P0422'; end if;

  delete from public.stay_guests where stay_id = p_stay_id and guest_id = p_guest_id;

  insert into public.audit_logs (branch_id, actor_id, action, target_type, target_id, before)
  values (v_branch, (select auth.uid()), 'remove_companion', 'stay', p_stay_id, jsonb_build_object('guest_id', p_guest_id));
end $$;

create or replace function public.set_companion_loyalty(
  p_stay_id uuid,
  p_guest_id uuid,
  p_counts boolean
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_stay public.stays;
  v_is_primary boolean;
  v_cur_tier jsonb;
  v_last_tier_id uuid;
begin
  select * into v_stay from public.stays where id = p_stay_id;
  if v_stay.id is null then raise exception 'stay not found' using errcode = 'P0404'; end if;

  perform private.assert_perm_at('companion.manage', v_stay.branch_id);

  if v_stay.status = 'checked_out' and v_stay.checked_out_at < now() - interval '7 days' then
    perform private.assert_perm('loyalty.override');
  end if;

  select is_primary into v_is_primary from public.stay_guests where stay_id = p_stay_id and guest_id = p_guest_id;
  if v_is_primary is null then raise exception 'guest not found in stay' using errcode = 'P0404'; end if;
  if v_is_primary and not p_counts then
    raise exception 'primary guest must always count for loyalty' using errcode = 'P0422';
  end if;

  update public.stay_guests
     set counts_for_loyalty = p_counts
   where stay_id = p_stay_id and guest_id = p_guest_id;

  insert into public.audit_logs (branch_id, actor_id, action, target_type, target_id, after)
  values (v_stay.branch_id, (select auth.uid()), 'set_companion_loyalty', 'stay', p_stay_id,
          jsonb_build_object('guest_id', p_guest_id, 'counts_for_loyalty', p_counts));

  perform private.refresh_guest_stats(array[p_guest_id]);

  v_cur_tier := private.guest_tier(p_guest_id);
  select to_tier_id into v_last_tier_id
  from public.guest_tier_events
  where guest_id = p_guest_id
  order by at desc, id desc limit 1;

  if (v_cur_tier ->> 'tier_id')::uuid is distinct from v_last_tier_id then
    insert into public.guest_tier_events (guest_id, from_tier_id, to_tier_id, kind, stay_id, actor_id, note, policy_id)
    values (
      p_guest_id,
      v_last_tier_id,
      (v_cur_tier ->> 'tier_id')::uuid,
      'auto_upgrade',
      p_stay_id,
      (select auth.uid()),
      'Cập nhật tích lũy người đi cùng',
      (v_cur_tier ->> 'policy_id')::uuid
    );
  end if;

  return v_cur_tier;
end $$;

-- 14. Cập nhật check_in_guest lưu tier_id_at_checkin, policy_id_at_checkin và counts_for_loyalty
create or replace function public.check_in_guest(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_branch     uuid := (p_payload ->> 'branch_id')::uuid;
  v_room       uuid := (p_payload ->> 'room_id')::uuid;
  v_in         timestamptz := coalesce(nullif(p_payload ->> 'check_in_at', '')::timestamptz, now());
  v_out_exp    timestamptz := (p_payload ->> 'expected_check_out_at')::timestamptz;
  v_out_real   timestamptz := nullif(p_payload ->> 'checked_out_at', '')::timestamptz;
  v_channel    public.source_channels;
  v_partner    uuid := nullif(p_payload ->> 'partner_id', '')::uuid;
  v_companions jsonb := coalesce(p_payload -> 'companions', '[]'::jsonb);
  v_ack        boolean := coalesce((p_payload ->> 'blacklist_ack')::boolean, false);
  v_backdated  boolean;
  v_can_update boolean;
  v_primary    uuid;
  v_ids        uuid[];
  v_gid        uuid;
  v_stay       uuid;
  v_tier_before jsonb;
  v_tier_after  jsonb;
  v_applied     jsonb;
  v_upgraded    jsonb;
  v_policy      public.loyalty_policies;
  v_comp_loyalty boolean;
  c            jsonb;
begin
  perform private.assert_perm_at('stay.create', v_branch);
  perform private.hit_rate_limit('check_in', 60, 60);
  v_can_update := private.has_perm('guest.update', v_branch);

  -- Thời gian: tương lai bị chặn; quá ngưỡng là nhập bù
  if v_in > now() + interval '1 hour' then
    raise exception 'check-in time is in the future' using errcode = 'P0422';
  end if;
  v_backdated := v_in < now() - make_interval(hours =>
    coalesce((select (value #>> '{}')::int from public.app_settings where key = 'stay.backdate_after_hours'), 12));
  if v_backdated then
    perform private.assert_perm_at('stay.create_past', v_branch);
    if v_out_real is null or v_out_real <= v_in or v_out_real > now() then
      raise exception 'backdated stay needs a real check-out time in the past' using errcode = 'P0422';
    end if;
    v_out_exp := v_out_real;
  end if;

  -- Phòng
  if not exists (select 1 from public.rooms where id = v_room and branch_id = v_branch and is_active) then
    raise exception 'invalid room' using errcode = 'P0422';
  end if;
  if not v_backdated and private.room_blocked_at(v_room, now()) then
    raise exception 'room is out of order' using errcode = 'P0413';
  end if;
  if v_backdated and exists (
    select 1 from public.stays s
    where s.room_id = v_room and s.status <> 'cancelled'
      and tstzrange(s.check_in_at, coalesce(s.checked_out_at, s.expected_check_out_at))
          && tstzrange(v_in, v_out_real)) then
    raise exception 'room already used in that period' using errcode = 'P0412';
  end if;

  -- Nguồn khách
  select * into v_channel from public.source_channels
  where id = nullif(p_payload ->> 'source_channel_id', '')::uuid and is_active;
  if v_channel.id is null then
    raise exception 'source channel required' using errcode = 'P0422';
  end if;
  if v_channel.requires_partner and not exists (
    select 1 from public.partners where id = v_partner and is_active) then
    raise exception 'partner required for this channel' using errcode = 'P0422';
  end if;
  if not v_channel.requires_partner then
    v_partner := null;
  end if;

  -- Module phụ thuộc
  if jsonb_array_length(v_companions) > 0 then
    perform private.assert_module(v_branch, 'companions');
  end if;
  if exists (select 1 from jsonb_array_elements(v_companions || jsonb_build_array(p_payload -> 'primary')) e
             where e -> 'document' ->> 'type' = 'passport') then
    perform private.assert_module(v_branch, 'international');
  end if;

  -- Khách chính
  v_primary := private.upsert_guest(p_payload -> 'primary', true, v_can_update);
  v_ids := array[v_primary];

  -- Kiểm tra trùng lặp người đi cùng
  for c in select value from jsonb_array_elements(v_companions) loop
    v_gid := private.upsert_guest(c, false, v_can_update);
    if v_gid = any (v_ids) then
      raise exception 'duplicate guest in one stay' using errcode = 'P0422';
    end if;
    v_ids := v_ids || v_gid;
  end loop;

  if not v_backdated
     and private.module_state(v_branch, 'blacklist') <> 'off'
     and not v_ack
     and exists (select 1 from public.guest_flags f
                 where f.guest_id = any (v_ids) and f.flag_type = 'blacklist' and f.status = 'approved') then
    raise exception 'blacklist acknowledgement required' using errcode = 'P0428';
  end if;

  -- Lấy chính sách hạng hiệu lực tại ngày check-in
  v_policy := private.active_loyalty_policy(v_in::date);

  begin
    insert into public.stays (branch_id, room_id, status, check_in_at, expected_check_out_at, checked_out_at,
                              source_channel_id, partner_id, source_detail, entry_mode, note, created_by,
                              blacklist_ack_by, blacklist_ack_at, policy_id_at_checkin)
    values (v_branch, v_room,
            case when v_backdated then 'checked_out'::public.stay_status else 'in_house' end,
            v_in, v_out_exp, case when v_backdated then v_out_real end,
            v_channel.id, v_partner, nullif(p_payload ->> 'source_detail', ''),
            case when v_backdated then 'backdated'::public.entry_mode else 'live' end,
            nullif(p_payload ->> 'note', ''),
            (select auth.uid()),
            case when v_ack then (select auth.uid()) end,
            case when v_ack then now() end,
            v_policy.id)
    returning id into v_stay;
  exception when unique_violation then
    raise exception 'room is occupied' using errcode = 'P0412';
  end;

  -- Lưu khách chính (luôn tích luỹ hạng)
  insert into public.stay_guests (stay_id, guest_id, is_primary, counts_for_loyalty)
  values (v_stay, v_primary, true, true);

  -- Lưu người đi cùng (theo lựa chọn hoặc mặc định của chính sách)
  for c in select value from jsonb_array_elements(v_companions) loop
    v_gid := private.upsert_guest(c, false, v_can_update);
    v_comp_loyalty := coalesce((c ->> 'counts_for_loyalty')::boolean, v_policy.companions_count_default, true);

    insert into public.stay_guests (stay_id, guest_id, is_primary, counts_for_loyalty)
    values (v_stay, v_gid, false, v_comp_loyalty)
    on conflict (stay_id, guest_id) do update set counts_for_loyalty = excluded.counts_for_loyalty;
  end loop;

  -- Hạng & giảm giá của người đại diện lúc check-in
  if private.module_state(v_branch, 'loyalty') = 'on' then
    v_tier_before := private.guest_tier(v_primary, v_stay, v_in::date);
    v_tier_after  := private.guest_tier(v_primary, null, v_in::date);
    v_applied := case when v_policy.count_current_stay then v_tier_after else v_tier_before end;

    update public.stays
       set tier_id = (v_applied ->> 'tier_id')::uuid,
           tier_id_at_checkin = (v_applied ->> 'tier_id')::uuid,
           discount_pct = coalesce((v_applied ->> 'discount_pct')::numeric, 0)
     where id = v_stay;

    if not v_backdated
       and coalesce((select min_value from public.loyalty_tiers where id = (v_tier_after ->> 'tier_id')::uuid), 0)
         > coalesce((select min_value from public.loyalty_tiers where id = (v_tier_before ->> 'tier_id')::uuid), 0) then
      insert into public.guest_tier_events (guest_id, from_tier_id, to_tier_id, kind, stay_id, actor_id, policy_id)
      values (v_primary, (v_tier_before ->> 'tier_id')::uuid, (v_tier_after ->> 'tier_id')::uuid,
              'auto_upgrade', v_stay, (select auth.uid()), v_policy.id);
      v_upgraded := v_tier_after;
    end if;
  end if;

  if private.module_state(v_branch, 'consent') = 'on' and p_payload ? 'consents' then
    insert into public.guest_consents (guest_id, channel, granted, recorded_by)
    select v_primary, e.key, e.value::boolean, (select auth.uid())
    from jsonb_each_text(p_payload -> 'consents') e
    where e.key in ('zalo', 'sms', 'email', 'phone')
    on conflict (guest_id, channel) do update
      set granted = excluded.granted, recorded_by = excluded.recorded_by, recorded_at = now();
  end if;

  insert into public.audit_logs (branch_id, actor_id, action, target_type, target_id, after)
  values (v_branch, (select auth.uid()), 'check_in', 'stay', v_stay,
          jsonb_build_object('room_id', v_room, 'primary_guest_id', v_primary,
                             'guest_count', 1 + jsonb_array_length(v_companions),
                             'backdated', v_backdated,
                             'tier_applied', v_applied ->> 'name',
                             'discount_pct', v_applied ->> 'discount_pct'));

  return jsonb_build_object(
    'stay_id', v_stay,
    'room_id', v_room,
    'primary_guest_id', v_primary,
    'applied_tier', v_applied,
    'upgraded_tier', v_upgraded
  );
end $$;

-- 15. Nâng cấp guest_profile bổ sung tier_events, last_stay_at cho người đi cùng và override_tier permission
create or replace function public.guest_profile(p_guest_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_g           public.guests;
  v_full        boolean;
  v_branch_id   uuid;
  v_log_branch  uuid;
begin
  perform private.assert_perm('guest.view_summary');
  select * into v_g from public.guests where id = p_guest_id;
  if not found then raise exception 'guest not found' using errcode = 'P0404'; end if;
  if v_g.merged_into is not null then
    return jsonb_build_object('redirect_to', v_g.merged_into);
  end if;

  select s.last_branch_id into v_branch_id from public.guest_stats s where s.guest_id = p_guest_id;

  v_full := (v_branch_id is not null and private.has_perm('guest.view_full', v_branch_id))
            or private.has_perm('report.view_chain')
            or (v_g.sales_owner_id = (select auth.uid()) and private.has_perm('guest.view_full_own'));

  if v_full then
    v_log_branch := coalesce(
      v_branch_id,
      (select branch_id from public.user_roles where user_id = (select auth.uid()) and branch_id is not null limit 1)
    );
    perform private.log_event('guest.view_full', 'guests', p_guest_id, v_log_branch);
  end if;

  return jsonb_build_object(
    'guest', jsonb_build_object(
      'id', v_g.id, 'full_name', v_g.full_name, 'gender', v_g.gender,
      'dob', case when v_full then v_g.dob end, 'birth_year', extract(year from v_g.dob),
      'nationality', v_g.nationality,
      'phone', case
        when v_full then v_g.phone
        when length(v_g.phone) >= 7 then overlay(v_g.phone placing '****' from 4 for 4)
        else v_g.phone
      end,
      'phone_intl', case when v_full then v_g.phone_intl else null end,
      'email', v_g.email,
      'address_line', case when v_full then v_g.address_line end,
      'province_code', v_g.province_code, 'ward_code', case when v_full then v_g.ward_code end,
      'tags', v_g.tags, 'created_at', v_g.created_at, 'updated_at', v_g.updated_at,
      'sales_owner', (select jsonb_build_object('id', pr.id, 'name', pr.full_name)
                      from public.profiles pr where pr.id = v_g.sales_owner_id),
      'source_channel', (select jsonb_build_object('id', sc.id, 'name', sc.name, 'kind', sc.kind)
                         from public.source_channels sc where sc.id = v_g.source_channel_id),
      'tier_override_code', v_g.tier_override_code,
      'tier_override_until', v_g.tier_override_until,
      'tier_override_reason', v_g.tier_override_reason),
    'tier', case when private.has_perm('loyalty.view') then private.guest_tier(p_guest_id) end,
    'tier_events', case when private.has_perm('loyalty.view') then coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id,
        'from_tier', (select name from public.loyalty_tiers where id = e.from_tier_id),
        'to_tier', (select name from public.loyalty_tiers where id = e.to_tier_id),
        'kind', e.kind,
        'policy_name', coalesce(p.name, 'Chính sách mặc định'),
        'actor', pr.full_name,
        'note', e.note,
        'at', e.at
      ) order by e.at desc)
      from public.guest_tier_events e
      left join public.loyalty_policies p on p.id = e.policy_id
      left join public.profiles pr on pr.id = e.actor_id
      where e.guest_id = p_guest_id
      limit 50
    ), '[]'::jsonb) else '[]'::jsonb end,
    'documents', coalesce((
      select jsonb_agg(jsonb_build_object(
        'type', d.doc_type, 'country', d.issuing_country,
        'number', case when v_full then d.doc_number else private.mask_doc(d.doc_number) end)
        order by d.created_at)
      from public.guest_documents d where d.guest_id = p_guest_id), '[]'::jsonb),
    'stats', (select to_jsonb(s) - 'guest_id' from public.guest_stats s where s.guest_id = p_guest_id),
    'stays', coalesce((
      select jsonb_agg(x.j order by x.ts desc) from (
        select st.check_in_at as ts, jsonb_build_object(
          'id', st.id, 'branch', b.name, 'room', r.number, 'status', st.status,
          'check_in_at', st.check_in_at,
          'check_out_at', coalesce(st.checked_out_at, st.expected_check_out_at),
          'nights', st.nights, 'source', sc.name, 'partner', pa.name, 'entry_mode', st.entry_mode,
          'is_primary', sg.is_primary) as j
        from public.stay_guests sg
        join public.stays st   on st.id = sg.stay_id
        join public.branches b on b.id = st.branch_id
        join public.rooms r    on r.id = st.room_id
        join public.source_channels sc on sc.id = st.source_channel_id
        left join public.partners pa   on pa.id = st.partner_id
        where sg.guest_id = p_guest_id
        order by st.check_in_at desc
        limit 50) x), '[]'::jsonb),
    'companions', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'full_name', c.full_name, 'times', c.n, 'last_stay_at', c.last_stay_at) order by c.n desc)
      from (
        select g2.id, g2.full_name, count(*) as n, max(st.check_in_at) as last_stay_at
        from public.stay_guests a
        join public.stay_guests o on o.stay_id = a.stay_id and o.guest_id <> a.guest_id
        join public.stays st      on st.id = a.stay_id
        join public.guests g2     on g2.id = o.guest_id and g2.merged_into is null
        where a.guest_id = p_guest_id
        group by g2.id, g2.full_name
        order by n desc limit 15) c), '[]'::jsonb),
    'notes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', n.id, 'kind', n.kind, 'body', n.body, 'branch', b.name,
        'author', pr.full_name, 'author_id', n.created_by, 'at', n.created_at)
        order by n.created_at desc)
      from (select * from public.guest_notes where guest_id = p_guest_id and deleted_at is null
            order by created_at desc limit 50) n
      left join public.branches b  on b.id = n.branch_id
      left join public.profiles pr on pr.id = n.created_by), '[]'::jsonb),
    'flags', case when private.has_perm('blacklist.view') then coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', f.id, 'type', f.flag_type, 'status', f.status, 'reason', f.reason,
        'branch', b.name, 'proposed_at', f.proposed_at, 'decided_at', f.decided_at)
        order by f.proposed_at desc)
      from public.guest_flags f join public.branches b on b.id = f.branch_id
      where f.guest_id = p_guest_id and f.status in ('proposed', 'approved')), '[]'::jsonb)
      else '[]'::jsonb end,
    'consents', coalesce((
      select jsonb_object_agg(c.channel, c.granted)
      from public.guest_consents c where c.guest_id = p_guest_id), '{}'::jsonb),
    'can', jsonb_build_object(
      'view_full', v_full,
      'update', private.has_perm('guest.update'),
      'assign_owner', private.has_perm('guest.assign_owner'),
      'note', private.has_perm('guest.note_create'),
      'tag', private.has_perm('guest.tag_manage'),
      'propose_flag', private.has_perm('blacklist.propose'),
      'propose_merge', private.has_perm('merge.propose'),
      'override_tier', private.has_perm('loyalty.override'))
  );
end;
$function$;

create or replace function public.get_guest_profile(p_guest_id uuid)
returns jsonb
language sql
security definer
as $$
  select public.guest_profile(p_guest_id);
$$;

grant execute on function public.guest_profile(uuid) to authenticated;
grant execute on function public.get_guest_profile(uuid) to authenticated;


