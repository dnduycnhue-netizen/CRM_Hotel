-- 20261101000043_fix_qa_round11_blockers.sql
-- Fix 4 Blocker cốt lõi từ Báo cáo QA Vòng 11:
-- 1. Check-in khách mới: sửa target_type -> entity trong audit_logs insert của check_in_guest
-- 2. Companions: tạo RPC get_stay_guests bảo mật + sửa target_type -> entity trong add/remove/set_companion_loyalty
-- 3. Đổi voucher & Doanh thu: sửa get_monthly_input_matrix (stay_status, check_out_at, starts_at)

-- ============================================================================
-- 1. RPC get_stay_guests (Khắc phục lỗi tải danh sách người trong phòng)
-- ============================================================================
create or replace function public.get_stay_guests(p_stay_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_branch uuid;
  v_can_view_full boolean;
  v_res jsonb;
begin
  select branch_id into v_branch from public.stays where id = p_stay_id;
  if v_branch is null then
    return '[]'::jsonb;
  end if;

  v_can_view_full := private.has_perm('guest.view_full', v_branch);

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'guestId', sg.guest_id,
      'isPrimary', sg.is_primary,
      'countsForLoyalty', sg.counts_for_loyalty,
      'fullName', g.full_name,
      'phone', case
        when v_can_view_full then g.phone
        when length(g.phone) >= 7 then overlay(g.phone placing '****' from 4 for 4)
        else g.phone
      end,
      'gender', g.gender,
      'dob', g.dob,
      'docType', gd.doc_type,
      'docNumber', case
        when v_can_view_full then gd.doc_number
        else private.mask_doc(gd.doc_number)
      end
    ) order by sg.is_primary desc, g.full_name
  ), '[]'::jsonb)
  into v_res
  from public.stay_guests sg
  join public.guests g on g.id = sg.guest_id
  left join lateral (
    select doc_type, doc_number
    from public.guest_documents
    where guest_id = g.id
    order by created_at desc
    limit 1
  ) gd on true
  where sg.stay_id = p_stay_id;

  return v_res;
end;
$$;

grant execute on function public.get_stay_guests(uuid) to authenticated;

-- ============================================================================
-- 2. Sửa RPC add_stay_companion, remove_stay_companion, set_companion_loyalty
-- ============================================================================
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

  insert into public.audit_logs (branch_id, actor_id, action, entity, entity_id, after)
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

  insert into public.audit_logs (branch_id, actor_id, action, entity, entity_id, before)
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

  insert into public.audit_logs (branch_id, actor_id, action, entity, entity_id, after)
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

-- ============================================================================
-- 3. Sửa RPC check_in_guest (Khắc phục lỗi target_type trong audit_logs)
-- ============================================================================
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

  insert into public.audit_logs (branch_id, actor_id, action, entity, entity_id, after)
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

