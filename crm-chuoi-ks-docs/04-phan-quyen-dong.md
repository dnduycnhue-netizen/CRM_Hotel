# 04 – Phân quyền động và bật/tắt module

## 1. Mô hình

Quyền hiệu lực của một người tại một cơ sở được tính như sau:

```text
quyền hiệu lực(user, cơ sở) =
    ( ∪ quyền của các vai trò gán cho user tại cơ sở đó hoặc "toàn chuỗi" )
  ∪ ( quyền được tick "Cho phép" riêng cho user )
  − ( quyền bị tick "Cấm" riêng cho user )                       ← Cấm luôn thắng
  ∩ ( quyền thuộc module đang Bật ở cơ sở đó,
      hoặc module đang Chỉ xem và quyền thuộc loại "view" )
  và tài khoản đang hoạt động
```

| Khái niệm | Bảng | Ai chỉnh | Giao diện |
| --- | --- | --- | --- |
| Module | `modules` | Chỉ qua migration | — |
| Trạng thái module theo cơ sở | `branch_modules` | Người có `settings.modules` | Ma trận module × cơ sở (Tắt / Chỉ xem / Bật) |
| Danh mục quyền | `permissions` | Chỉ qua migration | — |
| Vai trò | `roles` | Người có `settings.roles` | Thêm/sửa/xoá vai trò tuỳ chỉnh |
| Quyền của vai trò | `role_permissions` | Người có `settings.roles` | **Ma trận checkbox** quyền × vai trò |
| Gán vai trò cho người | `user_roles` | Người có `settings.users` | Chọn vai trò + phạm vi cơ sở |
| Ghi đè theo người | `user_permission_overrides` | Người có `settings.users` | **Checkbox 3 trạng thái**: Kế thừa / Cho phép / Cấm |
| Quyền hiệu lực (đã tính sẵn) | `user_effective_permissions` | Chỉ hàm hệ thống | Cột "Kết quả" trong màn hình người dùng |

Vì sao tính sẵn `user_effective_permissions`? Mọi policy RLS và mọi RPC đều hỏi "người này có quyền X ở cơ sở Y không". Tra một bảng có khóa chính `(user_id, branch_id, permission_key)` nhanh và ổn định hơn nhiều so với join 4 bảng ở mỗi dòng dữ liệu. Bảng được dựng lại mỗi khi quyền thay đổi (rất hiếm so với số lần đọc).

Vì sao không nhét quyền vào JWT? Quyền đổi theo checkbox phải có hiệu lực ngay; JWT chỉ làm mới sau khi token hết hạn, nên sẽ có độ trễ và rủi ro dùng quyền cũ.

## 2. SQL

### 2.1 Bảng

```sql
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
```

### 2.2 Hàm lõi

```sql
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
```

### 2.3 RPC quản trị quyền

Các bảng phân quyền **không** có policy INSERT/UPDATE/DELETE cho `authenticated`. Mọi thay đổi đi qua 4 RPC dưới đây, vì vậy luôn được kiểm tra chống leo quyền và luôn dựng lại bảng hiệu lực.

```sql
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
```

## 3. Danh mục module, quyền, vai trò mặc định

Cấu hình mặc định dưới đây đã áp theo phản hồi của chủ đầu tư (21/10/2026). Mọi ô vẫn đổi được bằng checkbox sau khi chạy.

