# 06 – Nghiệp vụ, RPC và Server Actions

## 1. Danh sách RPC

Mọi RPC ghi đều theo khuôn: `SECURITY DEFINER` · `set search_path = ''` · dòng đầu `private.assert_perm_at(quyền, cơ sở)` (thao tác trên dữ liệu một cơ sở) hoặc `private.assert_perm(quyền)` (quyền cấp chuỗi) · một transaction · trả `jsonb` hoặc bảng. Mỗi RPC có một Server Action tương ứng trong feature.

| RPC | Quyền | Module | Feature / Action |
| --- | --- | --- | --- |
| `lookup_for_checkin(branch, kind, value)` | `stay.create` @cơ sở | core | check-in / `lookupGuest` |
| `find_similar_guests(name, dob, doc, exclude)` | `stay.create` hoặc `guest.search` | core | check-in / `findSimilar` |
| `check_in_guest(payload)` | `stay.create` @cơ sở; nhập bù quá khứ cần thêm `stay.create_past` | core (+companions, +international) | check-in / `checkInGuest` |
| `create_guest(payload)` | `guest.create` | core | guests / `createGuest` (sales thêm khách, không kèm lượt ở) |
| `assign_sales_owner(guest, user)` | `guest.assign_owner` | core | guests / `assignSalesOwner` |
| `update_stay(id, patch, expected_updated_at)` | `stay.update` @cơ sở | core | stays / `updateStay` |
| `checkout_stay(id, at)` | `stay.checkout` @cơ sở | core | stays / `checkoutStay` |
| `cancel_stay(id, reason)` | `stay.cancel` (trong `stay.self_cancel_hours` = 6 giờ) hoặc `stay.cancel_late` | core | stays / `cancelStay` |
| `search_guests(mode, query, limit)` | `guest.search` | core | search / `searchGuests` |
| `get_guest_profile(id)` | `guest.view_summary` (đầy đủ nếu `guest.view_full`, hoặc `guest.view_full_own` và mình là sales phụ trách) | core | guests / `getGuestProfile` (đọc) |
| `update_guest(id, patch, expected_updated_at)` | `guest.update` | core | guests / `updateGuest` |
| `add_guest_note(guest, branch, kind, body)` | `guest.note_create` | core | guests / `addNote` |
| `delete_guest_note(id)` | tác giả trong 24h hoặc `guest.note_delete_any` | core | guests / `deleteNote` |
| `set_guest_tags(guest, tags)` | `guest.tag_manage` | core | guests / `setTags` |
| `set_consent(guest, channel, granted)` | `consent.manage` | consent | guests / `setConsent` |
| `set_guest_tier_override(guest, tier, reason, until)` | `loyalty.override` | loyalty | guests / `setTierOverride` |
| `set_loyalty_rules(rules)` + ghi trực tiếp `loyalty_tiers` | `loyalty.configure` | loyalty | admin / `saveLoyaltyConfig` |
| `export_guests(filters)` | `guest.export`; phạm vi theo cơ sở có quyền; CCCD đầy đủ chỉ khi `guest.export_full` + MFA | core | guests / route handler xuất xlsx |
| `propose_flag(guest, branch, type, reason, evidence)` | `blacklist.propose` @cơ sở | blacklist | blacklist / `proposeFlag` |
| `decide_flag(id, approve, note)` | `blacklist.approve` @cơ sở của cờ | blacklist | blacklist / `decideFlag` |
| `remove_flag(id, reason)` | `blacklist.remove` | blacklist | blacklist / `removeFlag` |
| `propose_merge(keep, drop, reason)` | `merge.propose` | merge | merge / `proposeMerge` |
| `approve_merge(request, field_choices)` | `merge.approve` | merge | merge / `approveMerge` |
| `reject_merge(request, note)` | `merge.approve` | merge | merge / `rejectMerge` |
| `my_access()`, `set_role_permissions`, `set_user_access`, `set_branch_module` | xem 04 | core | admin |

Mã lỗi Postgres → app (bổ sung vào `src/shared/errors.ts`):

| SQLSTATE | ErrorCode | Thông báo hiển thị |
| --- | --- | --- |
| `P0401` | `UNAUTHENTICATED` | Phiên đăng nhập đã hết hạn hoặc cần xác thực 2 lớp |
| `P0403` | `FORBIDDEN` | Bạn không có quyền thực hiện thao tác này |
| `P0404` | `NOT_FOUND` | Không tìm thấy dữ liệu |
| `P0409` | `CONFLICT` | Dữ liệu đã bị người khác thay đổi, vui lòng tải lại |
| `P0410` | `DUPLICATE_DOCUMENT` | Số giấy tờ này đã thuộc về khách khác |
| `P0411` | `DUPLICATE_PHONE` | SĐT này đang thuộc về khách khác (có thể cần gộp hồ sơ) |
| `P0412` | `ROOM_OCCUPIED` | Phòng đang có khách (hoặc trùng thời gian với lượt ở khác khi nhập bù) |
| `P0413` | `ROOM_OUT_OF_ORDER` | Phòng đang khóa ngừng bán (sự cố, sửa chữa) |
| `P0422` | `VALIDATION` | Dữ liệu không hợp lệ |
| `P0423` | `MODULE_DISABLED` | Chức năng đang tắt ở cơ sở này |
| `P0428` | `BLACKLIST_ACK_REQUIRED` | Khách có cảnh báo, cần xác nhận đã đọc |
| `P0429` | `RATE_LIMITED` | Thao tác quá nhanh, thử lại sau ít giây |

## 2. SQL các RPC chính

### 2.1 Tiện ích dùng chung

```sql
-- 20261101000009_rpc.sql

-- Che số giấy tờ: 3 ký tự đầu + 4 ký tự cuối
create or replace function private.mask_doc(p text)
returns text language sql immutable set search_path = '' as $$
  select case when p is null then null
              when length(p) < 8 then '****'
              else left(p, 3) || repeat('*', length(p) - 7) || right(p, 4) end;
$$;

-- Thoát ký tự đặc biệt của LIKE trong từ khoá người dùng
create or replace function private.like_escape(p text)
returns text language sql immutable set search_path = '' as $$
  select replace(replace(replace(p, '\', '\\'), '%', '\%'), '_', '\_');
$$;

-- Giới hạn tần suất theo người dùng
create unlogged table private.rate_limits (
  user_id      uuid not null,
  bucket       text not null,
  window_start timestamptz not null,
  hits         int not null default 0,
  primary key (user_id, bucket, window_start)
);

create or replace function private.hit_rate_limit(p_bucket text, p_max int, p_window_seconds int)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_start timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits int;
begin
  insert into private.rate_limits (user_id, bucket, window_start, hits)
  values ((select auth.uid()), p_bucket, v_start, 1)
  on conflict (user_id, bucket, window_start) do update set hits = private.rate_limits.hits + 1
  returning hits into v_hits;
  if v_hits > p_max then
    raise exception 'rate limited' using errcode = 'P0429';
  end if;
end $$;
```

### 2.2 Tạo/cập nhật khách trong lúc check-in

