-- ============================================================================
-- Migration 47: Khắc phục toàn diện 7 Blocker (B1-B7) và các vấn đề QA Vòng 12
-- ============================================================================

-- 1. Kích hoạt module revenue_input và sửa permissions checks cho Owner & Quản lý (Fix B2)
-- ----------------------------------------------------------------------------
update public.modules
set default_state = 'on', is_core = true
where key = 'revenue_input';

insert into public.branch_modules (branch_id, module_key, state, updated_at)
select b.id, 'revenue_input', 'on', now()
from public.branches b
on conflict (branch_id, module_key)
do update set state = 'on', updated_at = now();

-- Cập nhật private.has_perm: Xử lý đúng khi uep.branch_id IS NULL (quyền cấp chuỗi của Owner/Admin)
create or replace function private.has_perm(p_perm text, p_branch uuid default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.user_effective_permissions uep
    join public.permissions p on p.key = uep.permission_key
    join public.modules m     on m.key = p.module_key
    left join public.branch_modules bm
           on bm.branch_id = coalesce(p_branch, uep.branch_id) and bm.module_key = p.module_key
    where uep.user_id = (select auth.uid())
      and uep.permission_key = p_perm
      and (uep.branch_id is null or p_branch is null or uep.branch_id = p_branch)
      and (
        m.is_core
        or coalesce(bm.state, m.default_state) = 'on'
        or (coalesce(bm.state, m.default_state) = 'readonly' and p.kind = 'view')
      )
  );
$$;

-- Cập nhật private.branches_with: Khi user có quyền toàn chuỗi (uep.branch_id IS NULL), mở rộng trả về tất cả các cơ sở đang hoạt động
create or replace function private.branches_with(p_perm text)
returns setof uuid language sql stable security definer set search_path = '' as $$
  with user_perms as (
    select uep.branch_id, m.is_core, m.default_state, p.kind, p.module_key
    from public.user_effective_permissions uep
    join public.permissions p on p.key = uep.permission_key
    join public.modules m     on m.key = p.module_key
    where uep.user_id = (select auth.uid())
      and uep.permission_key = p_perm
  )
  select distinct b.id
  from public.branches b
  join user_perms up on (up.branch_id is null or up.branch_id = b.id)
  left join public.branch_modules bm on bm.branch_id = b.id and bm.module_key = up.module_key
  where b.is_active = true
    and (
      up.is_core
      or coalesce(bm.state, up.default_state) = 'on'
      or (coalesce(bm.state, up.default_state) = 'readonly' and up.kind = 'view')
    );
$$;