```sql
-- 20261101000010_catalog_seed.sql
insert into public.modules (key, name, group_name, depends_on, default_state, is_core, is_available, sort) values
  ('core',              'Lõi hệ thống',              'Lõi',             '{}',                       'on',  true,  true,  0),
  ('companions',        'Người đi cùng',             'Khách hàng',      '{}',                       'on',  false, true,  10),
  ('international',     'Khách quốc tế',             'Khách hàng',      '{}',                       'on',  false, true,  11),
  ('merge',             'Gộp hồ sơ trùng',           'Khách hàng',      '{}',                       'on',  false, true,  12),
  ('blacklist',         'Blacklist toàn chuỗi',      'Khách hàng',      '{}',                       'on',  false, true,  13),
  ('loyalty',           'Hạng thành viên, giảm giá', 'Khách hàng',      '{}',                       'on',  false, true,  14),
  ('consent',           'Đồng ý nhận tin',           'Khách hàng',      '{}',                       'off', false, true,  15),
  ('birthday',          'Sinh nhật',                 'Khách hàng',      '{consent}',                'off', false, false, 16),
  ('vouchers',          'Voucher',                   'Khách hàng',      '{consent}',                'off', false, false, 17),
  ('qr_cccd',           'Quét QR CCCD',              'Khách hàng',      '{}',                       'off', false, true,  18),
  ('partners',          'Đối tác tour (mở rộng)',    'Đối tác',         '{}',                       'off', false, false, 20),
  ('partner_contracts', 'Hợp đồng giá',              'Đối tác',         '{partners}',               'off', false, false, 21),
  ('group_bookings',    'Khách đoàn',                'Đối tác',         '{partners}',               'off', false, false, 22),
  ('commissions',       'Hoa hồng',                  'Đối tác',         '{partners}',               'off', false, false, 23),
  ('facilities',        'Tài sản và vị trí',         'Cơ sở vật chất',  '{}',                       'on',  false, true,  30),
  ('work_orders',       'Sự cố và sửa chữa',         'Cơ sở vật chất',  '{facilities}',             'on',  false, true,  31),
  ('preventive',        'Bảo trì định kỳ',           'Cơ sở vật chất',  '{facilities,work_orders}', 'on',  false, true,  32),
  ('inspections',       'Kiểm tra phòng và khu vực', 'Cơ sở vật chất',  '{work_orders}',            'off', false, true,  33),
  ('compliance',        'Hồ sơ pháp lý, kiểm định',  'Cơ sở vật chất',  '{facilities}',             'on',  false, true,  34),
  ('reports',           'Báo cáo và biểu đồ',        'Quản lý chuỗi',   '{}',                       'on',  false, true,  40),
  ('revenue_input',     'Nhập doanh thu tháng',      'Quản lý chuỗi',   '{reports}',                'off', false, true,  41),
  ('feedback',          'Phản hồi và sự cố khách',   'Quản lý chuỗi',   '{}',                       'off', false, false, 42),
  ('asm_export',        'Xuất khai báo lưu trú',     'Quản lý chuỗi',   '{}',                       'off', false, false, 43);

insert into public.permissions (key, module_key, kind, label, sort) values
  -- Lõi: lượt ở
  ('stay.view',             'core', 'view',  'Xem lượt ở của cơ sở',                        100),
  ('stay.create',           'core', 'write', 'Check-in khách',                               101),
  ('stay.create_past',      'core', 'write', 'Nhập bù lượt ở trong quá khứ',                 102),
  ('stay.update',           'core', 'write', 'Sửa, gia hạn, đổi phòng',                      103),
  ('stay.checkout',         'core', 'write', 'Trả phòng',                                    104),
  ('stay.cancel',           'core', 'write', 'Hủy lượt ở trong thời hạn tự hủy (mặc định 6 giờ)', 105),
  ('stay.cancel_late',      'core', 'write', 'Hủy lượt ở quá thời hạn tự hủy',               106),
  ('room.block',            'core', 'write', 'Khóa / mở phòng ngừng bán',                    107),
  -- Lõi: khách
  ('guest.search',          'core', 'view',  'Tìm kiếm khách toàn chuỗi',                    110),
  ('guest.view_summary',    'core', 'view',  'Xem tóm tắt hồ sơ (CCCD bị che)',              111),
  ('guest.view_full',       'core', 'view',  'Xem hồ sơ 360° đầy đủ mọi khách',              112),
  ('guest.view_full_own',   'core', 'view',  'Xem hồ sơ đầy đủ khách mình phụ trách',        113),
  ('guest.create',          'core', 'write', 'Thêm hồ sơ khách (không kèm lượt ở)',          114),
  ('guest.update',          'core', 'write', 'Sửa thông tin cá nhân khách',                  115),
  ('guest.assign_owner',    'core', 'write', 'Giao khách cho sales phụ trách',               116),
  ('guest.note_create',     'core', 'write', 'Thêm ghi chú',                                 117),
  ('guest.note_delete_any', 'core', 'write', 'Xoá ghi chú của người khác',                   118),
  ('guest.tag_manage',      'core', 'write', 'Gắn / bỏ tag',                                 119),
  ('guest.export',          'core', 'view',  'Xuất Excel danh sách khách (CCCD bị che)',     120),
  ('guest.export_full',     'core', 'view',  'Xuất Excel đầy đủ CCCD',                       121),
  -- Lõi: quản trị
  ('audit.view_branch',     'core', 'view',  'Xem nhật ký cơ sở mình',                       190),
  ('audit.view_all',        'core', 'view',  'Xem nhật ký toàn chuỗi',                       191),
  ('settings.branches',     'core', 'write', 'Quản lý cơ sở',                                192),
  ('settings.rooms',        'core', 'write', 'Quản lý phòng',                                193),
  ('settings.users',        'core', 'write', 'Quản lý tài khoản và phân quyền người',        194),
  ('settings.roles',        'core', 'write', 'Quản lý vai trò và ma trận quyền',             195),
  ('settings.modules',      'core', 'write', 'Bật / tắt module',                             196),
  ('settings.sources',      'core', 'write', 'Quản lý kênh nguồn khách và danh sách đối tác', 197),
  -- Khách hàng
  ('companion.manage',      'companions', 'write', 'Thêm người đi cùng',                     200),
  ('merge.propose',         'merge',      'write', 'Đề xuất gộp hồ sơ',                      210),
  ('merge.approve',         'merge',      'write', 'Duyệt gộp hồ sơ',                        211),
  ('blacklist.view',        'blacklist',  'view',  'Xem cờ blacklist',                       220),
  ('blacklist.propose',     'blacklist',  'write', 'Đề xuất blacklist',                      221),
  ('blacklist.approve',     'blacklist',  'write', 'Duyệt blacklist',                        222),
  ('blacklist.remove',      'blacklist',  'write', 'Gỡ blacklist',                           223),
  ('loyalty.view',          'loyalty',    'view',  'Xem hạng và mức giảm giá của khách',     230),
  ('loyalty.configure',     'loyalty',    'write', 'Cấu hình hạng: tên, ngưỡng, % giảm giá', 231),
  ('loyalty.override',      'loyalty',    'write', 'Gán hạng thủ công cho khách',            232),
  ('consent.manage',        'consent',    'write', 'Ghi nhận đồng ý nhận tin',               240),
  ('birthday.view',         'birthday',   'view',  'Xem danh sách sinh nhật',                250),
  ('voucher.issue',         'vouchers',   'write', 'Phát voucher',                           260),
  ('voucher.redeem',        'vouchers',   'write', 'Ghi nhận đổi voucher',                   261),
  -- Đối tác (mở rộng, chưa xây)
  ('partner.view',          'partners',          'view',  'Xem hồ sơ đối tác mở rộng',       300),
  ('partner.manage',        'partners',          'write', 'Quản lý đối tác mở rộng',         301),
  ('contract.manage',       'partner_contracts', 'write', 'Quản lý hợp đồng giá',            310),
  ('group.manage',          'group_bookings',    'write', 'Quản lý khách đoàn',              320),
  ('commission.view',       'commissions',       'view',  'Xem hoa hồng',                    330),
  ('commission.manage',     'commissions',       'write', 'Quản lý hoa hồng',                331),
  -- Cơ sở vật chất (xem 12)
  ('facility.view',         'facilities',  'view',  'Xem tài sản, vị trí, nhà cung cấp',     400),
  ('facility.manage',       'facilities',  'write', 'Thêm / sửa tài sản, vị trí, nhà cung cấp', 401),
  ('wo.view',               'work_orders', 'view',  'Xem phiếu sự cố, sửa chữa',             410),
  ('wo.create',             'work_orders', 'write', 'Báo sự cố',                             411),
  ('wo.assign',             'work_orders', 'write', 'Phân công, đặt ưu tiên, hủy phiếu',     412),
  ('wo.work',               'work_orders', 'write', 'Cập nhật tiến độ, chi phí phiếu được giao', 413),
  ('wo.close',              'work_orders', 'write', 'Nghiệm thu, đóng phiếu',                414),
  ('pm.view',               'preventive',  'view',  'Xem kế hoạch bảo trì định kỳ',          420),
  ('pm.manage',             'preventive',  'write', 'Lập / sửa kế hoạch bảo trì định kỳ',    421),
  ('inspection.perform',    'inspections', 'write', 'Thực hiện kiểm tra theo checklist',     430),
  ('inspection.manage',     'inspections', 'write', 'Quản lý mẫu checklist',                 431),
  ('compliance.view',       'compliance',  'view',  'Xem hồ sơ pháp lý, kiểm định',          440),
  ('compliance.manage',     'compliance',  'write', 'Cập nhật hồ sơ pháp lý, kiểm định',     441),
  -- Báo cáo (xem 13)
  ('report.view_branch',    'reports',       'view',  'Xem báo cáo cơ sở mình',              500),
  ('report.view_chain',     'reports',       'view',  'Xem báo cáo toàn chuỗi, so sánh cơ sở', 501),
  ('report.export',         'reports',       'view',  'Xuất báo cáo Excel',                  502),
  ('revenue.view',          'revenue_input', 'view',  'Xem doanh thu, ADR, RevPAR',          510),
  ('revenue.input',         'revenue_input', 'write', 'Nhập doanh thu tháng, số liệu nền',   511),
  -- Quản lý chuỗi khác (chưa xây)
  ('feedback.manage',       'feedback',    'write', 'Ghi nhận phản hồi, sự cố khách',        600),
  ('asm.export',            'asm_export',  'view',  'Xuất file khai báo lưu trú',            610);

insert into public.roles (key, name, is_system) values
  ('receptionist',   'Lễ tân',            true),
  ('branch_manager', 'Quản lý',           true),
  ('sales',          'Sales',             true),
  ('technician',     'Kỹ thuật, bảo trì', true),
  ('owner',          'Chủ chuỗi',         true);

-- Lễ tân: theo phản hồi CĐT — xem đầy đủ hồ sơ toàn chuỗi, xuất Excel (che CCCD, giới hạn dòng, cơ sở mình)
insert into public.role_permissions (role_id, permission_key)
select r.id, k from public.roles r, unnest(array[
  'stay.view','stay.create','stay.update','stay.checkout','stay.cancel','room.block',
  'guest.search','guest.view_summary','guest.view_full','guest.create','guest.update',
  'guest.note_create','guest.tag_manage','guest.export',
  'companion.manage','merge.propose','blacklist.view','blacklist.propose',
  'loyalty.view','consent.manage','voucher.redeem','feedback.manage',
  'facility.view','wo.view','wo.create','inspection.perform','compliance.view'
]) k where r.key = 'receptionist';

-- Quản lý (2 người, phạm vi toàn chuỗi): mọi quyền trừ xuất CCCD đầy đủ.
-- Thiếu đúng 1 quyền này nên quản lý không sửa được tài khoản chủ chuỗi (xem set_user_access).
insert into public.role_permissions (role_id, permission_key)
select r.id, p.key from public.roles r cross join public.permissions p
where r.key = 'branch_manager' and p.key not in ('guest.export_full');

-- Sales: thêm khách mới, xem đầy đủ khách mình phụ trách, ghi chú; không sửa, không xuất
insert into public.role_permissions (role_id, permission_key)
select r.id, k from public.roles r, unnest(array[
  'guest.search','guest.view_summary','guest.view_full_own','guest.create',
  'guest.note_create','guest.tag_manage','merge.propose','blacklist.view','blacklist.propose',
  'loyalty.view','birthday.view','voucher.issue',
  'partner.view','partner.manage','contract.manage','group.manage','commission.view'
]) k where r.key = 'sales';

-- Kỹ thuật: nhận và xử lý phiếu, bảo trì định kỳ, kiểm tra
insert into public.role_permissions (role_id, permission_key)
select r.id, k from public.roles r, unnest(array[
  'facility.view','wo.view','wo.create','wo.work','pm.view','inspection.perform','compliance.view','room.block'
]) k where r.key = 'technician';

-- Chủ chuỗi: tất cả
insert into public.role_permissions (role_id, permission_key)
select r.id, p.key from public.roles r cross join public.permissions p where r.key = 'owner';

-- Tham số nghiệp vụ đã chốt với CĐT
insert into public.app_settings (key, value) values
  -- basis: 'stays' = số lần lưu trú | 'nights' = số đêm; window_months: 0 = trọn đời (không bao giờ xuống hạng)
  -- count_current_stay: false = lượt đang check-in chưa tính, hạng mới áp từ lần sau
  ('loyalty.rules',            '{"basis": "stays", "window_months": 24, "count_current_stay": false}'),
  ('stay.self_cancel_hours',   '6'),
  ('stay.backdate_after_hours','12'),      -- check-in sớm hơn bây giờ quá 12 giờ = nhập bù, cần stay.create_past
  ('export.max_rows_branch',   '500'),     -- người chỉ có quyền ở một số cơ sở
  ('export.max_rows_chain',    '5000'),
  ('app.go_live_date',         '"2026-12-01"'),   -- sửa đúng ngày chạy thật; trước ngày này báo cáo cùng kỳ dùng số liệu nền
  ('security.require_mfa',     'true');

-- GIÁ TRỊ MẪU: ngưỡng và % giảm giá do CĐT chốt, quản lý sửa trong /settings/loyalty
insert into public.loyalty_tiers (code, name, min_value, discount_pct, color, sort) values
  ('member', 'Thành viên', 0,  0,  '#9CA3AF', 0),
  ('bronze', 'Đồng',       2,  3,  '#B45309', 1),
  ('silver', 'Bạc',        5,  5,  '#64748B', 2),
  ('gold',   'Vàng',       10, 10, '#CA8A04', 3);

insert into public.source_channels (code, name, kind, requires_partner, sort) values
  ('walk_in',    'Khách vãng lai',            'direct',    false, 1),
  ('phone_zalo', 'Điện thoại / Zalo',         'direct',    false, 2),
  ('website',    'Website khách sạn',         'direct',    false, 3),
  ('social',     'Fanpage / mạng xã hội',     'direct',    false, 4),
  ('repeat',     'Khách cũ đặt trực tiếp',    'direct',    false, 5),
  ('booking_com','Booking.com',               'ota',       false, 10),
  ('agoda',      'Agoda',                     'ota',       false, 11),
  ('traveloka',  'Traveloka',                 'ota',       false, 12),
  ('expedia',    'Expedia',                   'ota',       false, 13),
  ('trip_com',   'Trip.com',                  'ota',       false, 14),
  ('airbnb',     'Airbnb',                    'ota',       false, 15),
  ('partner',    'Đối tác tour / đại lý',     'partner',   true,  20),
  ('corporate',  'Khách công ty',             'corporate', true,  21),
  ('other',      'Khác',                      'other',     false, 99);
```