-- ============================================================================
-- 4. Sửa RPC get_monthly_input_matrix (Khắc phục lỗi nhập doanh thu tháng)
-- ============================================================================
create or replace function public.get_monthly_input_matrix(p_month date, p_branch_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_month_start date := date_trunc('month', p_month)::date;
  v_month_end date := (date_trunc('month', p_month) + interval '1 month')::date;
  v_days_in_month int := extract(day from (v_month_end - interval '1 day'))::int;
  v_allowed_branches uuid[];
  v_result jsonb := '[]'::jsonb;
  br record;
  fig record;
  v_crm_arrivals int := 0;
  v_crm_guests int := 0;
  v_crm_nights int := 0;
  v_active_rooms int := 0;
  v_blocked_nights int := 0;
  v_suggested_available int := 0;
  v_can_input boolean;
  v_can_lock boolean;
  v_can_unlock boolean;
begin
  v_allowed_branches := array(
    select b_id from (
      select x as b_id from private.branches_with('revenue.input') x
      union
      select y as b_id from private.branches_with('revenue.view') y
      union
      select z as b_id from private.branches_with('report.view_chain') z
    ) sub
    where p_branch_id is null or b_id = p_branch_id
  );

  if coalesce(array_length(v_allowed_branches, 1), 0) = 0 then
    return '[]'::jsonb;
  end if;

  for br in
    select b.id, b.name, b.code
    from public.branches b
    where b.id = any(v_allowed_branches) and b.is_active
    order by b.code
  loop
    v_can_input := private.has_perm('revenue.input', br.id);
    v_can_lock := v_can_input;
    v_can_unlock := private.has_perm('report.view_chain') or exists (
      select 1 from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid() and r.key in ('owner', 'admin')
    );

    -- 1. Lấy dữ liệu đã nhập
    select
      f.arrivals, f.guests, f.room_nights, f.available_room_nights,
      f.room_revenue, f.other_revenue, f.note,
      p.full_name as entered_by_name, f.entered_at,
      f.locked_at, lp.full_name as locked_by_name, f.unlock_reason
    into fig
    from public.branch_monthly_figures f
    left join public.profiles p on p.id = f.entered_by
    left join public.profiles lp on lp.id = f.locked_by
    where f.branch_id = br.id and f.month = v_month_start;

    -- 2. Thống kê số liệu thực tế từ CRM (stays)
    select
      coalesce(count(*) filter (where s.check_in_at::date >= v_month_start and s.check_in_at::date < v_month_end), 0),
      coalesce(sum((
        select count(*) from public.stay_guests sg where sg.stay_id = s.id
      )) filter (where s.check_in_at::date >= v_month_start and s.check_in_at::date < v_month_end), 0),
      coalesce(sum(
        greatest(0,
          least(coalesce(s.checked_out_at, s.expected_check_out_at)::date, v_month_end) -
          greatest(s.check_in_at::date, v_month_start)
        )
      ), 0)
    into v_crm_arrivals, v_crm_guests, v_crm_nights
    from public.stays s
    where s.branch_id = br.id
      and s.status in ('in_house', 'checked_out')
      and s.check_in_at::date < v_month_end
      and coalesce(s.checked_out_at, s.expected_check_out_at)::date >= v_month_start;

    -- 3. Tính số đêm phòng khả dụng đề xuất
    select count(*) into v_active_rooms
    from public.rooms
    where branch_id = br.id and is_active;

    select coalesce(sum(
      greatest(0,
        least(coalesce(rb.released_at, rb.ends_at, now())::date, v_month_end) -
        greatest(rb.starts_at::date, v_month_start)
      )
    ), 0) into v_blocked_nights
    from public.room_blocks rb
    where rb.branch_id = br.id
      and rb.starts_at::date < v_month_end
      and coalesce(rb.released_at, rb.ends_at, now())::date >= v_month_start;

    v_suggested_available := greatest(0, (v_active_rooms * v_days_in_month) - v_blocked_nights);

    v_result := v_result || jsonb_build_object(
      'branch_id', br.id,
      'branch_name', br.name,
      'branch_code', br.code,
      'is_locked', (fig.locked_at is not null),
      'can_input', (v_can_input and fig.locked_at is null),
      'can_lock', (v_can_lock and fig.locked_at is null and fig.room_revenue is not null),
      'can_unlock', (v_can_unlock and fig.locked_at is not null),
      'figures', jsonb_build_object(
        'arrivals', fig.arrivals,
        'guests', fig.guests,
        'room_nights', fig.room_nights,
        'available_room_nights', fig.available_room_nights,
        'room_revenue', fig.room_revenue,
        'other_revenue', fig.other_revenue,
        'note', fig.note,
        'entered_by_name', fig.entered_by_name,
        'entered_at', fig.entered_at,
        'locked_at', fig.locked_at,
        'locked_by_name', fig.locked_by_name,
        'unlock_reason', fig.unlock_reason
      ),
      'crm_arrivals', v_crm_arrivals,
      'crm_guests', v_crm_guests,
      'crm_room_nights', v_crm_nights,
      'suggested_available_room_nights', v_suggested_available
    );
  end loop;

  return v_result;
end $$;

grant execute on function public.get_monthly_input_matrix(date, uuid) to authenticated;
