-- 20261101000051_grant_loyalty_configure_to_branch_manager.sql
-- Quyết định của CĐT (26/10/2026): Quản lý cơ sở được tạo, sửa, kích hoạt
-- chính sách hạng thành viên (trước đây chỉ Owner có loyalty.configure).

insert into public.role_permissions (role_id, permission_key)
select r.id, 'loyalty.configure'
from public.roles r
where r.key = 'branch_manager'
on conflict do nothing;

-- Quyền hiệu lực được tính sẵn → dựng lại cho mọi tài khoản
select private.rebuild_all_permissions();
