-- Migration 58: Fix 34 provinces 2025 according to Decision 19/2025/QĐ-TTg,
-- and fix guest_profile / update_guest for unstayed guests & masked phone safety.

-- 1. Cập nhật danh mục 34 tỉnh/thành phố 2025 chuẩn Quyết định 19/2025/QĐ-TTg
-- Đảm bảo an toàn FK cho guests
delete from public.admin_provinces
where code not in (
  '01','04','08','11','12','14','15','19','20','22','24','25','31','33','37',
  '38','40','42','44','46','48','51','52','56','66','68','75','79','80','82',
  '86','91','92','96'
);

insert into public.admin_provinces (code, name)
values
  ('01', 'Hà Nội'),
  ('04', 'Cao Bằng'),
  ('08', 'Tuyên Quang'),
  ('11', 'Điện Biên'),
  ('12', 'Lai Châu'),
  ('14', 'Sơn La'),
  ('15', 'Lào Cai'),
  ('19', 'Thái Nguyên'),
  ('20', 'Lạng Sơn'),
  ('22', 'Quảng Ninh'),
  ('24', 'Bắc Ninh'),
  ('25', 'Phú Thọ'),
  ('31', 'Hải Phòng'),
  ('33', 'Hưng Yên'),
  ('37', 'Ninh Bình'),
  ('38', 'Thanh Hóa'),
  ('40', 'Nghệ An'),
  ('42', 'Hà Tĩnh'),
  ('44', 'Quảng Trị'),
  ('46', 'Huế'),
  ('48', 'Đà Nẵng'),
  ('51', 'Quảng Ngãi'),
  ('52', 'Gia Lai'),
  ('56', 'Khánh Hòa'),
  ('66', 'Đắk Lắk'),
  ('68', 'Lâm Đồng'),
  ('75', 'Đồng Nai'),
  ('79', 'TP.HCM'),
  ('80', 'Tây Ninh'),
  ('82', 'Đồng Tháp'),
  ('86', 'Vĩnh Long'),
  ('91', 'An Giang'),
  ('92', 'Cần Thơ'),
  ('96', 'Cà Mau')
on conflict (code) do update
set name = excluded.name;

-- 2. Cập nhật RPC public.guest_profile(uuid):
-- - Cho phép nhân viên có quyền guest.view_full tại cơ sở xem full thông tin cả với khách chưa có lượt ở nào (v_branch_id is null).
-- - Luôn trả về address_line để form chỉnh sửa không bị mất địa chỉ.
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
            or (v_branch_id is null and exists (select 1 from private.branches_with('guest.view_full')))
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
      'address_line', v_g.address_line,
      'province_code', v_g.province_code,
      'ward_code', case when v_full then v_g.ward_code end,
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
    ), '[]'::jsonb) end,
    'stats', (select row_to_json(s) from public.guest_stats s where s.guest_id = p_guest_id),
    'documents', case when v_full then (
      select coalesce(jsonb_agg(jsonb_build_object(
        'type', d.type, 'number', d.number, 'country', d.country,
        'issue_date', d.issue_date, 'expiry_date', d.expiry_date,
        'verified_at', d.verified_at, 'created_at', d.created_at)), '[]'::jsonb)
      from public.guest_documents d where d.guest_id = p_guest_id
    ) else (
      select coalesce(jsonb_agg(jsonb_build_object(
        'type', d.type,
        'number', case
          when length(d.number) >= 8 then overlay(d.number placing '******' from 4 for 6)
          else '******'
        end,
        'country', d.country, 'created_at', d.created_at)), '[]'::jsonb)
      from public.guest_documents d where d.guest_id = p_guest_id
    ) end,
    'stays', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', st.id, 'branch', (select name from public.branches where id = st.branch_id),
        'room', (select number from public.rooms where id = st.room_id),
        'check_in_at', st.check_in_at, 'checked_out_at', st.checked_out_at,
        'status', st.status, 'nights', st.nights)), '[]'::jsonb)
      from public.stays st
      where st.id in (select stay_id from public.stay_guests where guest_id = p_guest_id)
      order by st.check_in_at desc
    ),
    'notes', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', n.id, 'kind', n.kind, 'body', n.body, 'created_at', n.created_at,
        'author', (select full_name from public.profiles where id = n.created_by))), '[]'::jsonb)
      from public.guest_notes n where n.guest_id = p_guest_id
    ),
    'flags', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', f.id, 'status', f.status, 'reason', f.reason, 'created_at', f.created_at,
        'created_by', (select full_name from public.profiles where id = f.created_by))), '[]'::jsonb)
      from public.guest_flags f where f.guest_id = p_guest_id
    ),
    'consents', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'channel', c.channel, 'status', c.status, 'updated_at', c.updated_at)), '[]'::jsonb)
      from public.guest_consents c where c.guest_id = p_guest_id
    )
  );