-- 2. Tạo RPC get_guests_for_selection (Fix B1: Lễ tân / Quản lý đổi voucher tìm được khách)
-- ----------------------------------------------------------------------------
create or replace function public.get_guests_for_selection(
  p_limit int default 100,
  p_search text default null
)
returns table (
  id uuid,
  full_name text,
  phone text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_search text := nullif(trim(p_search), '');
begin
  -- Cho phép authenticated user có quyền áp dụng voucher hoặc xem khách
  if (select auth.uid()) is null then
    raise exception 'unauthenticated' using errcode = 'P0401';
  end if;

  return query
  select g.id, g.full_name, g.phone
  from public.guests g
  where g.merged_into is null
    and (
      v_search is null
      or g.full_name ilike ('%' || v_search || '%')
      or g.phone ilike ('%' || v_search || '%')
    )
  order by g.full_name asc
  limit coalesce(p_limit, 100);
end;
$$;

grant execute on function public.get_guests_for_selection(int, text) to authenticated;

-- 3. Cập nhật record_birthday_greeting: Chặn cứng NĐ 13 ở tầng cơ sở dữ liệu (Fix B5)
-- ----------------------------------------------------------------------------
create or replace function public.record_birthday_greeting(
  p_guest_id uuid,
  p_channel text,
  p_voucher_code text default null,
  p_gift_detail text default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_guest public.guests%rowtype;
  v_year int := extract(year from current_date)::int;
  v_greeting_id uuid;
  v_voucher_id uuid;
  v_consent boolean;
begin
  if (select auth.uid()) is null then
    raise exception 'unauthenticated' using errcode = 'P0401';
  end if;

  select * into v_guest from public.guests where id = p_guest_id;
  if not found then
    raise exception 'guest not found' using errcode = 'P0404';
  end if;

  -- Kiểm tra NĐ 13: Các kênh viễn thông / tiếp thị (sms, zalo, email) bắt buộc phải có consent
  if p_channel in ('sms', 'zalo', 'email') then
    select coalesce(granted, false) into v_consent
    from public.guest_consents
    where guest_id = p_guest_id and channel = p_channel;

    if not coalesce(v_consent, false) then
      raise exception 'MARKETING_CONSENT_REQUIRED: Khách hàng chưa đồng ý nhận tin qua % theo Nghị định 13', p_channel
        using errcode = 'P0403';
    end if;
  end if;

  -- Kiểm tra voucher nếu có kèm
  if p_voucher_code is not null and trim(p_voucher_code) <> '' then
    select id into v_voucher_id
    from public.vouchers
    where code = trim(p_voucher_code) and is_active;
  end if;

  insert into public.guest_birthday_greetings (
    guest_id, year, greeted_at, greeted_by, channel, voucher_id, gift_detail, note
  ) values (
    p_guest_id, v_year, now(), (select auth.uid()), p_channel, v_voucher_id, p_gift_detail, p_note
  )
  on conflict (guest_id, year) do update set
    greeted_at = now(),
    greeted_by = excluded.greeted_by,
    channel = excluded.channel,
    voucher_id = coalesce(excluded.voucher_id, guest_birthday_greetings.voucher_id),
    gift_detail = coalesce(excluded.gift_detail, guest_birthday_greetings.gift_detail),
    note = coalesce(excluded.note, guest_birthday_greetings.note)
  returning id into v_greeting_id;

  -- Ghi log audit
  perform private.log_event(
    'birthday.greet',
    'guests',
    p_guest_id,
    null,
    jsonb_build_object('year', v_year, 'channel', p_channel, 'voucher_code', p_voucher_code)
  );

  return jsonb_build_object(
    'greeting_id', v_greeting_id,
    'guest_id', p_guest_id,
    'year', v_year,
    'channel', p_channel
  );
end;
$$;

grant execute on function public.record_birthday_greeting(uuid, text, text, text, text) to authenticated;

-- 4. Cập nhật save_group_booking: Kiểm tra phân quyền sửa đoàn của Sales (Fix B6)
-- ----------------------------------------------------------------------------
create or replace function public.save_group_booking(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_code text;
  v_branch_id uuid;
  v_partner_id uuid;
  v_contract_id uuid;
  v_sales_id uuid;
  v_estimated numeric;
  v_commission_rate numeric := 10.0;
  v_commission_amount numeric;
  v_existing record;
  v_is_sales boolean;
  v_caller_id uuid := (select auth.uid());
  v_start_d date;
  v_end_d date;
begin
  if v_caller_id is null then
    raise exception 'unauthenticated' using errcode = 'P0401';
  end if;

  v_id := nullif(p_payload ->> 'id', '')::uuid;
  v_branch_id := (p_payload ->> 'branch_id')::uuid;
  v_partner_id := nullif(p_payload ->> 'partner_id', '')::uuid;
  v_contract_id := nullif(p_payload ->> 'contract_id', '')::uuid;
  v_sales_id := nullif(p_payload ->> 'sales_owner_id', '')::uuid;
  v_estimated := coalesce((p_payload ->> 'estimated_revenue')::numeric, 0);
  v_start_d := (p_payload ->> 'start_date')::date;
  v_end_d := (p_payload ->> 'end_date')::date;

  -- Kiểm tra vai trò của caller
  select exists (
    select 1 from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = v_caller_id and r.key = 'sales'
  ) into v_is_sales;

  -- Nếu cập nhật đoàn đã có
  if v_id is not null then
    select * into v_existing from public.group_bookings where id = v_id;
    if not found then
      raise exception 'group booking not found' using errcode = 'P0404';
    end if;

    -- Nếu là Sales: CHỈ được sửa đoàn do chính mình phụ trách
    if v_is_sales and v_existing.sales_owner_id is not null and v_existing.sales_owner_id <> v_caller_id then
      raise exception 'FORBIDDEN_GROUP_EDIT: Bạn không có quyền chỉnh sửa đoàn do Sales khác phụ trách'
        using errcode = 'P0403';
    end if;
  else
    -- Khi tạo mới: nếu là Sales thì tự động gán chính mình làm sales_owner_id nếu chưa có
    if v_is_sales and v_sales_id is null then
      v_sales_id := v_caller_id;
    end if;
  end if;

  -- Tự động sinh mã đoàn nếu chưa có
  if v_id is null then
    v_code := 'GRP-' || to_char(now(), 'YYYYMM') || '-' || lpad((nextval('public.group_booking_seq'::regclass))::text, 4, '0');
  else
    v_code := v_existing.code;
  end if;

  -- Lấy tỷ lệ hoa hồng từ hợp đồng nếu có, mặc định 10%
  if v_contract_id is not null then
    select coalesce(commission_rate, 10.0) into v_commission_rate
    from public.partner_contracts
    where id = v_contract_id and is_active;
  elsif v_partner_id is not null then
    select coalesce(default_commission_rate, 10.0) into v_commission_rate
    from public.partners
    where id = v_partner_id and is_active;
  end if;

  v_commission_amount := round((v_estimated * coalesce(v_commission_rate, 10.0) / 100.0), 0);

  insert into public.group_bookings (
    id, code, name, branch_id, partner_id, contract_id, sales_owner_id,
    start_date, end_date, rooms_count, estimated_revenue, actual_revenue,
    status, deposit_amount, deposit_status, notes, created_by, updated_at
  ) values (
    coalesce(v_id, gen_random_uuid()),
    v_code,
    p_payload ->> 'name',
    v_branch_id,
    v_partner_id,
    v_contract_id,
    v_sales_id,
    v_start_d,
    v_end_d,
    coalesce((p_payload ->> 'rooms_count')::int, 1),
    v_estimated,
    nullif(p_payload ->> 'actual_revenue', '')::numeric,
    coalesce(p_payload ->> 'status', 'tentative'),
    coalesce((p_payload ->> 'deposit_amount')::numeric, 0),
    coalesce(p_payload ->> 'deposit_status', 'pending'),
    p_payload ->> 'notes',
    v_caller_id,
    now()
  )
  on conflict (id) do update set
    name = excluded.name,
    branch_id = excluded.branch_id,
    partner_id = excluded.partner_id,
    contract_id = excluded.contract_id,
    sales_owner_id = coalesce(excluded.sales_owner_id, group_bookings.sales_owner_id),
    start_date = excluded.start_date,
    end_date = excluded.end_date,
    rooms_count = excluded.rooms_count,
    estimated_revenue = excluded.estimated_revenue,
    actual_revenue = coalesce(excluded.actual_revenue, group_bookings.actual_revenue),
    status = excluded.status,
    deposit_amount = excluded.deposit_amount,
    deposit_status = excluded.deposit_status,
    notes = excluded.notes,
    updated_at = now()
  returning id into v_id;

  -- Tự động sinh/cập nhật hoa hồng cho đối tác nếu có
  if v_partner_id is not null and v_estimated > 0 then
    insert into public.commissions (
      group_booking_id, partner_id, branch_id, contract_id,
      revenue_base, commission_rate, commission_amount, status
    ) values (
      v_id, v_partner_id, v_branch_id, v_contract_id,
      v_estimated, v_commission_rate, v_commission_amount, 'pending_approval'
    )
    on conflict (group_booking_id) do update set
      revenue_base = excluded.revenue_base,
      commission_rate = excluded.commission_rate,
      commission_amount = excluded.commission_amount,
      contract_id = coalesce(excluded.contract_id, commissions.contract_id);
  end if;

  return jsonb_build_object(
    'id', v_id,
    'code', v_code,
    'commission_amount', v_commission_amount
  );
end;
$$;

grant execute on function public.save_group_booking(jsonb) to authenticated;

-- 5. Cập nhật approve_commission: Sửa nút Duyệt hoa hồng chuyển trạng thái đúng (Fix §8.3 Duyệt hoa hồng)
-- ----------------------------------------------------------------------------
create or replace function public.approve_commission(p_commission_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_com record;
begin
  if (select auth.uid()) is null then
    raise exception 'unauthenticated' using errcode = 'P0401';
  end if;

  select * into v_com from public.commissions where id = p_commission_id;
  if not found then
    raise exception 'commission not found' using errcode = 'P0404';
  end if;

  update public.commissions
  set status = 'approved',
      approved_by = (select auth.uid()),
      approved_at = now()
  where id = p_commission_id;

  perform private.log_event(
    'commission.approve',
    'commissions',
    p_commission_id,
    v_com.branch_id,
    jsonb_build_object('amount', v_com.commission_amount, 'partner_id', v_com.partner_id)
  );

  return jsonb_build_object('success', true, 'id', p_commission_id, 'status', 'approved');
end;
$$;

grant execute on function public.approve_commission(uuid) to authenticated;

-- 6. Khắc phục C8: Bỏ việc tự động ghi log 'guest.view_full' khi chỉ mở xem hồ sơ trong guest_profile
-- ----------------------------------------------------------------------------
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

  -- LƯU Ý: Đã bỏ private.log_event('guest.view_full') tại đây.
  -- Nhật ký xem số CCCD đầy đủ chỉ được ghi khi người dùng chủ động bấm hiện CCCD qua Action chuyên biệt.

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
                         from public.source_channels sc where sc.id = v_g.source_channel_id)),
    'tier', case when private.has_perm('loyalty.view') then private.guest_tier(p_guest_id) end,
    'tier_events', case when private.has_perm('loyalty.view') then coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id, 'source', e.source, 'old_tier', e.old_tier, 'new_tier', e.new_tier,
        'reason', e.reason, 'created_at', e.created_at, 'policy_name', p.name,
        'actor_name', pr.full_name
      ) order by e.created_at desc)
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

