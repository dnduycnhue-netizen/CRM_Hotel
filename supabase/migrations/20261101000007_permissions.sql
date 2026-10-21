-- 20261101000007_permissions.sql
create table public.modules (
  key           text primary key check (key ~ '^[a-z_]{2,40}$'),
  name          text not null,
  group_name    text not null,                    -- 'Lõi' | 'Khách hàng' | 'Đối tác' | 'Quản lý chuỗi'
  depends_on    text[] not null default '{}',
  default_state public.module_state not null default 'off',
  is_core       boolean not null default false,   -- luôn bật, không tắt được
  is_available  boolean not null default true,    -- false = đã đăng ký nhưng chưa xây ("Sắp có")
  sort          int not null default 0
);

create table public.branch_modules (
  branch_id  uuid not null references public.branches(id) on delete cascade,
  module_key text not null references public.modules(key),
  state      public.module_state not null,
  config     jsonb not null default '{}',
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  primary key (branch_id, module_key)
);

create table public.permissions (
  key         text primary key check (key ~ '^[a-z_]+\.[a-z_]+$'),
  module_key  text not null references public.modules(key),
  kind        public.perm_kind not null,          -- 'view' còn dùng được khi module ở trạng thái Chỉ xem
  label       text not null,                      -- hiện ở checkbox
  description text,
  sort        int not null default 0
);
create index permissions_module_idx on public.permissions(module_key);

create table public.roles (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique check (key ~ '^[a-z_]{2,40}$'),
  name        text not null,
  description text,
  is_system   boolean not null default false,     -- vai trò mặc định, không xoá được
  created_at  timestamptz not null default now()
);

create table public.role_permissions (
  role_id        uuid not null references public.roles(id) on delete cascade,
  permission_key text not null references public.permissions(key) on delete cascade,
  primary key (role_id, permission_key)
);

create table public.user_roles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role_id    uuid not null references public.roles(id) on delete cascade,
  branch_id  uuid references public.branches(id) on delete cascade,   -- null = toàn chuỗi
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create unique index user_roles_uq on public.user_roles
  (user_id, role_id, coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid));

