-- pgTAP: Kiểm tra các tính năng sprint mới (migrations 54-57)
-- Chạy bằng `pnpm supabase test db`
begin;
select plan(25);

-- 1. Báo phòng sạch (migration 54)
select has_column('public', 'stays', 'cleaned_at', 'bảng stays có cột cleaned_at');
select has_function('public', 'confirm_room_cleaned', array['uuid'], 'có hàm confirm_room_cleaned');
select ok((select prosecdef from pg_proc where proname = 'confirm_room_cleaned'), 'confirm_room_cleaned là security definer');

-- 2. Quản lý phòng CRUD (migration 55)
select has_function('public', 'create_room', array['uuid', 'text', 'smallint', 'text', 'date'], 'có create_room');
select ok((select prosecdef from pg_proc where proname = 'create_room'), 'create_room là security definer');
select has_function('public', 'update_room', array['uuid', 'text', 'smallint', 'text', 'date'], 'có update_room');
select ok((select prosecdef from pg_proc where proname = 'update_room'), 'update_room là security definer');
select has_function('public', 'deactivate_room', array['uuid'], 'có deactivate_room');
select ok((select prosecdef from pg_proc where proname = 'deactivate_room'), 'deactivate_room là security definer');
select has_function('public', 'reactivate_room', array['uuid'], 'có reactivate_room');
select ok((select prosecdef from pg_proc where proname = 'reactivate_room'), 'reactivate_room là security definer');
select has_function('public', 'delete_room_permanent', array['uuid'], 'có delete_room_permanent');
select ok((select prosecdef from pg_proc where proname = 'delete_room_permanent'), 'delete_room_permanent là security definer');

-- Kiểm tra phân quyền settings.rooms cho branch_manager
select ok(exists (
  select 1 from public.role_permissions rp
  join public.roles r on r.id = rp.role_id
  where r.key = 'branch_manager' and rp.permission_key = 'settings.rooms'
), 'branch_manager có quyền settings.rooms');

-- 3. Danh mục 34 tỉnh/thành (migration 56)
select is((select count(*)::int from public.admin_provinces), 34, 'public.admin_provinces có đúng 34 đơn vị hành chính');
select ok(exists (select 1 from public.admin_provinces where code = '01' and name = 'Hà Nội'), 'có Hà Nội');
select ok(exists (select 1 from public.admin_provinces where code = '79' and name = 'Thành phố Hồ Chí Minh'), 'có TP.HCM');
select ok(exists (select 1 from public.admin_provinces where code = '48' and name = 'Đà Nẵng'), 'có Đà Nẵng');

-- 4. Toàn quyền prospect cho Lễ tân (migration 57)
select is((
  select count(*)::int from public.role_permissions rp
  join public.roles r on r.id = rp.role_id
  where r.key = 'receptionist' and rp.permission_key like 'prospect.%'
), 6, 'lễ tân có đủ 6 quyền prospect.*');

select ok(exists (
  select 1 from public.role_permissions rp
  join public.roles r on r.id = rp.role_id
  where r.key = 'receptionist' and rp.permission_key = 'prospect.assign'
), 'lễ tân có quyền prospect.assign (xem đầy đủ SĐT)');

select ok(exists (
  select 1 from public.role_permissions rp
  join public.roles r on r.id = rp.role_id
  where r.key = 'receptionist' and rp.permission_key = 'prospect.convert'
), 'lễ tân có quyền prospect.convert');

select ok(not exists (
  select 1 from public.role_permissions rp
  join public.roles r on r.id = rp.role_id
  where r.key = 'technician' and rp.permission_key like 'prospect.%'
), 'kỹ thuật không có quyền prospect nào');

select is((
  select count(*)::int from public.role_permissions rp
  join public.roles r on r.id = rp.role_id
  where r.key = 'sales' and rp.permission_key like 'prospect.%'
), 4, 'sales vẫn giữ nguyên 4 quyền prospect');

select is((
  select count(*)::int from public.role_permissions rp
  join public.roles r on r.id = rp.role_id
  where r.key = 'branch_manager' and rp.permission_key like 'prospect.%'
), 6, 'quản lý vẫn giữ nguyên 6 quyền prospect');

select is((
  select count(*)::int from public.role_permissions rp
  join public.roles r on r.id = rp.role_id
  where r.key = 'owner' and rp.permission_key like 'prospect.%'
), 6, 'owner vẫn giữ nguyên 6 quyền prospect');

select * from finish();
rollback;