Khi thêm quyền mới trong migration sau này: thêm dòng vào `permissions`, thêm vào vai trò `owner` (và `branch_manager` nếu phù hợp), rồi gọi `select private.rebuild_all_permissions();` ở cuối migration.

Gán vai trò ban đầu theo phản hồi CĐT: 1 Chủ chuỗi (toàn chuỗi), 2 Quản lý (`user_roles.branch_id = null`, tức toàn chuỗi), 16 Lễ tân (2 người mỗi cơ sở, gán đúng cơ sở). Sales và Kỹ thuật tạo khi có người.

## 4. Phía ứng dụng

### 4.1 Khóa quyền dạng hằng số có kiểu

```ts
// src/shared/auth/permission-keys.ts — PHẢI khớp bảng permissions (có test kiểm tra)
export const PERMISSIONS = [
  'stay.view', 'stay.create', 'stay.create_past', 'stay.update', 'stay.checkout', 'stay.cancel', 'stay.cancel_late',
  'room.block',
  'guest.search', 'guest.view_summary', 'guest.view_full', 'guest.view_full_own', 'guest.create', 'guest.update', 'guest.assign_owner', 'guest.note_create', 'guest.note_delete_any', 'guest.tag_manage', 'guest.export', 'guest.export_full',
  'audit.view_branch', 'audit.view_all',
  'settings.branches', 'settings.rooms', 'settings.users', 'settings.roles', 'settings.modules', 'settings.sources',
  'companion.manage',
  'merge.propose', 'merge.approve',
  'blacklist.view', 'blacklist.propose', 'blacklist.approve', 'blacklist.remove',
  'loyalty.view', 'loyalty.configure', 'loyalty.override',
  'consent.manage',
  'birthday.view',
  'voucher.issue', 'voucher.redeem',
  'partner.view', 'partner.manage',
  'contract.manage',
  'group.manage',
  'commission.view', 'commission.manage',
  'facility.view', 'facility.manage',
  'wo.view', 'wo.create', 'wo.assign', 'wo.work', 'wo.close',
  'pm.view', 'pm.manage',
  'inspection.perform', 'inspection.manage',
  'compliance.view', 'compliance.manage',
  'report.view_branch', 'report.view_chain', 'report.export',
  'revenue.view', 'revenue.input',
  'feedback.manage',
  'asm.export',
] as const;
export type Permission = (typeof PERMISSIONS)[number];
```

