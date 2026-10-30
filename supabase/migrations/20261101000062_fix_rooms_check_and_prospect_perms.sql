-- Migration 62: Sửa constraint rooms_check cho phép closed_on >= opened_on,
-- điều chỉnh quyền xóa prospect (chỉ dành cho Quản lý & Chủ chuỗi theo spec),
-- và cấp quyền prospect.export cho vai trò sales.
-- ----------------------------------------------------------------------------------------------------

-- 1. Sửa constraint rooms_check
alter table public.rooms drop constraint if exists rooms_check;
alter table public.rooms add constraint rooms_check
  check (closed_on is null or opened_on is null or closed_on >= opened_on);

-- 2. Điều chỉnh quyền prospect.delete: thu hồi từ sales và receptionist, chỉ giữ cho branch_manager và owner
delete from public.role_permissions
where permission_key = 'prospect.delete'
  and role_id in (
    select id from public.roles where key in ('sales', 'receptionist')
  );

-- Đảm bảo branch_manager và owner luôn có quyền prospect.delete
insert into public.role_permissions (role_id, permission_key)
select r.id, 'prospect.delete'
from public.roles r
where r.key in ('branch_manager', 'owner')
on conflict do nothing;

-- 3. Cấp quyền prospect.export cho sales (để sales cũng xuất được danh sách B2B của mình)
insert into public.role_permissions (role_id, permission_key)
select r.id, 'prospect.export'
from public.roles r
where r.key = 'sales'
on conflict do nothing;

-- 4. Tính toán lại toàn bộ quyền hiệu lực
select private.rebuild_all_permissions();