```sql
-- p: {"guest_id"?, "full_name", "gender", "dob", "nationality", "phone", "phone_intl", "email",
--     "address_line", "province_code", "ward_code",
--     "document": {"type": "cccd"|"passport", "number": "...", "country": "VN"} | null}
create or replace function private.upsert_guest(p jsonb, p_is_primary boolean, p_can_update boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id          uuid := nullif(p ->> 'guest_id', '')::uuid;
  v_phone       text := nullif(p ->> 'phone', '');
  v_nationality text := coalesce(nullif(p ->> 'nationality', ''), 'VN');
  v_doc_type    public.doc_type := nullif(p -> 'document' ->> 'type', '')::public.doc_type;
  v_doc_no      text := upper(nullif(btrim(p -> 'document' ->> 'number'), ''));
  v_doc_country text := coalesce(nullif(p -> 'document' ->> 'country', ''), 'VN');
  v_owner       uuid;
begin
  if p_is_primary and v_nationality = 'VN' and v_phone is null then
    raise exception 'phone required for primary guest' using errcode = 'P0422';
  end if;
  if not p_is_primary and v_doc_no is null and v_id is null then
    raise exception 'companion needs a document' using errcode = 'P0422';
  end if;

  -- 1. Tìm theo giấy tờ
  if v_id is null and v_doc_no is not null then
    select d.guest_id into v_id from public.guest_documents d
    where d.doc_type = v_doc_type and d.issuing_country = v_doc_country and d.doc_number = v_doc_no;
  end if;

  -- 2. Tìm theo SĐT; cùng SĐT nhưng khác giấy tờ cùng loại = người khác dùng chung SĐT
  if v_id is null and v_phone is not null then
    select g.id into v_id from public.guests g where g.phone = v_phone and g.merged_into is null;
    if v_id is not null and v_doc_no is not null and exists (
      select 1 from public.guest_documents d where d.guest_id = v_id and d.doc_type = v_doc_type) then
      raise exception 'phone belongs to another guest' using errcode = 'P0411';
    end if;
  end if;

  begin
    if v_id is null then
      insert into public.guests (full_name, gender, dob, nationality, phone, phone_intl, email,
                                 address_line, province_code, ward_code, created_by)
      values (p ->> 'full_name', (p ->> 'gender')::public.gender, nullif(p ->> 'dob', '')::date,
              v_nationality, v_phone, nullif(p ->> 'phone_intl', ''), nullif(p ->> 'email', ''),
              nullif(p ->> 'address_line', ''), nullif(p ->> 'province_code', ''),
              nullif(p ->> 'ward_code', ''), (select auth.uid()))
      returning id into v_id;
    else
      perform 1 from public.guests where id = v_id and merged_into is null for update;
      if not found then
        raise exception 'guest not found or merged' using errcode = 'P0404';
      end if;
      if p_can_update then
        update public.guests set
          full_name     = coalesce(nullif(p ->> 'full_name', ''), full_name),
          gender        = coalesce(nullif(p ->> 'gender', '')::public.gender, gender),
          dob           = coalesce(nullif(p ->> 'dob', '')::date, dob),
          nationality   = v_nationality,
          phone         = coalesce(v_phone, phone),
          phone_intl    = coalesce(nullif(p ->> 'phone_intl', ''), phone_intl),
          email         = coalesce(nullif(p ->> 'email', ''), email),
          address_line  = coalesce(nullif(p ->> 'address_line', ''), address_line),
          province_code = coalesce(nullif(p ->> 'province_code', ''), province_code),
          ward_code     = coalesce(nullif(p ->> 'ward_code', ''), ward_code)
        where id = v_id;
      end if;
    end if;
  exception when unique_violation then
    raise exception 'phone belongs to another guest' using errcode = 'P0411';
  end;

  -- 3. Gắn giấy tờ
  if v_doc_no is not null then
    select d.guest_id into v_owner from public.guest_documents d
    where d.doc_type = v_doc_type and d.issuing_country = v_doc_country and d.doc_number = v_doc_no;
    if v_owner is null then
      insert into public.guest_documents (guest_id, doc_type, doc_number, issuing_country)
      values (v_id, v_doc_type, v_doc_no, v_doc_country);
    elsif v_owner <> v_id then
      raise exception 'document belongs to another guest' using errcode = 'P0410';
    end if;
  end if;

  return v_id;
end $$;
```

### 2.3 Check-in (kể cả nhập bù quá khứ)

Quy tắc đã chốt với chủ đầu tư:

- Nguồn khách **bắt buộc** (`source_channel_id`); kênh có `requires_partner` thì bắt buộc chọn đối tác.
- Giờ nhận phòng sớm hơn hiện tại quá `stay.backdate_after_hours` (12 giờ) là **nhập bù**: cần quyền `stay.create_past` (mặc định chỉ Quản lý, Chủ chuỗi), bắt buộc có giờ trả phòng thực tế, lượt ở lưu ngay ở trạng thái `checked_out`, `entry_mode = 'backdated'`, không được trùng thời gian với lượt ở khác cùng phòng.
- Không nhận giờ nhận phòng ở tương lai (quá 1 giờ).
- Phòng đang khóa ngừng bán (`room_blocks`) thì không check-in được.

```sql
-- p_payload: {
--   "branch_id", "room_id", "check_in_at"?, "expected_check_out_at", "checked_out_at"? (bắt buộc khi nhập bù),
--   "source_channel_id", "partner_id"?, "source_detail"?, "note"?, "blacklist_ack"?: bool,
--   "primary": {...guest}, "companions": [{...guest}], "consents"?: {"zalo": true, "sms": false}
-- }
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

  -- Khách
  v_primary := private.upsert_guest(p_payload -> 'primary', true, v_can_update);
  v_ids := array[v_primary];
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

  begin
    insert into public.stays (branch_id, room_id, status, check_in_at, expected_check_out_at, checked_out_at,
                              source_channel_id, partner_id, source_detail, entry_mode, note, created_by,
                              blacklist_ack_by, blacklist_ack_at)
    values (v_branch, v_room,
            case when v_backdated then 'checked_out'::public.stay_status else 'in_house' end,
            v_in, v_out_exp, case when v_backdated then v_out_real end,
            v_channel.id, v_partner, nullif(p_payload ->> 'source_detail', ''),
            case when v_backdated then 'backdated'::public.entry_mode else 'live' end,
            nullif(p_payload ->> 'note', ''),
            (select auth.uid()),
            case when v_ack then (select auth.uid()) end,
            case when v_ack then now() end)
    returning id into v_stay;
  exception when unique_violation then
    raise exception 'room is occupied' using errcode = 'P0412';
  end;

  insert into public.stay_guests (stay_id, guest_id, is_primary)
  select v_stay, g, g = v_primary from unnest(v_ids) g;

  -- Hạng & giảm giá của người đại diện (giải thích ở 2.3c)
  if private.module_state(v_branch, 'loyalty') = 'on' then
    v_tier_before := private.guest_tier(v_primary, v_stay);
    v_tier_after  := private.guest_tier(v_primary);
    v_applied := case when coalesce((select (value ->> 'count_current_stay')::boolean
                                     from public.app_settings where key = 'loyalty.rules'), false)
                      then v_tier_after else v_tier_before end;
    update public.stays
       set tier_id = (v_applied ->> 'tier_id')::uuid,
           discount_pct = coalesce((v_applied ->> 'discount_pct')::numeric, 0)
     where id = v_stay;
    if not v_backdated
       and coalesce((select min_value from public.loyalty_tiers where id = (v_tier_after ->> 'tier_id')::uuid), 0)
         > coalesce((select min_value from public.loyalty_tiers where id = (v_tier_before ->> 'tier_id')::uuid), 0) then
      insert into public.guest_tier_events (guest_id, from_tier_id, to_tier_id, kind, stay_id, actor_id)
      values (v_primary, (v_tier_before ->> 'tier_id')::uuid, (v_tier_after ->> 'tier_id')::uuid,
              'auto_upgrade', v_stay, (select auth.uid()));
      v_upgraded := v_tier_after;
    end if;
  end if;

  if private.module_state(v_branch, 'consent') = 'on' and p_payload ? 'consents' then
    insert into public.guest_consents (guest_id, channel, granted, recorded_by)
    select v_primary, e.key, e.value::boolean, (select auth.uid())
    from jsonb_each_text(p_payload -> 'consents') e
    where e.key in ('zalo', 'sms', 'email', 'phone')
    on conflict (guest_id, channel) do update
      set granted = excluded.granted, recorded_at = now(), recorded_by = excluded.recorded_by;
  end if;

  return jsonb_build_object('stay_id', v_stay, 'guest_ids', to_jsonb(v_ids), 'backdated', v_backdated,
                            'tier', v_applied, 'upgraded_to', v_upgraded);
end $$;
```