Test `permission-keys.test.ts` (chạy với Supabase local trong CI) so sánh `PERMISSIONS` với `select key from permissions`; lệch là fail.

### 4.2 Ngữ cảnh phiên trên server

```ts
// src/shared/auth/session.ts
import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import type { Permission } from './permission-keys';

export type ModuleState = 'off' | 'readonly' | 'on';
export type Access = {
  permissions: Record<string, Permission[]>;               // branchId → quyền
  modules: Record<string, Record<string, ModuleState>>;    // branchId → module → state
};

// cache(): mỗi request chỉ gọi DB đúng 1 lần dù nhiều component cùng hỏi
export const getSession = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return null;

  const [{ data: access }, cookieStore] = await Promise.all([supabase.rpc('my_access'), cookies()]);
  const a = (access ?? { permissions: {}, modules: {} }) as Access;
  const branchIds = Object.keys(a.permissions);
  const wanted = cookieStore.get('branch_id')?.value;
  const currentBranchId = wanted && branchIds.includes(wanted) ? wanted : branchIds[0] ?? null;

  const can = (perm: Permission, branchId?: string | null) =>
    branchId ? !!a.permissions[branchId]?.includes(perm)
             : branchIds.some((b) => a.permissions[b]?.includes(perm));

  return { userId: data.claims.sub as string, access: a, branchIds, currentBranchId, can };
});
```

