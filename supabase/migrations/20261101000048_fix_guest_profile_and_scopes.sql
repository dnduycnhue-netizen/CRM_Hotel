-- Migration 48: Hoàn thiện hồ sơ 360 độ (Fix B4, B7), Phân quyền phạm vi khách đoàn (Fix C1, B6) và RLS
-- ----------------------------------------------------------------------------------------------------

-- 1. Cập nhật RPC public.guest_profile: Đồng bộ chính xác cấu trúc cột guest_tier_events và guest_flags
-- ----------------------------------------------------------------------------------------------------
create or replace function public.guest_profile(p_guest_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_g           public.guests%rowtype;
  v_full        boolean;
  v_branch_id   uuid;
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
          'id', st.id, 'branch', b.name, 'branch_id', b.id, 'room', r.number, 'status', st.status,
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
        'id', f.id, 'flag_type', f.flag_type, 'status', f.status,
        'reason', f.reason, 'branch', b.name, 'created_at', f.proposed_at)
        order by f.proposed_at desc)
      from public.guest_flags f
      left join public.branches b on b.id = f.branch_id
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
set search_path to ''
as $$
  select public.guest_profile(p_guest_id);
$$;

grant execute on function public.guest_profile(uuid) to authenticated;
grant execute on function public.get_guest_profile(uuid) to authenticated;

-- 2. Cập nhật RLS trên public.group_bookings: Phân quyền theo cơ sở & người tạo (Fix C1)
-- ------------------------------------------------------------------------------------
drop policy if exists read_group_bookings on public.group_bookings;
create policy read_group_bookings on public.group_bookings
  for select to authenticated
  using (
    private.has_perm('report.view_chain')
    or private.has_perm('group.manage', branch_id)
    or private.has_perm('stay.view', branch_id)
    or (created_by = (select auth.uid()))
  );

-- 3. Cập nhật save_group_booking: Bổ sung kiểm tra Sales isolation khi chỉnh sửa đoàn
-- ----------------------------------------------------------------------------------
create or replace function public.save_group_booking(
  p_id uuid default null::uuid,
  p_branch_id uuid default null::uuid,
  p_partner_id uuid default null::uuid,
  p_group_name text default null::text,
  p_leader_name text default null::text,
  p_leader_phone text default null::text,
  p_leader_email text default null::text,
  p_expected_check_in timestamp with time zone default null::timestamp with time zone,
  p_expected_check_out timestamp with time zone default null::timestamp with time zone,
  p_rooms_count integer default 1,
  p_guests_count integer default 1,
  p_status text default 'confirmed'::text,
  p_estimated_amount numeric default 0,
  p_deposit_amount numeric default 0,
  p_billing_note text default null::text,
  p_note text default null::text
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_res record;
  v_code text;
  v_rate_pct int;
  v_comm_amount numeric(12, 2);
  v_contract_rate int;
  v_existing record;
  v_is_sales boolean;
  v_caller_id uuid := (select auth.uid());
begin
  if v_caller_id is null then
    raise exception 'unauthenticated' using errcode = 'P0401';
  end if;

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

  -- Kiểm tra vai trò của caller
  select exists (
    select 1 from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = v_caller_id and r.key = 'sales'
  ) into v_is_sales;

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
      v_caller_id
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
    -- Nếu cập nhật: kiểm tra tồn tại và quyền của Sales
    select * into v_existing from public.group_bookings where id = p_id;
    if not found then
      raise exception 'Không tìm thấy thông tin đoàn để cập nhật' using errcode = 'P0404';
    end if;

    if v_is_sales and v_existing.created_by is not null and v_existing.created_by <> v_caller_id then
      raise exception 'FORBIDDEN_GROUP_EDIT: Bạn không có quyền chỉnh sửa đoàn do Sales khác tạo'
        using errcode = 'P0403';
    end if;

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

    -- Đồng bộ hoa hồng dự kiến
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

      update public.partner_commissions
         set partner_id = p_partner_id,
             branch_id = p_branch_id,
             amount = v_comm_amount,
             rate_pct = v_rate_pct,
             base_revenue = greatest(coalesce(p_estimated_amount, 0), 0),
             note = 'Dự toán hoa hồng đoàn ' || v_res.code || ' (' || v_rate_pct || '%)'
       where group_booking_id = v_res.id and status = 'pending';

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
      update public.partner_commissions
         set status = 'cancelled',
             note = 'Đã hủy hoa hồng vì chuyển sang đoàn tự đặt trực tiếp'
       where group_booking_id = v_res.id and status = 'pending';
    end if;

  end if;

  return to_jsonb(v_res);
end;
$function$;

grant execute on function public.save_group_booking(uuid, uuid, uuid, text, text, text, text, timestamp with time zone, timestamp with time zone, integer, integer, text, numeric, numeric, text, text) to authenticated;