### 2.3b Sales thêm khách, giao khách cho sales

Sales được **thêm** hồ sơ khách (khách tiềm năng, khách công ty liên hệ trước), **không được sửa** hồ sơ đã có. Nếu SĐT/giấy tờ đã tồn tại, RPC trả về hồ sơ cũ (bản che với sales không phụ trách) thay vì tạo trùng và không thay đổi gì trên hồ sơ đó. Khách do sales tạo có `sales_owner_id` = người tạo; quản lý giao lại được.

```sql
create or replace function public.create_guest(p jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_id       uuid;
  v_phone    text := nullif(p ->> 'phone', '');
  v_doc_type text := nullif(p -> 'document' ->> 'type', '');
  v_doc_no   text := upper(nullif(btrim(p -> 'document' ->> 'number'), ''));
begin
  perform private.assert_perm('guest.create');
  perform private.hit_rate_limit('create_guest', 30, 60);
  if v_phone is null and v_doc_no is null and nullif(p ->> 'phone_intl', '') is null then
    raise exception 'phone or document required' using errcode = 'P0422';
  end if;

  if v_doc_no is not null then
    select guest_id into v_id from public.guest_documents
    where doc_type = v_doc_type::public.doc_type and doc_number = v_doc_no;
  end if;
  if v_id is null and v_phone is not null then
    select id into v_id from public.guests where phone = v_phone and merged_into is null;
  end if;
  if v_id is not null then
    return jsonb_build_object('guest_id', v_id, 'existing', true);
  end if;

  v_id := private.upsert_guest(p - 'guest_id',
                             v_phone is not null or coalesce(nullif(p ->> 'nationality', ''), 'VN') <> 'VN', false);
  update public.guests set sales_owner_id = (select auth.uid()) where id = v_id;
  perform private.refresh_guest_stats(array[v_id]);
  return jsonb_build_object('guest_id', v_id, 'existing', false);
end $$;

create or replace function public.assign_sales_owner(p_guest_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_perm('guest.assign_owner');
  if p_user_id is not null and not exists (
    select 1 from public.user_effective_permissions
    where user_id = p_user_id and permission_key = 'guest.view_full_own') then
    raise exception 'user is not a sales owner' using errcode = 'P0422';
  end if;
  update public.guests set sales_owner_id = p_user_id where id = p_guest_id and merged_into is null;
  if not found then raise exception 'guest not found' using errcode = 'P0404'; end if;
end $$;
```

Giao diện hiển thị khách có `total_stays = 0` với nhãn **Khách tiềm năng**.

### 2.3c Hạng thành viên và giảm giá

Cơ chế (theo yêu cầu bổ sung 21/10/2026):

- **Danh sách hạng động** (`loyalty_tiers`): quản lý tự thêm/sửa/ẩn hạng, đặt tên (Đồng, Bạc, Vàng, Kim cương...), ngưỡng, **% giảm giá**, quyền lợi khác, màu hiển thị.
- **Quy tắc** (`app_settings['loyalty.rules']`):
  - `basis`: tính theo **số lần lưu trú** (`stays`) hoặc **số đêm** (`nights`).
  - `window_months`: chỉ tính lượt ở trong N tháng gần nhất; `0` = trọn đời (khách không bao giờ xuống hạng).
  - `count_current_stay`: `false` (mặc định) = lượt đang check-in chưa tính, giảm giá dựa trên các lần ở **trước**; lần này đủ ngưỡng thì **lên hạng từ lần sau**. `true` = tính luôn lượt hiện tại.
- **Tự nâng hạng khi check-in**: lễ tân nhập khách đã có trong hệ thống → thẻ khách hiện hạng hiện tại + % giảm giá áp cho lượt này. Lưu xong, nếu khách vừa vượt ngưỡng hạng cao hơn thì hệ thống ghi `guest_tier_events` (`auto_upgrade`) và báo "Khách vừa lên hạng Bạc – giảm 5% từ lần sau".
- **Ảnh chụp lúc check-in**: `stays.tier_id`, `stays.discount_pct` lưu hạng và % giảm giá tại thời điểm check-in, đổi cấu hình sau này không làm sai lịch sử. Lễ tân tích "Đã áp giảm giá trên ezCloud" (`discount_applied`) để chủ chuỗi theo dõi việc áp ưu đãi.
- **Gán hạng thủ công** (quyền `loyalty.override`): làm "sàn" (khách không thấp hơn hạng gán), có lý do và hạn dùng.
- App không giữ tiền phòng; % giảm giá là hướng dẫn cho lễ tân áp trên ezCloud.