```ts
// src/shared/auth/require-permission.ts
import 'server-only';
import { getSession } from './session';
import { fail, ok, type ActionResult } from '@/shared/errors';
import type { Permission } from './permission-keys';

export async function requirePermission(
  perm: Permission, branchId?: string | null,
): Promise<ActionResult<{ userId: string }>> {
  const s = await getSession();
  if (!s) return fail('UNAUTHENTICATED');
  if (!s.can(perm, branchId)) return fail('FORBIDDEN');
  return ok({ userId: s.userId });
}
```

Trong Server Component dùng cho trang: nếu không có quyền thì gọi `notFound()` hoặc `forbidden()` (khi đã bật `experimental.authInterrupts`), không render nửa trang.

### 4.3 Ẩn/hiện trên client

```tsx
// src/shared/auth/access-provider.tsx
'use client';
import { createContext, useContext } from 'react';
import type { Access } from './session';
import type { Permission } from './permission-keys';

const Ctx = createContext<{ access: Access; branchId: string | null } | null>(null);
export const AccessProvider = Ctx.Provider;

export function useCan() {
  const ctx = useContext(Ctx);
  return (perm: Permission, branchId = ctx?.branchId) =>
    !!ctx && !!branchId && !!ctx.access.permissions[branchId]?.includes(perm);
}

export function Can({ perm, children }: { perm: Permission; children: React.ReactNode }) {
  return useCan()(perm) ? <>{children}</> : null;
}
```