end $function$;

-- 3. Cập nhật RPC public.update_guest: Bỏ qua cập nhật số điện thoại nếu chứa dấu '*' (masked phone)
create or replace function public.update_guest(
  p_guest_id uuid,
  p_patch jsonb,
  p_expected_updated_at timestamptz
)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_g public.guests;
  v_name text;
  v_phone text;
  v_email text;
  v_source_id uuid;
begin
  perform private.assert_perm('guest.update');

  select * into v_g from public.guests where id = p_guest_id for update;
  if not found then
    raise exception 'guest not found' using errcode = 'P0404';
  end if;

  if p_expected_updated_at is not null and v_g.updated_at <> p_expected_updated_at then
    raise exception 'conflict updating guest' using errcode = 'P0409';
  end if;

  v_name  := coalesce(nullif(btrim(p_patch ->> 'full_name'), ''), v_g.full_name);
  
  -- Nếu phone gửi lên chứa '*' (chuỗi mặt nạ bảo mật) -> giữ nguyên phone cũ trong DB
  if p_patch ? 'phone' and nullif(btrim(p_patch ->> 'phone'), '') is not null and (p_patch ->> 'phone') not like '%*%' then
    v_phone := btrim(p_patch ->> 'phone');
  else
    v_phone := v_g.phone;
  end if;

  v_email := coalesce(nullif(btrim(p_patch ->> 'email'), ''), v_g.email);

  if v_phone is not null and v_phone <> coalesce(v_g.phone, '') then
    if exists (select 1 from public.guests where phone = v_phone and id <> p_guest_id and merged_into is null) then
      raise exception 'phone already exists' using errcode = 'P0411';
    end if;
  end if;

  v_source_id := case
                   when p_patch ? 'source_channel_id' then nullif(p_patch ->> 'source_channel_id', '')::uuid
                   else v_g.source_channel_id
                 end;

  update public.guests
  set full_name = v_name,
      search_name = private.normalize_search(v_name),
      gender = coalesce((p_patch ->> 'gender')::public.gender, v_g.gender),
      dob = case when p_patch ? 'dob' then (p_patch ->> 'dob')::date else v_g.dob end,
      nationality = coalesce(nullif(p_patch ->> 'nationality', ''), v_g.nationality),
      phone = v_phone,
      phone_intl = case when p_patch ? 'phone_intl' then nullif(p_patch ->> 'phone_intl', '') else v_g.phone_intl end,
      email = v_email,
      address_line = case when p_patch ? 'address_line' then nullif(p_patch ->> 'address_line', '') else v_g.address_line end,
      province_code = case when p_patch ? 'province_code' then nullif(p_patch ->> 'province_code', '') else v_g.province_code end,
      ward_code = case when p_patch ? 'ward_code' then nullif(p_patch ->> 'ward_code', '') else v_g.ward_code end,
      source_channel_id = v_source_id,
      updated_at = now()
  where id = p_guest_id;

  perform private.log_event('guest.update', 'guests', p_guest_id, null, p_patch);

  return jsonb_build_object('id', p_guest_id, 'updated', true);
end $$;

grant execute on function public.update_guest(uuid, jsonb, timestamptz) to authenticated;
grant execute on function public.guest_profile(uuid) to authenticated;

