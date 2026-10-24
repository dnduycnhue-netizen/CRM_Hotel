-- 20261101000035_module_matrix_and_availability.sql
-- Triển khai nền tảng Sprint 1: Bật/tắt module thật, ẩn asm_export và khóa qr_cccd

-- 1. Bổ sung cột is_hidden vào bảng modules để ẩn các module đã bỏ khỏi phạm vi
alter table public.modules add column if not exists is_hidden boolean not null default false;

-- 2. Ẩn module asm_export (CĐT quyết định bỏ) nhưng vẫn giữ dòng trong DB để toàn vẹn khóa ngoại
update public.modules
   set is_hidden = true,
       is_available = false
 where key = 'asm_export';

-- 3. Cập nhật qr_cccd.is_available = false (chưa phát triển, sẽ bật ở Sprint 4 / §5)
update public.modules
   set is_available = false
 where key = 'qr_cccd';

-- 4. Đảm bảo audit trigger trên branch_modules hoạt động chuẩn xác
drop trigger if exists branch_modules_audit on public.branch_modules;
create trigger branch_modules_audit
  after insert or update or delete on public.branch_modules
  for each row execute function private.audit_row();

-- 5. Cập nhật hàm public.my_access() để lọc bỏ các module is_hidden khỏi danh sách module trả về
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
        select jsonb_object_agg(m.key, private.module_state(b.id, m.key))
        from public.modules m
        where not coalesce(m.is_hidden, false)))
      from public.branches b
      where b.id in (select branch_id from public.user_effective_permissions
                     where user_id = (select auth.uid()))), '{}'::jsonb)
  );
$$;

-- 6. Đảm bảo quyền gọi RPC set_branch_module cho authenticated
grant execute on function public.set_branch_module(uuid, text, public.module_state, jsonb) to authenticated;