`app/(app)/layout.tsx` gọi `getSession()` và bọc toàn app bằng `<AccessProvider value={{ access, branchId: currentBranchId }}>`. Ẩn nút chỉ để giao diện gọn; bảo mật thật nằm ở Server Action + RPC + RLS.

## 5. Giao diện quản trị quyền

### 5.1 Màn hình Vai trò (`/settings/roles`) – ma trận checkbox

| Quyền (nhóm theo module) | Lễ tân | Quản lý cơ sở | Sales | Chủ chuỗi | Vai trò tuỳ chỉnh… |
| --- | --- | --- | --- | --- | --- |
| **Lõi → Lượt ở** · Check-in khách | ☑ | ☑ | ☐ | ☑ (khóa) | ☐ |
| **Lõi → Khách** · Xem hồ sơ 360° đầy đủ | ☐ | ☑ | ☑ | ☑ (khóa) | ☐ |
| **Blacklist** · Duyệt blacklist | ☐ | ☑ | ☐ | ☑ (khóa) | ☐ |

Hành vi:

- Nhóm theo `modules.group_name` → `modules.name`, dạng accordion; checkbox ở đầu nhóm để chọn/bỏ cả nhóm (trạng thái indeterminate khi chọn một phần).
- Cột Chủ chuỗi luôn tick và bị khóa.
- Quyền thuộc module `is_available = false` hiện mờ với nhãn "Sắp có", vẫn tick được để chuẩn bị trước.
- Quyền mà người đang thao tác không có → checkbox bị khóa, tooltip "Bạn không có quyền này nên không thể cấp".
- Thay đổi được gom lại; thanh dưới cùng hiện "Đã đổi 5 quyền · Lưu / Huỷ". Bấm Lưu → gọi `set_role_permissions` cho từng vai trò bị đổi.
- Nút "Tạo vai trò" (nhân bản từ vai trò có sẵn).

