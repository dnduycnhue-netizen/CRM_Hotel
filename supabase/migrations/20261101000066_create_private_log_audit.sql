-- Migration 66: Tạo hàm private.log_audit ghi nhận audit log
-- Khắc phục lỗi thiếu hàm private.log_audit (42883) trong upsert_compliance_doc được phát hiện trong QA Vòng 25

create or replace function private.log_audit(
  p_branch_id uuid,
  p_action text,
  p_entity text,
  p_entity_id uuid,
  p_meta jsonb default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_logs (actor_id, branch_id, action, entity, entity_id, meta)
  values ((select auth.uid()), p_branch_id, p_action, p_entity, p_entity_id, p_meta);
$$;

revoke all on function private.log_audit(uuid, text, text, uuid, jsonb) from public;
grant execute on function private.log_audit(uuid, text, text, uuid, jsonb) to authenticated, service_role;
