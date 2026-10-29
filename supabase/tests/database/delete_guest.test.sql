begin;
select plan(7);

-- 1. Quyền guest.delete có trong bảng permissions
select has_row(
  'permissions',
  'key = ''guest.delete''',
  'Permission guest.delete phai ton tai trong bang permissions'
);

-- 2. Quyền guest.delete duoc cap cho cac vai tro phu hop
select ok(
  exists (
    select 1 from public.role_permissions rp
    join public.roles r on r.id = rp.role_id
    where r.key = 'receptionist' and rp.permission_key = 'guest.delete'
  ),
  'Receptionist co quyen guest.delete'
);

select ok(
  exists (
    select 1 from public.role_permissions rp
    join public.roles r on r.id = rp.role_id
    where r.key = 'branch_manager' and rp.permission_key = 'guest.delete'
  ),
  'Branch manager co quyen guest.delete'
);

select ok(
  exists (
    select 1 from public.role_permissions rp
    join public.roles r on r.id = rp.role_id
    where r.key = 'sales' and rp.permission_key = 'guest.delete'
  ),
  'Sales co quyen guest.delete'
);

select ok(
  exists (
    select 1 from public.role_permissions rp
    join public.roles r on r.id = rp.role_id
    where r.key = 'owner' and rp.permission_key = 'guest.delete'
  ),
  'Owner co quyen guest.delete'
);

select ok(
  not exists (
    select 1 from public.role_permissions rp
    join public.roles r on r.id = rp.role_id
    where r.key = 'technician' and rp.permission_key = 'guest.delete'
  ),
  'Technician khong co quyen guest.delete'
);

-- 3. Function delete_guest ton tai voi security definer
select has_function(
  'public',
  'delete_guest',
  array['uuid'],
  'Function public.delete_guest(uuid) phai ton tai'
);

select * from finish();
rollback;
