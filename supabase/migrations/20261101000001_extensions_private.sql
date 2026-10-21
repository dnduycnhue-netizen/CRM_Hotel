-- 20261101000001_extensions_private.sql
create extension if not exists pg_trgm  with schema extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists fuzzystrmatch with schema extensions;   -- levenshtein cho CCCD lệch 1 số
create extension if not exists pg_cron;                                -- job hằng đêm (bật trong Dashboard → Integrations nếu cần)

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;   -- policy RLS cần gọi hàm private
-- Hàm tạo sau này trong private mặc định KHÔNG ai được gọi; cấp quyền từng hàm khi cần
alter default privileges in schema private revoke execute on functions from public;
-- RPC public: không cho anon gọi; cấp cho authenticated từng hàm (xem 06)
alter default privileges in schema public revoke execute on functions from public, anon;

create type public.gender        as enum ('male', 'female', 'other');
create type public.doc_type      as enum ('cccd', 'passport');
create type public.stay_status   as enum ('in_house', 'checked_out', 'cancelled');
create type public.entry_mode    as enum ('live', 'backdated', 'import');   -- nhập tại quầy / nhập bù quá khứ / nhập từ hệ thống khác
create type public.note_kind     as enum ('general', 'preference', 'sales');
create type public.flag_type     as enum ('blacklist', 'attention');
create type public.flag_status   as enum ('proposed', 'approved', 'rejected', 'removed');
create type public.merge_status  as enum ('pending', 'approved', 'rejected');
create type public.module_state  as enum ('off', 'readonly', 'on');
create type public.perm_effect   as enum ('grant', 'deny');
create type public.perm_kind     as enum ('view', 'write');

-- Chuẩn hoá chuỗi để tìm kiếm: bỏ dấu, chữ thường, đ → d, gộp khoảng trắng
create or replace function private.normalize_search(p text)
returns text language sql immutable parallel safe strict
set search_path = ''
as $$
  select translate(
           lower(extensions.unaccent('extensions.unaccent'::regdictionary,
                 regexp_replace(btrim(p), '\s+', ' ', 'g'))),
           'đ', 'd');
$$;

create or replace function private.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;