### 5.2 Màn hình Người dùng (`/settings/users/[id]`) – gán quyền bằng cách tích chọn

Người quản trị gán quyền cho từng nhân sự **chỉ bằng tích/bỏ tích ô chọn**; không cần hiểu khái niệm "ghi đè". Hệ thống tự quy đổi phía sau.

1. **Thông tin tài khoản:** họ tên, email, SĐT, trạng thái hoạt động, cơ sở mặc định.
2. **Phạm vi cơ sở:** tích chọn các cơ sở người này làm việc (hoặc "Toàn chuỗi").
3. **Vai trò mẫu (tuỳ chọn):** chọn Lễ tân / Quản lý / Sales / Kỹ thuật để **tích sẵn** một bộ quyền; có nút **"Sao chép quyền từ nhân sự khác"**. Không chọn vai trò nào cũng được: tích từng quyền từ đầu.
4. **Danh sách quyền:** nhóm theo module (accordion), mỗi quyền một ô tích, mỗi nhóm có ô "chọn cả nhóm".

```text
☐ Toàn chuỗi   ☑ Boutique   ☑ Grand   ☐ Xavia   ☐ Eco ...        Vai trò mẫu: [Lễ tân ▾]   [Sao chép từ...]

▾ Lượt ở                                         ▾ Hạng thành viên, giảm giá
  ☑ Check-in khách                                 ☑ Xem hạng và mức giảm giá của khách
  ☑ Sửa, gia hạn, đổi phòng                        ☐ Cấu hình hạng: tên, ngưỡng, % giảm giá
  ☑ Hủy lượt ở trong thời hạn tự hủy               ☐ Gán hạng thủ công cho khách
  ☐ Hủy lượt ở quá thời hạn tự hủy   ← khác vai trò mẫu
  ☐ Nhập bù lượt ở trong quá khứ
▾ Khách hàng
  ☑ Xem hồ sơ 360° đầy đủ mọi khách
  ☑ Xuất Excel danh sách khách (CCCD bị che)
  ...                                                         [Huỷ]   [Lưu – đã đổi 2 quyền]
```