```sql
-- Giá trị đo (số lần hoặc số đêm) của khách, không tính các lượt có id trong p_exclude
create or replace function private.guest_loyalty_value(p_guest_id uuid, p_exclude uuid default null)
returns int language sql stable security definer set search_path = '' as $$
  with cfg as (
    select coalesce(value ->> 'basis', 'stays') as basis,
           coalesce((value ->> 'window_months')::int, 0) as m
    from public.app_settings where key = 'loyalty.rules'
    union all select 'stays', 0
    limit 1
  )
  select coalesce(case when (select basis from cfg) = 'nights' then sum(s.nights) else count(*) end, 0)::int
  from public.stay_guests sg
  join public.stays s on s.id = sg.stay_id and s.status <> 'cancelled'
  where sg.guest_id = p_guest_id
    and (p_exclude is null or s.id <> p_exclude)
    and ((select m from cfg) = 0
         or s.business_date > (now() at time zone 'Asia/Ho_Chi_Minh')::date - make_interval(months => (select m from cfg)));
$$;

-- Hạng của khách: max(hạng theo ngưỡng, hạng gán tay còn hiệu lực)
create or replace function private.guest_tier(p_guest_id uuid, p_exclude uuid default null)
returns jsonb language sql stable security definer set search_path = '' as $$
  with v as (select private.guest_loyalty_value(p_guest_id, p_exclude) as val),
  earned as (
    select t.* from public.loyalty_tiers t, v
    where t.is_active and t.min_value <= v.val
    order by t.min_value desc limit 1
  ),
  manual as (
    select t.* from public.guests g join public.loyalty_tiers t on t.id = g.tier_override_id and t.is_active
    where g.id = p_guest_id
      and (g.tier_override_until is null or g.tier_override_until >= (now() at time zone 'Asia/Ho_Chi_Minh')::date)
  ),
  best as (
    select *, 'earned' as source from earned
    union all select *, 'manual' from manual
    order by min_value desc limit 1
  ),
  nxt as (
    select t.* from public.loyalty_tiers t, v
    where t.is_active and t.min_value > v.val
    order by t.min_value limit 1
  )
  select jsonb_build_object(
    'tier_id', b.id, 'tier', b.code, 'name', b.name, 'discount_pct', b.discount_pct,
    'benefits', b.benefits, 'color', b.color, 'source', b.source,
    'value', v.val,
    'basis', coalesce((select value ->> 'basis' from public.app_settings where key = 'loyalty.rules'), 'stays'),
    'next', (select jsonb_build_object('name', n.name, 'remaining', n.min_value - v.val, 'discount_pct', n.discount_pct)
             from nxt n))
  from v left join best b on true;
$$;

-- Gán / gỡ hạng thủ công
create or replace function public.set_guest_tier_override(
  p_guest_id uuid, p_tier_id uuid, p_reason text, p_until date default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_before jsonb := private.guest_tier(p_guest_id);
begin
  perform private.assert_perm('loyalty.override');
  if p_tier_id is not null and char_length(btrim(coalesce(p_reason, ''))) < 5 then
    raise exception 'reason required' using errcode = 'P0422';
  end if;
  update public.guests
     set tier_override_id = p_tier_id, tier_override_until = p_until,
         tier_override_reason = nullif(btrim(p_reason), ''), tier_override_by = (select auth.uid())
   where id = p_guest_id and merged_into is null;
  if not found then raise exception 'guest not found' using errcode = 'P0404'; end if;
  insert into public.guest_tier_events (guest_id, from_tier_id, to_tier_id, kind, actor_id, note)
  values (p_guest_id, (v_before ->> 'tier_id')::uuid, p_tier_id, 'manual', (select auth.uid()), p_reason);
  return private.guest_tier(p_guest_id);
end $$;

-- Lưu quy tắc hạng (basis, window_months, count_current_stay)
create or replace function public.set_loyalty_rules(p_rules jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_perm('loyalty.configure');
  if coalesce(p_rules ->> 'basis', '') not in ('stays', 'nights')
     or coalesce((p_rules ->> 'window_months')::int, -1) not between 0 and 120
     or jsonb_typeof(p_rules -> 'count_current_stay') <> 'boolean' then
    raise exception 'invalid loyalty rules' using errcode = 'P0422';
  end if;
  insert into public.app_settings (key, value, updated_by) values ('loyalty.rules', p_rules, (select auth.uid()))
  on conflict (key) do update set value = excluded.value, updated_by = excluded.updated_by, updated_at = now();
end $$;
```

`check_in_guest` (mục 2.3) gọi `guest_tier` hai lần ngay sau khi chèn `stay_guests`: một lần bỏ qua lượt vừa tạo (hạng trước), một lần tính cả (hạng sau), rồi lưu ảnh chụp hạng + % giảm vào lượt ở và ghi sự kiện lên hạng nếu có. RPC trả thêm `"tier": v_applied` (hạng + % giảm cho lượt này) và `"upgraded_to": v_upgraded` (null nếu không lên hạng) để giao diện hiện thông báo.

Ví dụ với cấu hình mẫu (tính theo số lần, Đồng ≥ 2, Bạc ≥ 5, Vàng ≥ 10; giảm 3% / 5% / 10%):

| Lần đến | Số lần trước đó | Hạng áp cho lượt này | Sau khi lưu |
| --- | --- | --- | --- |
| 1 | 0 | Thành viên, 0% | — |
| 2 | 1 | Thành viên, 0% | Lên **Đồng** (áp từ lần 3) |
| 3 | 2 | Đồng, 3% | — |
| 5 | 4 | Đồng, 3% | Lên **Bạc** |
| 6 | 5 | Bạc, 5% | — |
| 10 | 9 | Bạc, 5% | Lên **Vàng** |
| 11 | 10 | Vàng, 10% | — |

### 2.4 Tra cứu tại quầy (khớp chính xác)

```sql
-- p_kind: 'phone' | 'cccd' | 'passport'. Tìm bằng SĐT thì giấy tờ trả về đã che
-- (chống dò CCCD bằng cách gõ SĐT ngẫu nhiên); lễ tân đối chiếu thẻ thật.
create or replace function public.lookup_for_checkin(p_branch uuid, p_kind text, p_value text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_full_doc boolean := p_kind in ('cccd', 'passport');
begin
  perform private.assert_perm_at('stay.create', p_branch);
  perform private.hit_rate_limit('lookup', 120, 60);

  if p_kind = 'phone' then
    select id into v_id from public.guests where phone = p_value and merged_into is null;
  elsif p_kind in ('cccd', 'passport') then
    select guest_id into v_id from public.guest_documents
    where doc_type = p_kind::public.doc_type and doc_number = upper(p_value)
    limit 1;
  else
    raise exception 'invalid kind' using errcode = 'P0422';
  end if;

  if v_id is null then
    return jsonb_build_object('match', null);
  end if;

  return jsonb_build_object('match', (
    select jsonb_build_object(
      'id', g.id, 'full_name', g.full_name, 'gender', g.gender, 'dob', g.dob,
      'nationality', g.nationality, 'phone', g.phone, 'phone_intl', g.phone_intl, 'email', g.email,
      'address_line', g.address_line, 'province_code', g.province_code, 'ward_code', g.ward_code,
      'tags', g.tags,
      'tier', case when private.has_perm('loyalty.view', p_branch) then private.guest_tier(g.id) end,
      'documents', coalesce((
        select jsonb_agg(jsonb_build_object(
          'type', d.doc_type, 'country', d.issuing_country,
          'number', case when v_full_doc then d.doc_number else private.mask_doc(d.doc_number) end))
        from public.guest_documents d where d.guest_id = g.id), '[]'::jsonb),
      'stats', (select jsonb_build_object('total_stays', s.total_stays, 'total_nights', s.total_nights,
                                          'last_stay_at', s.last_stay_at, 'last_branch', b.name)
                from public.guest_stats s left join public.branches b on b.id = s.last_branch_id
                where s.guest_id = g.id),
      'notes', coalesce((
        select jsonb_agg(jsonb_build_object('body', n.body, 'kind', n.kind, 'branch', b.name,
                                            'author', pr.full_name, 'at', n.created_at)
                         order by n.created_at desc)
        from (select * from public.guest_notes where guest_id = g.id and deleted_at is null
              order by created_at desc limit 5) n
        left join public.branches b on b.id = n.branch_id
        left join public.profiles pr on pr.id = n.created_by), '[]'::jsonb),
      'flags', case when private.has_perm('blacklist.view', p_branch) then coalesce((
        select jsonb_agg(jsonb_build_object('type', f.flag_type, 'status', f.status,
                                            'reason', f.reason, 'branch', b.name, 'at', f.proposed_at))
        from public.guest_flags f join public.branches b on b.id = f.branch_id
        where f.guest_id = g.id and f.status in ('proposed', 'approved')), '[]'::jsonb)
        else '[]'::jsonb end)
    from public.guests g where g.id = v_id));
end $$;
```