create table public.user_permission_overrides (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  permission_key text not null references public.permissions(key) on delete cascade,
  branch_id      uuid references public.branches(id) on delete cascade, -- null = toàn chuỗi
  effect         public.perm_effect not null,
  reason         text,
  created_by     uuid references public.profiles(id),
  created_at     timestamptz not null default now()
);
create unique index user_overrides_uq on public.user_permission_overrides
  (user_id, permission_key, coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Quyền hiệu lực đã tính sẵn (chưa áp trạng thái module, phần đó join lúc kiểm tra)
create table public.user_effective_permissions (
  user_id        uuid not null references public.profiles(id) on delete cascade,
  branch_id      uuid not null references public.branches(id) on delete cascade,
  permission_key text not null references public.permissions(key) on delete cascade,
  primary key (user_id, permission_key, branch_id)
);
create index uep_user_branch_idx on public.user_effective_permissions(user_id, branch_id);

do $$
declare t text;
begin
  foreach t in array array['branch_modules', 'role_permissions', 'user_roles', 'user_permission_overrides', 'roles']
  loop
    execute format('create trigger %I after insert or update or delete on public.%I
                    for each row execute function private.audit_row()', t || '_audit', t);
  end loop;
end $$;

-- -----------------------------------------------------

-- Trạng thái module tại một cơ sở
create or replace function private.module_state(p_branch uuid, p_module text)
returns public.module_state language sql stable security definer set search_path = '' as $$
  select case when m.is_core then 'on'::public.module_state
              else coalesce(bm.state, m.default_state) end
  from public.modules m
  left join public.branch_modules bm on bm.module_key = m.key and bm.branch_id = p_branch
  where m.key = p_module;
$$;

-- Kiểm tra quyền. p_branch null = "ở bất kỳ cơ sở nào" (dùng cho quyền cấp chuỗi như settings.*)
create or replace function private.has_perm(p_perm text, p_branch uuid default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.user_effective_permissions uep
    join public.permissions p on p.key = uep.permission_key
    join public.modules m     on m.key = p.module_key
    left join public.branch_modules bm
           on bm.branch_id = uep.branch_id and bm.module_key = p.module_key
    where uep.user_id = (select auth.uid())
      and uep.permission_key = p_perm
      and (p_branch is null or uep.branch_id = p_branch)
      and (
        m.is_core
        or coalesce(bm.state, m.default_state) = 'on'
        or (coalesce(bm.state, m.default_state) = 'readonly' and p.kind = 'view')
      )
  );
$$;

-- Danh sách cơ sở mà người dùng có quyền X (dùng trong policy RLS lọc theo cơ sở)
create or replace function private.branches_with(p_perm text)
returns setof uuid language sql stable security definer set search_path = '' as $$
  select uep.branch_id
  from public.user_effective_permissions uep
  join public.permissions p on p.key = uep.permission_key
  join public.modules m     on m.key = p.module_key
  left join public.branch_modules bm
         on bm.branch_id = uep.branch_id and bm.module_key = p.module_key
  where uep.user_id = (select auth.uid())
    and uep.permission_key = p_perm
    and (
      m.is_core
      or coalesce(bm.state, m.default_state) = 'on'
      or (coalesce(bm.state, m.default_state) = 'readonly' and p.kind = 'view')
    );
$$;

-- Dùng ở dòng đầu mọi RPC ghi. Mã lỗi khớp với src/shared/errors.ts
create or replace function private.assert_perm(p_perm text, p_branch uuid default null)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then
    raise exception 'unauthenticated' using errcode = 'P0401';
  end if;
  if private.has_perm(p_perm, p_branch) then
    return;
  end if;
  if exists (select 1 from public.user_effective_permissions
             where user_id = (select auth.uid()) and permission_key = p_perm
               and (p_branch is null or branch_id = p_branch)) then
    raise exception 'module disabled for %', p_perm using errcode = 'P0423';
  end if;
  raise exception 'forbidden: %', p_perm using errcode = 'P0403';
end $$;

-- Phiên bản bắt buộc có cơ sở: dùng cho mọi RPC thao tác trên dữ liệu của một cơ sở.
-- Tránh lỗi "branch_id null từ payload" bị hiểu thành "bất kỳ cơ sở nào".
create or replace function private.assert_perm_at(p_perm text, p_branch uuid)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if p_branch is null then
    raise exception 'branch is required for %', p_perm using errcode = 'P0422';
  end if;
  perform private.assert_perm(p_perm, p_branch);
end $$;

create or replace function private.assert_module(p_branch uuid, p_module text)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if private.module_state(p_branch, p_module) is distinct from 'on' then
    raise exception 'module % is not enabled', p_module using errcode = 'P0423';
  end if;
end $$;

-- Bắt buộc phiên đã xác thực 2 lớp (MFA) cho thao tác quản trị.
-- Tắt được ở local/staging bằng app_settings('security.require_mfa', 'false').
create or replace function private.assert_aal2()
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if coalesce((select (value #>> '{}')::boolean from public.app_settings where key = 'security.require_mfa'), true)
     and coalesce((select auth.jwt() ->> 'aal'), 'aal1') <> 'aal2' then
    raise exception 'mfa required' using errcode = 'P0401';
  end if;
end $$;

-- Dựng lại quyền hiệu lực cho danh sách user
create or replace function private.rebuild_user_permissions(p_user_ids uuid[])
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.user_effective_permissions where user_id = any (p_user_ids);

  insert into public.user_effective_permissions (user_id, branch_id, permission_key)
  with active_users as (
    select id from public.profiles where id = any (p_user_ids) and is_active
  ),
  grants as (
    select ur.user_id, b.id as branch_id, rp.permission_key
    from public.user_roles ur
    join active_users au           on au.id = ur.user_id
    join public.role_permissions rp on rp.role_id = ur.role_id
    join public.branches b          on b.is_active and (ur.branch_id is null or ur.branch_id = b.id)
    union
    select o.user_id, b.id, o.permission_key
    from public.user_permission_overrides o
    join active_users au  on au.id = o.user_id
    join public.branches b on b.is_active and (o.branch_id is null or o.branch_id = b.id)
    where o.effect = 'grant'
  ),
  denies as (
    select o.user_id, b.id as branch_id, o.permission_key
    from public.user_permission_overrides o
    join public.branches b on b.is_active and (o.branch_id is null or o.branch_id = b.id)
    where o.effect = 'deny' and o.user_id = any (p_user_ids)
  )
  select g.user_id, g.branch_id, g.permission_key
  from grants g
  where not exists (
    select 1 from denies d
    where d.user_id = g.user_id and d.branch_id = g.branch_id and d.permission_key = g.permission_key
  );
end $$;

create or replace function private.rebuild_all_permissions()
returns void language sql security definer set search_path = '' as $$
  select private.rebuild_user_permissions(array(select id from public.profiles));
$$;

-- Thêm/tắt cơ sở hoặc khóa tài khoản → dựng lại
create or replace function private.trg_rebuild_all()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.rebuild_all_permissions();
  return null;
end $$;

create trigger branches_rebuild_perms
  after insert or update of is_active on public.branches
  for each statement execute function private.trg_rebuild_all();

create or replace function private.trg_profile_active()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.rebuild_user_permissions(array[new.id]);
  return null;
end $$;

create trigger profiles_active_rebuild
  after update of is_active on public.profiles
  for each row execute function private.trg_profile_active();

revoke all on all functions in schema private from public, anon;
grant execute on function private.has_perm(text, uuid), private.branches_with(text),
                         private.module_state(uuid, text) to authenticated;

-- -----------------------------------------------------

-- Quyền của chính người đang đăng nhập (giao diện dùng để ẩn/hiện)
create or replace function public.my_access()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'permissions', coalesce((
      select jsonb_object_agg(branch_id, keys) from (
        select uep.branch_id, jsonb_agg(uep.permission_key order by uep.permission_key) as keys
        from public.user_effective_permissions uep
        where uep.user_id = (select auth.uid())
          and private.has_perm(uep.permission_key, uep.branch_id)
        group by uep.branch_id) t), '{}'::jsonb),
    'modules', coalesce((
      select jsonb_object_agg(b.id, (
        select jsonb_object_agg(m.key, private.module_state(b.id, m.key)) from public.modules m))
      from public.branches b
      where b.id in (select branch_id from public.user_effective_permissions
                     where user_id = (select auth.uid()))), '{}'::jsonb)
  );
$$;

-- Lưu ma trận checkbox của một vai trò
create or replace function public.set_role_permissions(p_role_id uuid, p_keys text[])
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_role public.roles;
  v_escalation text[];
begin
  perform private.assert_perm('settings.roles');
  perform private.assert_aal2();
  select * into v_role from public.roles where id = p_role_id;
  if v_role.id is null then raise exception 'role not found' using errcode = 'P0404'; end if;
  if v_role.key = 'owner' then raise exception 'owner role is locked' using errcode = 'P0403'; end if;

  -- Chống leo quyền: không được cấp quyền mà chính mình không có
  select array_agg(k) into v_escalation
  from unnest(p_keys) k
  where not exists (select 1 from public.user_effective_permissions
                    where user_id = (select auth.uid()) and permission_key = k);
  if v_escalation is not null then
    raise exception 'cannot grant permissions you do not hold: %', v_escalation using errcode = 'P0403';
  end if;

  delete from public.role_permissions
   where role_id = p_role_id and permission_key <> all (p_keys);
  insert into public.role_permissions (role_id, permission_key)
  select p_role_id, k from unnest(p_keys) k
  on conflict do nothing;

  perform private.rebuild_user_permissions(
    array(select distinct user_id from public.user_roles where role_id = p_role_id));
end $$;

-- Lưu vai trò + ghi đè của một người
-- p_roles:     [{"role_id": "...", "branch_id": null | "..."}]
-- p_overrides: [{"permission_key": "guest.export", "branch_id": null | "...", "effect": "grant"|"deny", "reason": "..."}]
create or replace function public.set_user_access(p_user_id uuid, p_roles jsonb, p_overrides jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := (select auth.uid());
  v_escalation text[];
begin
  perform private.assert_perm('settings.users');
  perform private.assert_aal2();
  if p_user_id = v_me then
    raise exception 'cannot edit your own access' using errcode = 'P0403';
  end if;
  -- Không sửa được người đang có quyền mà mình không có (quản lý không đụng được tài khoản chủ chuỗi)
  if exists (
    select 1 from public.user_effective_permissions t
    where t.user_id = p_user_id
      and not exists (select 1 from public.user_effective_permissions m
                      where m.user_id = v_me and m.permission_key = t.permission_key)) then
    raise exception 'cannot edit a user who holds permissions you do not hold' using errcode = 'P0403';
  end if;

  -- Chống leo quyền: mọi quyền sẽ được cấp (qua vai trò hoặc grant) phải nằm trong quyền của mình
  select array_agg(distinct k) into v_escalation
  from (
    select rp.permission_key as k
    from jsonb_to_recordset(p_roles) as r(role_id uuid, branch_id uuid)
    join public.role_permissions rp on rp.role_id = r.role_id
    union
    select o.permission_key
    from jsonb_to_recordset(p_overrides) as o(permission_key text, branch_id uuid, effect public.perm_effect, reason text)
    where o.effect = 'grant'
  ) x
  where not exists (select 1 from public.user_effective_permissions
                    where user_id = v_me and permission_key = x.k);
  if v_escalation is not null then
    raise exception 'cannot grant permissions you do not hold: %', v_escalation using errcode = 'P0403';
  end if;

  delete from public.user_roles where user_id = p_user_id;
  insert into public.user_roles (user_id, role_id, branch_id, created_by)
  select p_user_id, r.role_id, r.branch_id, v_me
  from jsonb_to_recordset(p_roles) as r(role_id uuid, branch_id uuid);

  delete from public.user_permission_overrides where user_id = p_user_id;
  insert into public.user_permission_overrides (user_id, permission_key, branch_id, effect, reason, created_by)
  select p_user_id, o.permission_key, o.branch_id, o.effect, o.reason, v_me
  from jsonb_to_recordset(p_overrides) as o(permission_key text, branch_id uuid, effect public.perm_effect, reason text);

  -- Luôn còn ít nhất 1 chủ chuỗi đang hoạt động
  if not exists (
    select 1 from public.user_roles ur
    join public.roles r on r.id = ur.role_id and r.key = 'owner'
    join public.profiles p on p.id = ur.user_id and p.is_active
  ) then
    raise exception 'at least one active owner is required' using errcode = 'P0409';
  end if;

  perform private.rebuild_user_permissions(array[p_user_id]);
end $$;

-- Bật/tắt module. p_branch_id null = áp dụng toàn chuỗi. Trả về danh sách module con bị tắt theo.
create or replace function public.set_branch_module(
  p_branch_id uuid, p_module_key text, p_state public.module_state, p_config jsonb default null)
returns text[] language plpgsql security definer set search_path = '' as $$
declare
  v_module   public.modules;
  v_branches uuid[];
  v_missing  text[];
  v_children text[];
  b uuid;
begin
  perform private.assert_perm('settings.modules');
  perform private.assert_aal2();
  select * into v_module from public.modules where key = p_module_key;
  if v_module.key is null then raise exception 'module not found' using errcode = 'P0404'; end if;
  if v_module.is_core then raise exception 'core module cannot be changed' using errcode = 'P0409'; end if;
  if not v_module.is_available and p_state <> 'off' then
    raise exception 'module not available yet' using errcode = 'P0409';
  end if;

  v_branches := case when p_branch_id is null
                     then array(select id from public.branches where is_active)
                     else array[p_branch_id] end;

  foreach b in array v_branches loop
    if p_state <> 'off' then
      select array_agg(d) into v_missing
      from unnest(v_module.depends_on) d
      where private.module_state(b, d) = 'off';
      if v_missing is not null then
        raise exception 'enable dependencies first: %', v_missing using errcode = 'P0409';
      end if;
    end if;

    insert into public.branch_modules (branch_id, module_key, state, config, updated_by)
    values (b, p_module_key, p_state, coalesce(p_config, '{}'), (select auth.uid()))
    on conflict (branch_id, module_key) do update
      set state = excluded.state,
          config = coalesce(p_config, public.branch_modules.config),
          updated_by = excluded.updated_by,
          updated_at = now();

    if p_state = 'off' then                                  -- tắt dây chuyền các module con
      with recursive children as (
        select m.key from public.modules m where p_module_key = any (m.depends_on)
        union
        select m.key from public.modules m join children c on c.key = any (m.depends_on)
      )
      insert into public.branch_modules (branch_id, module_key, state, updated_by)
      select b, c.key, 'off', (select auth.uid()) from children c
      on conflict (branch_id, module_key) do update set state = 'off', updated_at = now();

      select array_agg(m.key) into v_children
      from public.modules m where p_module_key = any (m.depends_on);
    end if;
  end loop;

  return coalesce(v_children, '{}');
end $$;

grant execute on function public.my_access(), public.set_role_permissions(uuid, text[]),
  public.set_user_access(uuid, jsonb, jsonb), public.set_branch_module(uuid, text, public.module_state, jsonb)
  to authenticated;