Cách hệ thống quy đổi khi bấm Lưu (hàm thuần `features/admin/domain/to-access.ts`, có unit test):

| Người quản trị làm | Lưu vào DB |
| --- | --- |
| Chọn vai trò mẫu + phạm vi cơ sở | Dòng `user_roles` (vai trò × từng cơ sở, hoặc `branch_id = null` nếu Toàn chuỗi) |
| Tích một quyền mà vai trò mẫu **không có** | `user_permission_overrides` với `effect = 'grant'` |
| Bỏ tích một quyền mà vai trò mẫu **có** | `user_permission_overrides` với `effect = 'deny'` |
| Không chọn vai trò mẫu, tự tích | Toàn bộ là `grant`, không có `user_roles` |
| Sao chép từ nhân sự khác | Copy nguyên `user_roles` + `user_permission_overrides` của người đó |

- Ô nào khác với vai trò mẫu được đánh dấu "khác vai trò mẫu" để người duyệt nhận ra ngay; có nút "Đưa về đúng vai trò mẫu".
- Ô của quyền mà **người đang thao tác không có** bị khóa (không cấp được quyền mình không có).
- Quyền thuộc module đang tắt ở cơ sở được chọn vẫn tích được nhưng hiện nhãn "Module đang tắt" (có hiệu lực khi module bật).
- Chế độ **nâng cao** (cho chủ chuỗi): bật lên thì mỗi ô thành 3 trạng thái Kế thừa / Cho phép / Cấm và cho phép đặt khác nhau theo từng cơ sở.
- Tích thêm một quyền nhạy cảm (`guest.export*`, `settings.*`, `loyalty.override`, `stay.create_past`) bắt buộc nhập lý do ngắn, lưu vào `reason` và nhật ký.
- Lưu → `set_user_access` (một transaction), có hiệu lực ở lần tải trang kế tiếp của người đó.
- Không cho chỉnh chính mình; không sửa được người đang có quyền mình không có; luôn còn ít nhất 1 Chủ chuỗi.

Màn hình **Vai trò** (5.1) vẫn dùng để sửa bộ quyền mẫu cho cả nhóm người; màn hình **Người dùng** dùng để chỉnh từng người.

### 5.3 Màn hình Module (`/settings/modules`)

Ma trận hàng = module, cột = cơ sở + cột "Toàn chuỗi". Mỗi ô là segmented control **Tắt / Chỉ xem / Bật**. Bật module có phụ thuộc chưa bật → hộp thoại đề nghị bật luôn module cha. Tắt module cha → hộp thoại liệt kê module con sẽ bị tắt theo. Module có cấu hình (ví dụ hạng thành viên của `loyalty`) có nút mở trang cấu hình riêng (`/settings/loyalty`).

## 6. Kiểm thử bắt buộc (pgTAP)

- Lễ tân CS1 không đọc được `stays` của CS2.
- Ghi đè "Cấm" thắng quyền từ vai trò.
- Module Chỉ xem: còn `stay.view`, mất `stay.create`.
- Tắt module cha → module con về `off`.
- `set_role_permissions` từ chối cấp quyền mà người gọi không có.
- `set_user_access` từ chối sửa chính mình và từ chối khi không còn Chủ chuỗi.
- Khóa tài khoản (`profiles.is_active = false`) → `user_effective_permissions` của người đó rỗng.
- Quản lý (thiếu `guest.export_full`) không sửa được tài khoản Chủ chuỗi.
- Sales chỉ xem đầy đủ hồ sơ có `sales_owner_id` là mình; hồ sơ khác trả về bản che.
- Lễ tân xuất Excel chỉ ra khách từng ở cơ sở mình, tối đa `export.max_rows_branch` dòng, CCCD che.