### 2.5 Tìm kiếm toàn chuỗi

```sql
create or replace function public.search_guests(p_mode text, p_query text, p_limit int default 20)
returns table (
  id uuid, full_name text, gender public.gender, birth_year int, nationality char(2),
  phone text, doc_masked text, email text, tags text[],
  total_stays int, total_nights int, last_stay_at timestamptz, last_branch_name text,
  has_blacklist boolean, has_attention boolean, tier text, ord bigint
)
language plpgsql security definer set search_path = '' as $$
declare
  q       text := btrim(p_query);
  v_limit int  := least(greatest(coalesce(p_limit, 20), 1), 50);
  v_flags boolean := private.has_perm('blacklist.view');
  v_tier  boolean := private.has_perm('loyalty.view');
  v_ids   uuid[];
  v_norm  text;
begin
  perform private.assert_perm('guest.search');
  perform private.hit_rate_limit('search', 60, 60);

  if p_mode = 'phone' then
    v_ids := array(select g.id from public.guests g
                   where g.merged_into is null and g.phone = q limit v_limit);
  elsif p_mode = 'phone_suffix' then
    if length(q) < 4 then raise exception 'query too short' using errcode = 'P0422'; end if;
    v_ids := array(select g.id from public.guests g
                   where g.merged_into is null and g.phone like '%' || private.like_escape(q)
                   order by g.updated_at desc limit v_limit);
  elsif p_mode in ('cccd', 'passport') then
    v_ids := array(select d.guest_id from public.guest_documents d
                   where d.doc_type = p_mode::public.doc_type and d.doc_number = upper(q) limit v_limit);
  elsif p_mode = 'doc_suffix' then
    if length(q) < 6 then raise exception 'query too short' using errcode = 'P0422'; end if;
    v_ids := array(select distinct d.guest_id from public.guest_documents d
                   where d.doc_number like '%' || private.like_escape(upper(q)) limit v_limit);
  elsif p_mode = 'email' then
    if length(q) < 3 then raise exception 'query too short' using errcode = 'P0422'; end if;
    v_ids := array(select g.id from public.guests g
                   where g.merged_into is null and g.email like private.like_escape(lower(q)) || '%'
                   limit v_limit);
  elsif p_mode = 'name' then
    v_norm := private.normalize_search(q);
    if length(v_norm) < 2 then raise exception 'query too short' using errcode = 'P0422'; end if;
    v_ids := array(
      select g.id from public.guests g
      where g.merged_into is null
        and g.search_name like all (
          array(select '%' || private.like_escape(w) || '%' from regexp_split_to_table(v_norm, ' ') w))
      order by extensions.similarity(g.search_name, v_norm) desc, g.updated_at desc
      limit v_limit);
  else
    raise exception 'invalid mode' using errcode = 'P0422';
  end if;

  return query
  select g.id, g.full_name, g.gender, extract(year from g.dob)::int, g.nationality,
         g.phone,
         (select private.mask_doc(d.doc_number) from public.guest_documents d
          where d.guest_id = g.id order by (d.doc_type = 'cccd') desc, d.created_at desc limit 1),
         g.email, g.tags,
         coalesce(s.total_stays, 0), coalesce(s.total_nights, 0), s.last_stay_at, b.name,
         v_flags and exists (select 1 from public.guest_flags f where f.guest_id = g.id
                             and f.flag_type = 'blacklist' and f.status = 'approved'),
         v_flags and exists (select 1 from public.guest_flags f where f.guest_id = g.id
                             and ((f.flag_type = 'attention' and f.status = 'approved')
                                  or (f.flag_type = 'blacklist' and f.status = 'proposed'))),
         case when v_tier then private.guest_tier(g.id) ->> 'name' end,
         t.ord
  from unnest(v_ids) with ordinality as t(gid, ord)
  join public.guests g          on g.id = t.gid and g.merged_into is null
  left join public.guest_stats s on s.guest_id = g.id
  left join public.branches b    on b.id = s.last_branch_id
  order by t.ord;
end $$;
```

### 2.6 Hồ sơ 360°

```sql
create or replace function public.get_guest_profile(p_guest_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_g    public.guests;
  v_full boolean;
begin
  perform private.assert_perm('guest.view_summary');
  select * into v_g from public.guests where id = p_guest_id;
  if not found then raise exception 'guest not found' using errcode = 'P0404'; end if;
  if v_g.merged_into is not null then
    return jsonb_build_object('redirect_to', v_g.merged_into);
  end if;

  v_full := private.has_perm('guest.view_full')
            or (v_g.sales_owner_id = (select auth.uid()) and private.has_perm('guest.view_full_own'));
  if v_full then
    perform private.log_event('guest.view_full', 'guests', p_guest_id);
  end if;

  return jsonb_build_object(
    'guest', jsonb_build_object(
      'id', v_g.id, 'full_name', v_g.full_name, 'gender', v_g.gender,
      'dob', case when v_full then v_g.dob end, 'birth_year', extract(year from v_g.dob),
      'nationality', v_g.nationality, 'phone', v_g.phone, 'phone_intl', v_g.phone_intl,
      'email', v_g.email,
      'address_line', case when v_full then v_g.address_line end,
      'province_code', v_g.province_code, 'ward_code', case when v_full then v_g.ward_code end,
      'tags', v_g.tags, 'created_at', v_g.created_at, 'updated_at', v_g.updated_at,
      'sales_owner', (select jsonb_build_object('id', pr.id, 'name', pr.full_name)
                      from public.profiles pr where pr.id = v_g.sales_owner_id)),
    'tier', case when private.has_perm('loyalty.view') then private.guest_tier(p_guest_id) end,
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
      select jsonb_agg(jsonb_build_object('id', c.id, 'full_name', c.full_name, 'times', c.n) order by c.n desc)
      from (
        select g2.id, g2.full_name, count(*) as n
        from public.stay_guests a
        join public.stay_guests o on o.stay_id = a.stay_id and o.guest_id <> a.guest_id
        join public.guests g2     on g2.id = o.guest_id and g2.merged_into is null
        where a.guest_id = p_guest_id
        group by g2.id, g2.full_name
        order by n desc limit 10) c), '[]'::jsonb),
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
      'propose_merge', private.has_perm('merge.propose'))
  );
end $$;
```

