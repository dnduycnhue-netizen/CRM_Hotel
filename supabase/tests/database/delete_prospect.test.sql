begin;
select plan(11);

-- 1. Quyền prospect.delete và prospect.purge có trong bảng permissions
select has_row(
  'permissions',
  'key = ''prospect.delete''',
  'Permission prospect.delete phai ton tai trong bang permissions'
);

select has_row(
  'permissions',
  'key = ''prospect.purge''',
  'Permission prospect.purge phai ton tai trong bang permissions'
);

-- 2. Quyền prospect.delete được cấp cho Sales, Branch Manager và Owner
select ok(
  exists (
    select 1 from public.role_permissions rp
    join public.roles r on r.id = rp.role_id
    where r.key = 'sales' and rp.permission_key = 'prospect.delete'
  ),
  'Sales co quyen prospect.delete de xoa mem vao thung rac'
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
    where r.key = 'receptionist' and rp.permission_key = 'prospect.delete'
  ),
  'Receptionist khong co quyen prospect.delete'
);

-- 3. Quyền prospect.purge chi cap cho Branch Manager va Owner (Sales khong co quyen)
select ok(
  not exists (
    select 1 from public.role_permissions rp
    join public.roles r on r.id = rp.role_id
    where r.key = 'sales' and rp.permission_key = 'prospect.purge'
  ),
  'Sales khong co quyen prospect.purge (khong the xoa cung)'
);

select ok(
  exists (
    select 1 from public.role_permissions rp
    join public.roles r on r.id = rp.role_id
    where r.key = 'branch_manager' and rp.permission_key = 'prospect.purge'
  ),
  'Branch manager co quyen prospect.purge'
);

-- 4. Functions delete_prospect, restore_prospect, purge_prospect ton tai
select has_function(
  'public',
  'delete_prospect',
  array['uuid'],
  'Function public.delete_prospect(uuid) phai ton tai'
);

select has_function(
  'public',
  'restore_prospect',
  array['uuid'],
  'Function public.restore_prospect(uuid) phai ton tai'
);

select has_function(
  'public',
  'purge_prospect',
  array['uuid'],
  'Function public.purge_prospect(uuid) phai ton tai'
);

select * from finish();
rollback;