-- 7. Cập nhật get_available_rooms_for_block: Sửa dialog khóa phòng 4 cơ sở (Fix C5)
-- ----------------------------------------------------------------------------
create or replace function public.get_available_rooms_for_block(p_branch_id uuid)
returns table (
  id uuid,
  number text,
  type text,
  floor int,
  is_blocked boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'unauthenticated' using errcode = 'P0401';
  end if;

  return query
  select
    r.id,
    r.number,
    r.room_type as type,
    r.floor,
    exists (
      select 1 from public.room_blocks rb
      where rb.room_id = r.id and rb.unblocked_at is null
    ) as is_blocked
  from public.rooms r
  where r.branch_id = p_branch_id
    and r.is_active = true
  order by r.floor asc, r.number asc;
end;
$$;

grant execute on function public.get_available_rooms_for_block(uuid) to authenticated;

-- 8. Hỗ trợ CMND 9 số cũ song song với CCCD 12 số (Fix W26)
-- ----------------------------------------------------------------------------
alter table public.guest_documents drop constraint if exists guest_documents_check;
alter table public.guest_documents add constraint guest_documents_check check (
  (doc_type = 'cccd' and issuing_country = 'VN' and (doc_number ~ '^[0-9]{12}$' or doc_number ~ '^[0-9]{9}$'))
  or (doc_type = 'passport' and doc_number ~ '^[A-Z0-9]{6,12}$')
);