### 2.7 Hủy lượt ở

```sql
create or replace function public.cancel_stay(p_stay_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_stay public.stays;
begin
  select * into v_stay from public.stays where id = p_stay_id for update;
  if not found then raise exception 'stay not found' using errcode = 'P0404'; end if;

  if v_stay.created_at > now() - make_interval(hours =>
       coalesce((select (value #>> '{}')::int from public.app_settings where key = 'stay.self_cancel_hours'), 6)) then
    perform private.assert_perm_at('stay.cancel', v_stay.branch_id);
  else
    perform private.assert_perm_at('stay.cancel_late', v_stay.branch_id);
  end if;

  if v_stay.status = 'cancelled' then
    raise exception 'already cancelled' using errcode = 'P0409';
  end if;
  if v_stay.entry_mode = 'backdated' then
    perform private.assert_perm_at('stay.create_past', v_stay.branch_id);   -- chỉ người nhập bù được hủy bản nhập bù
  end if;
  if char_length(btrim(coalesce(p_reason, ''))) < 5 then
    raise exception 'reason required' using errcode = 'P0422';
  end if;

  update public.stays
     set status = 'cancelled', cancel_reason = btrim(p_reason), updated_by = (select auth.uid())
   where id = p_stay_id;
  -- trigger stays_after_change tự giảm guest_stats.total_stays
end $$;
```

`update_stay` dùng khóa lạc quan: client gửi `expected_updated_at` (giá trị `updated_at` lúc mở form); nếu khác giá trị hiện tại thì `raise ... errcode = 'P0409'` để tránh hai lễ tân ghi đè nhau.

### 2.8 Gộp hồ sơ

```sql
create or replace function private.merge_guests(p_keep uuid, p_drop uuid, p_choices jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_drop public.guests;
  f text;
begin
  -- khóa cả hai theo thứ tự id để tránh deadlock
  perform 1 from public.guests where id in (p_keep, p_drop) and merged_into is null
  order by id for update;
  if (select count(*) from public.guests where id in (p_keep, p_drop) and merged_into is null) <> 2 then
    raise exception 'both guests must be active' using errcode = 'P0409';
  end if;
  select * into v_drop from public.guests where id = p_drop;

  -- giải phóng SĐT của hồ sơ bị gộp trước để không vi phạm unique
  update public.guests set phone = null where id = p_drop;

  foreach f in array array['full_name','gender','dob','nationality','phone','phone_intl','email',
                           'address_line','province_code','ward_code'] loop
    if p_choices ->> f = 'drop' then
      execute format('update public.guests set %1$I = ($1).%1$I where id = $2', f) using v_drop, p_keep;
    end if;
  end loop;

  update public.guests k set tags = array(select distinct unnest(k.tags || v_drop.tags))
  where k.id = p_keep;

  update public.guest_documents set guest_id = p_keep where guest_id = p_drop;

  -- lượt ở chung: nếu cả hai cùng trong một lượt thì giữ một dòng
  delete from public.stay_guests d
  where d.guest_id = p_drop
    and exists (select 1 from public.stay_guests k where k.stay_id = d.stay_id and k.guest_id = p_keep);
  update public.stay_guests set guest_id = p_keep where guest_id = p_drop;

  update public.guest_notes set guest_id = p_keep where guest_id = p_drop;
  update public.guest_flags set guest_id = p_keep where guest_id = p_drop;
  insert into public.guest_consents (guest_id, channel, granted, recorded_at, recorded_by, source)
  select p_keep, channel, granted, recorded_at, recorded_by, source
  from public.guest_consents where guest_id = p_drop
  on conflict (guest_id, channel) do update
    set granted = excluded.granted, recorded_at = excluded.recorded_at
    where public.guest_consents.recorded_at < excluded.recorded_at;
  delete from public.guest_consents where guest_id = p_drop;

  update public.merge_requests set status = 'rejected', decided_at = now()
  where status = 'pending' and (keep_guest_id = p_drop or drop_guest_id = p_drop);

  update public.guests set merged_into = p_keep where id = p_drop;
  perform private.refresh_guest_stats(array[p_keep, p_drop]);
  perform private.log_event('guest.merge', 'guests', p_keep, null,
                            jsonb_build_object('dropped', p_drop, 'choices', p_choices));
end $$;

create or replace function public.approve_merge(p_request_id uuid, p_field_choices jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  r public.merge_requests;
begin
  perform private.assert_perm('merge.approve');
  perform private.assert_aal2();
  select * into r from public.merge_requests where id = p_request_id and status = 'pending' for update;
  if not found then raise exception 'request not pending' using errcode = 'P0409'; end if;

  perform private.merge_guests(r.keep_guest_id, r.drop_guest_id, coalesce(p_field_choices, '{}'::jsonb));
  update public.merge_requests
     set status = 'approved', field_choices = p_field_choices,
         decided_by = (select auth.uid()), decided_at = now()
   where id = p_request_id;
end $$;
```

### 2.8b Xuất Excel danh sách khách

Theo quyết định của CĐT, lễ tân và quản lý đều được xuất Excel. Để giảm rủi ro lộ dữ liệu, phạm vi xuất giới hạn ở tầng DB:

- Chỉ ra khách **từng ở các cơ sở mà người xuất có quyền `guest.export`** (lễ tân: cơ sở mình; quản lý toàn chuỗi: mọi cơ sở).
- Số dòng tối đa: `export.max_rows_branch` (500) nếu người xuất không có quyền ở mọi cơ sở, `export.max_rows_chain` (5.000) nếu có.
- CCCD/Passport luôn che, trừ khi có `guest.export_full` và phiên đã MFA.
- Mỗi lần xuất ghi `audit_logs` (bộ lọc + số dòng). Route Handler `/api/export/guests` gọi RPC rồi dựng file `.xlsx` bằng `exceljs` trên server.

