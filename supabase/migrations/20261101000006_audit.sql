-- 20261101000006_audit.sql
create table public.audit_logs (
  id          bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_id    uuid,
  branch_id   uuid,
  action      text not null,          -- 'insert' | 'update' | 'delete' | 'guest.view_full' | 'guest.export' | ...
  entity      text not null,          -- tên bảng hoặc đối tượng
  entity_id   uuid,
  before      jsonb,
  after       jsonb,
  meta        jsonb
);
create index audit_entity_idx on public.audit_logs(entity, entity_id, occurred_at desc);
create index audit_actor_idx  on public.audit_logs(actor_id, occurred_at desc);
create index audit_branch_idx on public.audit_logs(branch_id, occurred_at desc);

-- Ghi sự kiện không phải thay đổi dữ liệu (xem hồ sơ đầy đủ, xuất file, xác nhận cảnh báo)
create or replace function private.log_event(
  p_action text, p_entity text, p_entity_id uuid, p_branch_id uuid default null, p_meta jsonb default null)
returns void language sql security definer set search_path = '' as $$
  insert into public.audit_logs (actor_id, branch_id, action, entity, entity_id, meta)
  values ((select auth.uid()), p_branch_id, p_action, p_entity, p_entity_id, p_meta);
$$;

-- Trigger audit dùng chung; bỏ các cột nhiễu
create or replace function private.audit_row()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_before jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) - 'updated_at' - 'search_name' end;
  v_after  jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) - 'updated_at' - 'search_name' end;
  v_row    jsonb := coalesce(v_after, v_before);
begin
  if tg_op = 'UPDATE' and v_before = v_after then
    return null;                                   -- không có thay đổi thật
  end if;
  insert into public.audit_logs (actor_id, branch_id, action, entity, entity_id, before, after)
  values ((select auth.uid()),
          nullif(v_row ->> 'branch_id', '')::uuid,
          lower(tg_op),
          tg_table_name,
          nullif(coalesce(v_row ->> 'id', v_row ->> 'guest_id', v_row ->> 'stay_id'), '')::uuid,
          v_before,
          v_after);
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'guests', 'guest_documents', 'stays', 'stay_guests', 'guest_flags', 'guest_notes',
    'guest_consents', 'merge_requests', 'branches', 'rooms', 'profiles',
    'source_channels', 'partners', 'room_blocks', 'app_settings', 'loyalty_tiers'
  ] loop
    execute format(
      'create trigger %I after insert or update or delete on public.%I
         for each row execute function private.audit_row()', t || '_audit', t);
  end loop;
end $$;

-- Append-only: không ai sửa/xoá log qua API
revoke update, delete, truncate on public.audit_logs from authenticated, anon;
