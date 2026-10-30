begin;
select plan(7);

-- 1. Quyền prospect.delete có trong bảng permissions
select has_row(
  'permissions',
  'key = ''prospect.delete''',
  'Permission prospect.delete phai ton tai trong bang permissions'
);

-- 2. Quyền prospect.delete duoc cap cho Branch Manager va Owner (khong cap cho Sales/Receptionist/Technician)
select ok(
  not exists (
    select 1 from public.role_permissions rp
    join public.roles r on r.id = rp.role_id
    where r.key = 'receptionist' and rp.permission_key = 'prospect.delete'
  ),
  'Receptionist khong co quyen prospect.delete'
);

select ok(
  exists (
    select 1 from public.role_permissions rp
    join public.roles r on r.id = rp.role_id
    where r.key = 'branch_manager' and rp.permission_key = 'prospect.delete'
  ),
  'Branch manager co quyen prospect.delete'
);

select ok(
  not exists (
    select 1 from public.role_permissions rp
    join public.roles r on r.id = rp.role_id
    where r.key = 'sales' and rp.permission_key = 'prospect.delete'
  ),
  'Sales khong co quyen prospect.delete'
);

select ok(
  exists (
    select 1 from public.role_permissions rp
    join public.roles r on r.id = rp.role_id
    where r.key = 'owner' and rp.permission_key = 'prospect.delete'
  ),
  'Owner co quyen prospect.delete'
);

select ok(
  not exists (
    select 1 from public.role_permissions rp
    join public.roles r on r.id = rp.role_id
    where r.key = 'technician' and rp.permission_key = 'prospect.delete'
  ),
  'Technician khong co quyen prospect.delete'
);

-- 3. Function delete_prospect ton tai voi security definer
select has_function(
  'public',
  'delete_prospect',
  array['uuid'],
  'Function public.delete_prospect(uuid) phai ton tai'
);

select * from finish();
rollback;