```sql
-- p_filters: {"branch_ids": [...]?, "stayed_from": "2026-01-01"?, "stayed_to": "2026-12-31"?, "tag": "VIP"?, "nationality": "KR"?}
create or replace function public.export_guests(p_filters jsonb default '{}')
returns table (
  full_name text, gender public.gender, dob date, nationality char(2), phone text, email text,
  document text, province_code text, tags text[], total_stays int, total_nights int,
  last_stay_at timestamptz, last_branch text
)
language plpgsql security definer set search_path = '' as $$
declare
  v_allowed  uuid[] := array(select private.branches_with('guest.export'));
  v_branches uuid[];
  v_is_chain boolean;
  v_full     boolean;
  v_limit    int;
  v_count    int;
begin
  perform private.assert_perm('guest.export');
  perform private.hit_rate_limit('export', 5, 600);

  v_is_chain := not exists (select 1 from public.branches b where b.is_active and b.id <> all (v_allowed));
  v_branches := case when p_filters ? 'branch_ids'
                     then array(select x::uuid from jsonb_array_elements_text(p_filters -> 'branch_ids') x
                                where x::uuid = any (v_allowed))
                     else v_allowed end;
  v_full := private.has_perm('guest.export_full')
            and coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2';
  v_limit := coalesce((select (value #>> '{}')::int from public.app_settings
                       where key = case when v_is_chain then 'export.max_rows_chain' else 'export.max_rows_branch' end),
                      case when v_is_chain then 5000 else 500 end);

  return query
  with eligible as (
    select distinct sg.guest_id
    from public.stays s
    join public.stay_guests sg on sg.stay_id = s.id
    where s.status <> 'cancelled'
      and s.branch_id = any (v_branches)
      and (not p_filters ? 'stayed_from' or s.business_date >= (p_filters ->> 'stayed_from')::date)
      and (not p_filters ? 'stayed_to'   or s.business_date <= (p_filters ->> 'stayed_to')::date)
  )
  select g.full_name, g.gender, g.dob, g.nationality, g.phone, g.email,
         (select case when v_full then d.doc_number else private.mask_doc(d.doc_number) end
          from public.guest_documents d where d.guest_id = g.id
          order by (d.doc_type = 'cccd') desc, d.created_at desc limit 1),
         g.province_code, g.tags,
         coalesce(st.total_stays, 0), coalesce(st.total_nights, 0), st.last_stay_at, b.name
  from eligible e
  join public.guests g on g.id = e.guest_id and g.merged_into is null
  left join public.guest_stats st on st.guest_id = g.id
  left join public.branches b     on b.id = st.last_branch_id
  where (not p_filters ? 'tag' or (p_filters ->> 'tag') = any (g.tags))
    and (not p_filters ? 'nationality' or g.nationality = (p_filters ->> 'nationality'))
  order by st.last_stay_at desc nulls last
  limit v_limit;

  get diagnostics v_count = row_count;
  perform private.log_event(case when v_full then 'guest.export_full' else 'guest.export' end,
                            'guests', null, null,
                            jsonb_build_object('filters', p_filters, 'rows', v_count, 'limit', v_limit));
end $$;
```

### 2.9 Cấp quyền gọi RPC

```sql
do $$
declare fn text;
begin
  foreach fn in array array[
    'public.lookup_for_checkin(uuid, text, text)',
    'public.check_in_guest(jsonb)',
    'public.create_guest(jsonb)',
    'public.assign_sales_owner(uuid, uuid)',
    'public.set_guest_tier_override(uuid, uuid, text, date)',
    'public.set_loyalty_rules(jsonb)',
    'public.export_guests(jsonb)',
    'public.cancel_stay(uuid, text)',
    'public.search_guests(text, text, int)',
    'public.get_guest_profile(uuid)',
    'public.approve_merge(uuid, jsonb)'
    -- thêm mọi RPC public mới vào đây
  ] loop
    execute format('revoke all on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end $$;
```

## 3. Job hằng đêm

```sql
-- 20261101000011_cron.sql
-- Cặp đã từng được đề xuất (dù đã duyệt hay từ chối) thì không đề xuất lại
create or replace function private.pair_seen(p_a uuid, p_b uuid)
returns boolean language sql stable set search_path = '' as $$
  select exists (
    select 1 from public.merge_requests m
    where least(m.keep_guest_id, m.drop_guest_id) = least(p_a, p_b)
      and greatest(m.keep_guest_id, m.drop_guest_id) = greatest(p_a, p_b));
$$;

create or replace function private.detect_duplicates()
returns void language sql security definer set search_path = '' as $$
  -- 1. Cùng tên không dấu + cùng ngày sinh
  insert into public.merge_requests (keep_guest_id, drop_guest_id, source, match_reason)
  select a.id, b.id, 'system', 'same_name_dob'
  from public.guests a
  join public.guests b on b.search_name = a.search_name and b.dob = a.dob and b.id > a.id
  where a.merged_into is null and b.merged_into is null and a.dob is not null
    and not private.pair_seen(a.id, b.id)
  on conflict do nothing;

  -- 2. CCCD lệch đúng 1 chữ số, cùng mã tỉnh
  insert into public.merge_requests (keep_guest_id, drop_guest_id, source, match_reason)
  select distinct a.guest_id, b.guest_id, 'system', 'cccd_one_digit'
  from public.guest_documents a
  join public.guest_documents b
    on b.doc_type = 'cccd' and left(b.doc_number, 3) = left(a.doc_number, 3)
   and b.guest_id > a.guest_id
   and extensions.levenshtein(a.doc_number, b.doc_number) = 1
  where a.doc_type = 'cccd'
    and not private.pair_seen(a.guest_id, b.guest_id)
  on conflict do nothing;
$$;

select cron.schedule('detect-duplicates', '0 20 * * *', $$select private.detect_duplicates()$$);      -- 03:00 giờ VN
select cron.schedule('rebuild-permissions', '30 20 * * *', $$select private.rebuild_all_permissions()$$);
select cron.schedule('rate-limit-cleanup', '*/30 * * * *',
  $$delete from private.rate_limits where window_start < now() - interval '1 hour'$$);
```

Ghi chú: `pg_cron` chạy theo UTC. Khi dữ liệu vượt ~200.000 hồ sơ, chuyển truy vấn (2) sang so sánh theo từng tỉnh hoặc chỉ xét giấy tờ tạo trong 24h qua.

## 4. Domain thuần (TypeScript)

### 4.1 CCCD

```ts
// src/features/guests/domain/cccd.ts
// Cấu trúc 12 số: [3 mã tỉnh nơi đăng ký khai sinh][1 mã thế kỷ + giới tính][2 năm sinh][6 số ngẫu nhiên]
const PROVINCE_CODES = new Set([
  '001','002','004','006','008','010','011','012','014','015','017','019','020','022','024','025',
  '026','027','030','031','033','034','035','036','037','038','040','042','044','045','046','048',
  '049','051','052','054','056','058','060','062','064','066','067','068','070','072','074','075',
  '077','079','080','082','083','084','086','087','089','091','092','093','094','095','096',
]);

export type CccdCheck =
  | { ok: false; error: 'format' | 'province' }
  | { ok: true; gender: 'male' | 'female'; birthYear: number; warnings: ('gender_mismatch' | 'year_mismatch')[] };

export function checkCccd(value: string, ctx?: { gender?: 'male' | 'female' | 'other'; dob?: Date }): CccdCheck {
  if (!/^\d{12}$/.test(value)) return { ok: false, error: 'format' };
  if (!PROVINCE_CODES.has(value.slice(0, 3))) return { ok: false, error: 'province' };

  const code = Number(value[3]);                       // 0/1 → 1900s, 2/3 → 2000s, 4/5 → 2100s...
  const century = 1900 + Math.floor(code / 2) * 100;
  const gender = code % 2 === 0 ? 'male' : 'female';
  const birthYear = century + Number(value.slice(4, 6));

  const warnings: ('gender_mismatch' | 'year_mismatch')[] = [];
  if (ctx?.gender && ctx.gender !== 'other' && ctx.gender !== gender) warnings.push('gender_mismatch');
  if (ctx?.dob && ctx.dob.getFullYear() !== birthYear) warnings.push('year_mismatch');
  return { ok: true, gender, birthYear, warnings };
}
```

Sai định dạng hoặc mã tỉnh = lỗi chặn lưu. Lệch giới tính/năm sinh = cảnh báo, lễ tân bấm "Vẫn lưu" (thẻ thật có thể có sai sót).

