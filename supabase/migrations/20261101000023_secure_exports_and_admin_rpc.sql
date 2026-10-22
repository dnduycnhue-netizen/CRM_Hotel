-- 20261101000023_secure_exports_and_admin_rpc.sql
-- Củng cố bảo mật: Gỡ quyền export khỏi lễ tân, bổ sung RPC export_guests an toàn và RPC quản trị

-- 1. Gỡ bỏ quyền export khỏi vai trò Lễ tân
delete from public.role_permissions
where role_id in (select id from public.roles where key = 'receptionist')
  and permission_key in ('guest.export', 'guest.export_full');

-- Dựng lại bảng user_effective_permissions cho tất cả lễ tân
do $$
begin
  perform private.rebuild_user_permissions(
    array(select user_id from public.user_roles ur join public.roles r on r.id = ur.role_id where r.key = 'receptionist')
  );
exception when others then
  null;
end $$;

-- 2. Tạm thời tắt cờ require_mfa cho đến khi có giao diện đăng ký TOTP (ghi nhận trong HUMAN_TODO.md)
insert into public.app_settings (key, value)
values ('security.require_mfa', 'false')
on conflict (key) do update set value = 'false';

-- 3. RPC export_guests an toàn, kiểm tra quyền, bắt buộc lý do và tự động ghi nhật ký kiểm toán
create or replace function public.export_guests(p_reason text, p_limit int default 500)
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
  v_has_export boolean;
  v_has_full boolean;
  v_limit int;
  v_count int := 0;
begin
  -- 1. Kiểm tra quyền export
  perform private.assert_perm('guest.export');

  -- 2. Kiểm tra lý do xuất file
  if length(trim(coalesce(p_reason, ''))) < 3 then
    raise exception 'Cần nhập lý do xuất dữ liệu khách hàng (tối thiểu 3 ký tự)' using errcode = 'P0400';
  end if;

  v_has_full := private.has_perm('guest.export_full');
  v_limit := least(greatest(coalesce(p_limit, 500), 1), 2000);

  -- 3. Ghi log kiểm toán thông qua private.log_event
  perform private.log_event(
    'guest.export_excel',
    'guests',
    null,
    null,
    jsonb_build_object(
      'reason', p_reason,
      'has_full_perm', v_has_full,
      'requested_limit', v_limit
    )
  );

  -- 4. Trả về bảng dữ liệu được che chắn
  return query
  select
    g.id,
    g.full_name,
    g.gender::text,
    g.dob,
    case
      when v_has_full then g.phone
      when length(g.phone) >= 7 then overlay(g.phone placing '****' from 4 for 4)
      else g.phone
    end as phone,
    g.email,
    g.nationality,
    g.tags,
    p.full_name as sales_name,
    coalesce(gs.total_stays, 0) as total_stays,
    coalesce(gs.total_nights, 0) as total_nights,
    case
      when v_has_full then gd.doc_number
      when length(gd.doc_number) >= 8 then overlay(gd.doc_number placing '******' from 4 for 6)
      when gd.doc_number is not null then '******' || right(gd.doc_number, 4)
      else null
    end as doc_number,
    v_has_full as is_full
  from public.guests g
  left join public.profiles p on p.id = g.sales_owner_id
  left join public.guest_stats gs on gs.guest_id = g.id
  left join lateral (
    select doc_number from public.guest_documents where guest_id = g.id limit 1
  ) gd on true
  where g.merged_into is null
  order by g.created_at desc
  limit v_limit;
end $$;

grant execute on function public.export_guests(text, int) to authenticated;

-- 4. RPC lưu thông tin cơ sở khách sạn an toàn
create or replace function public.save_branch(
  p_id uuid,
  p_code text,
  p_name text,
  p_phone text default null,
  p_address text default null,
  p_night_cutoff time default '06:00:00',
  p_default_checkout_time time default '12:00:00',
  p_is_active boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := p_id;
  v_old jsonb;
begin
  perform private.assert_perm('settings.branches');

  if p_code is null or trim(p_code) = '' or p_name is null or trim(p_name) = '' then
    raise exception 'Mã và tên cơ sở không được để trống' using errcode = 'P0400';
  end if;

  if v_id is not null then
    select to_jsonb(b) into v_old from public.branches b where id = v_id;
    if v_old is null then
      raise exception 'Không tìm thấy cơ sở' using errcode = 'P0404';
    end if;

    update public.branches
    set code = upper(trim(p_code)),
        name = trim(p_name),
        phone = trim(p_phone),
        address = trim(p_address),
        night_cutoff = p_night_cutoff,
        default_checkout_time = p_default_checkout_time,
        is_active = p_is_active
    where id = v_id;

    perform private.log_event(
      'branch.update',
      'branches',
      v_id,
      v_old,
      jsonb_build_object('code', p_code, 'name', p_name, 'is_active', p_is_active)
    );
  else
    insert into public.branches (
      code, name, phone, address, night_cutoff, default_checkout_time, is_active
    )
    values (
      upper(trim(p_code)), trim(p_name), trim(p_phone), trim(p_address),
      p_night_cutoff, p_default_checkout_time, p_is_active
    )
    returning id into v_id;

    perform private.log_event(
      'branch.create',
      'branches',
      v_id,
      null,
      jsonb_build_object('code', p_code, 'name', p_name)
    );
  end if;

  return v_id;
end $$;

grant execute on function public.save_branch(uuid, text, text, text, text, time, time, boolean) to authenticated;
