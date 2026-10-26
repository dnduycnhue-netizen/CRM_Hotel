-- Môi trường giả tối thiểu để chạy migration 52 trên Postgres nhúng (PGlite) trong Vitest.
-- Chỉ mô phỏng các bảng / hàm phân quyền mà migration 52 phụ thuộc:
--   * auth.uid()            -> đọc từ cấu hình phiên 'test.uid'
--   * private.has_perm(...) -> đọc danh sách quyền từ cấu hình phiên 'test.perms'
-- KHÔNG thay thế `pnpm supabase test db` (pgTAP) vì không kiểm tra RLS và hàm quyền thật.

create schema if not exists auth; create schema if not exists private;
do $$ begin create role authenticated; exception when duplicate_object then null; end $$;
do $$ begin create role anon; exception when duplicate_object then null; end $$;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
create table public.profiles (id uuid primary key, full_name text, is_active boolean default true);
create table public.partners (id uuid primary key default gen_random_uuid(), name text not null, kind text, contact_name text, phone text, email text, tax_code text, note text, is_active boolean default true, address text, bank_name text, bank_account text, bank_holder text, credit_limit numeric default 0, payment_terms text, created_at timestamptz default now(), updated_at timestamptz default now());
create unique index partners_name_uq on public.partners (lower(name));
create table public.guests (id uuid primary key default gen_random_uuid(), full_name text, phone text, merged_into uuid);
create table public.modules (key text primary key, name text, group_name text, depends_on text[], default_state text, is_core boolean, is_available boolean, sort int);
create table public.permissions (key text primary key, module_key text, kind text, label text, sort int);
create table public.roles (id uuid primary key default gen_random_uuid(), key text unique, name text, is_system boolean);
create table public.role_permissions (role_id uuid, permission_key text, primary key (role_id, permission_key));
create table public.user_effective_permissions (user_id uuid, branch_id uuid, permission_key text);
create table public.audit_logs (id bigserial primary key, actor_id uuid, action text, entity text, entity_id uuid, meta jsonb);
insert into public.roles(key,name,is_system) values ('sales','Sales',true),('branch_manager','QL',true),('owner','Owner',true);
-- Phân quyền giả: test.perms = danh sách quyền phân tách bằng dấu phẩy
create function private.has_perm(p_perm text, p_branch uuid default null) returns boolean language sql stable as $$
  select p_perm = any(string_to_array(coalesce(current_setting('test.perms', true), ''), ',')) $$;
create function private.assert_perm(p_perm text, p_branch uuid default null) returns void language plpgsql stable as $$
begin
  if auth.uid() is null then raise exception 'unauthenticated' using errcode='P0401'; end if;
  if not private.has_perm(p_perm) then raise exception 'forbidden: %', p_perm using errcode='P0403'; end if;
end $$;
create function private.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at := now(); return new; end $$;
create function private.audit_row() returns trigger language plpgsql as $$ begin insert into public.audit_logs(actor_id,action,entity) values (auth.uid(), lower(tg_op), tg_table_name); return null; end $$;
create function private.log_event(p_action text, p_entity text, p_entity_id uuid, p_branch_id uuid default null, p_meta jsonb default null) returns void language sql as $$ insert into public.audit_logs(actor_id,action,entity,entity_id,meta) values (auth.uid(),p_action,p_entity,p_entity_id,p_meta) $$;
create function private.rebuild_all_permissions() returns void language sql as $$ select 1 $$;