### 4.2 SĐT, tên

```ts
// src/features/guests/domain/normalize.ts
export function normalizeVnPhone(input: string): string | null {
  let d = input.replace(/\D/g, '');
  if (d.startsWith('0084')) d = '0' + d.slice(4);
  else if (d.startsWith('84') && d.length === 11) d = '0' + d.slice(2);
  return /^0[35789]\d{8}$/.test(d) ? d : null;
}

export function normalizeName(input: string): string {
  return input
    .normalize('NFC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('vi')
    .replace(/(^|\s)\p{L}/gu, (m) => m.toLocaleUpperCase('vi'));
}

export function stripVietnamese(input: string): string {
  return input.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
}
```

### 4.3 Nhận dạng từ khoá tìm kiếm

```ts
// src/features/search/domain/classify.ts
import { normalizeVnPhone } from '@/features/guests';

export type SearchMode = 'phone' | 'phone_suffix' | 'cccd' | 'doc_suffix' | 'passport' | 'email' | 'name';

export function classifyQuery(raw: string): { mode: SearchMode; value: string } | null {
  const q = raw.trim();
  if (q.length < 2) return null;
  if (q.includes('@')) return { mode: 'email', value: q.toLowerCase() };

  const digits = q.replace(/[\s.+-]/g, '');
  if (/^\d+$/.test(digits)) {
    if (digits.length === 12) return { mode: 'cccd', value: digits };
    const phone = normalizeVnPhone(digits);
    if (phone) return { mode: 'phone', value: phone };
    if (digits.length >= 6) return { mode: 'doc_suffix', value: digits };
    if (digits.length >= 4) return { mode: 'phone_suffix', value: digits };
    return null;
  }
  if (/^[A-Za-z]{1,2}\d{6,9}$/.test(q)) return { mode: 'passport', value: q.toUpperCase() };
  return { mode: 'name', value: q };
}
```

Bảng test bắt buộc cho `classifyQuery`: `0905123456`, `+84 905 123 456`, `046090001234`, `1234`, `001234`, `C1234567`, `an@x.vn`, `nguyễn văn a`, `Lan`, `a`.

### 4.4 Hạng thành viên (xem trước trên giao diện cấu hình)

```ts
// src/features/loyalty/domain/tier.ts
export type TierDef = { id: string; name: string; minValue: number; discountPct: number };

/** Hạng tương ứng một giá trị đo (số lần hoặc số đêm); tiers có thể chưa sắp xếp */
export function tierFor(value: number, tiers: TierDef[]): TierDef | null {
  return [...tiers].sort((a, b) => b.minValue - a.minValue).find((t) => value >= t.minValue) ?? null;
}

/** Bảng xem trước "lần thứ n → hạng, % giảm" khi quản lý chỉnh ngưỡng */
export function preview(tiers: TierDef[], countCurrentStay: boolean, upTo = 12) {
  return Array.from({ length: upTo }, (_, i) => {
    const visit = i + 1;
    const applied = tierFor(countCurrentStay ? visit : visit - 1, tiers);
    const after = tierFor(visit, tiers);
    return { visit, applied: applied?.name, discountPct: applied?.discountPct ?? 0,
             upgradedTo: after && after.id !== applied?.id ? after.name : null };
  });
}
```

Validate cấu hình (Zod + kiểm tra trong `saveLoyaltyConfig`): ngưỡng không trùng nhau; hạng có ngưỡng cao hơn thì % giảm không thấp hơn; luôn có một hạng ngưỡng 0. Hạng thật luôn do RPC `private.guest_tier` tính.

## 5. Zod schema dùng chung

```ts
// src/features/check-in/schemas.ts
import { z } from 'zod';
import { checkCccd } from '@/features/guests';

const documentSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('cccd'), number: z.string().regex(/^\d{12}$/), country: z.literal('VN') }),
  z.object({ type: z.literal('passport'), number: z.string().regex(/^[A-Z0-9]{6,12}$/), country: z.string().length(2) }),
]).refine((d) => d.type !== 'cccd' || checkCccd(d.number).ok, { message: 'CCCD không hợp lệ' });

export const guestInputSchema = z.object({
  guestId: z.string().uuid().optional(),
  fullName: z.string().min(2).max(120),
  gender: z.enum(['male', 'female', 'other']),
  dob: z.coerce.date().min(new Date('1900-01-01')).max(new Date()).optional(),
  nationality: z.string().length(2).default('VN'),
  phone: z.string().regex(/^0[35789]\d{8}$/).optional(),
  phoneIntl: z.string().regex(/^\+[1-9]\d{6,14}$/).optional(),
  email: z.string().email().toLowerCase().optional(),
  addressLine: z.string().max(200).optional(),
  provinceCode: z.string().optional(),
  wardCode: z.string().optional(),
  document: documentSchema.optional(),
});

export const checkInSchema = z.object({
  branchId: z.string().uuid(),
  roomId: z.string().uuid(),
  checkInAt: z.coerce.date().optional(),
  expectedCheckOutAt: z.coerce.date(),
  checkedOutAt: z.coerce.date().optional(),           // bắt buộc khi nhập bù quá khứ
  sourceChannelId: z.string().uuid({ message: 'Chọn nguồn khách' }),
  partnerId: z.string().uuid().optional(),             // bắt buộc nếu kênh yêu cầu đối tác (kiểm tra lại ở RPC)
  sourceDetail: z.string().max(120).optional(),
  note: z.string().max(1000).optional(),
  blacklistAck: z.boolean().default(false),
  primary: guestInputSchema.refine((g) => g.nationality !== 'VN' || !!g.phone, {
    message: 'Khách Việt Nam đứng tên phải có SĐT', path: ['phone'],
  }),
  companions: z.array(guestInputSchema.refine((g) => !!g.guestId || !!g.document, {
    message: 'Người đi cùng cần CCCD hoặc Passport', path: ['document'],
  })).max(10).default([]),
  consents: z.partialRecord(z.enum(['zalo', 'sms', 'email', 'phone']), z.boolean()).optional(),
}).refine((v) => !v.checkInAt || v.expectedCheckOutAt > v.checkInAt, {
  message: 'Ngày đi phải sau ngày đến', path: ['expectedCheckOutAt'],
}).refine((v) => !v.checkInAt || v.checkInAt.getTime() <= Date.now() + 3_600_000, {
  message: 'Giờ nhận phòng không được ở tương lai', path: ['checkInAt'],
});

// Sales thêm khách: cần ít nhất SĐT hoặc giấy tờ
export const createGuestSchema = guestInputSchema.omit({ guestId: true }).refine(
  (g) => !!g.phone || !!g.phoneIntl || !!g.document,
  { message: 'Cần SĐT hoặc CCCD/Passport', path: ['phone'] },
);

export type CheckInInput = z.infer<typeof checkInSchema>;
```

`features/check-in/domain/payload.ts` có hàm `toRpcPayload(input: CheckInInput)` chuyển camelCase → snake_case đúng định dạng `p_payload` ở mục 2.3. Hàm thuần, có unit test.
