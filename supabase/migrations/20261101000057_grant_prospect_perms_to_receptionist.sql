-- 20261101000057_grant_prospect_perms_to_receptionist.sql
-- Cấp toàn quyền quản lý khách tiềm năng B2B (prospect.*) cho vai trò Lễ tân (receptionist)

insert into public.role_permissions (role_id, permission_key)
select r.id, p.key
from public.roles r
cross join (
  values
    ('prospect.view'),
    ('prospect.manage'),
    ('prospect.assign'),
    ('prospect.convert'),
    ('prospect.import'),
    ('prospect.export')
) as p(key)
where r.key = 'receptionist'
on conflict do nothing;

select private.rebuild_all_permissions();

