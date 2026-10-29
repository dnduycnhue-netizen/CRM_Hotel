-- Migration 59: Add guest.delete permission and delete_guest RPC

-- 1. Bổ sung permission key 'guest.delete' vào bảng permissions
insert into public.permissions (key, module_key, kind, label, sort)
values ('guest.delete', 'core', 'write', 'Xoá khách hàng', 122)
on conflict (key) do nothing;

-- 2. Cấp quyền 'guest.delete' cho các vai trò: sales, branch_manager, receptionist, owner
insert into public.role_permissions (role_id, permission_key)
select r.id, 'guest.delete'
from public.roles r
where r.key in ('sales', 'branch_manager', 'receptionist', 'owner')
on conflict do nothing;

-- 3. Tái tạo quyền hiệu lực cho toàn bộ hệ thống
select private.rebuild_all_permissions();

-- 4. Tạo RPC delete_guest(p_guest_id uuid)
create or replace function public.delete_guest(p_guest_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_g public.guests;
begin
  perform private.assert_perm('guest.delete');

  select * into v_g from public.guests where id = p_guest_id for update;
  if not found then
    raise exception 'guest not found' using errcode = 'P0404';
  end if;

  -- 1. Chặn nếu khách đã có bất kỳ lượt ở nào trong stays
  if exists (select 1 from public.stay_guests where guest_id = p_guest_id) then
    raise exception 'GUEST_HAS_STAYS' using errcode = 'P0422';
  end if;

  -- 2. Chặn nếu khách đang trong danh sách đen (Blacklist đã duyệt)
  if exists (
    select 1 from public.guest_flags
    where guest_id = p_guest_id and status = 'approved'
  ) then
    raise exception 'GUEST_IS_BLACKLISTED' using errcode = 'P0428';
  end if;

  -- 3. Chặn nếu khách đã từng đổi voucher
  if exists (
    select 1 from public.voucher_redemptions
    where guest_id = p_guest_id
  ) then
    raise exception 'GUEST_HAS_VOUCHER_REDEMPTIONS' using errcode = 'P0422';
  end if;

  -- 4. Chặn nếu khách là đích của hồ sơ khác đã gộp vào
  if exists (
    select 1 from public.guests
    where merged_into = p_guest_id
  ) then
    raise exception 'GUEST_HAS_MERGED_PROFILES' using errcode = 'P0422';
  end if;

  -- Dọn các yêu cầu gộp liên quan (nếu có yêu cầu chưa duyệt hoặc đã từ chối)
  delete from public.merge_requests
  where keep_guest_id = p_guest_id or drop_guest_id = p_guest_id;

  -- Xóa khách hàng (các bảng liên quan: guest_notes, guest_documents, guest_consents,
  -- guest_flags chưa duyệt, guest_tier_events, guest_consent_events, guest_stats tự động CASCADE)
  delete from public.guests where id = p_guest_id;

  -- Ghi nhận sự kiện kiểm toán
  perform private.log_event(
    'guest.delete',
    'guests',
    p_guest_id,
    null,
    jsonb_build_object(
      'full_name', v_g.full_name,
      'phone', v_g.phone,
      'nationality', v_g.nationality
    )
  );

  return jsonb_build_object('id', p_guest_id, 'deleted', true);
end;
$$;

grant execute on function public.delete_guest(uuid) to authenticated;
