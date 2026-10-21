-- 20261101000015_merge_and_flags_rpc.sql
-- Bổ sung các RPC đề xuất gộp, từ chối gộp, đề xuất cờ và duyệt cờ

-- 1. Đề xuất gộp hồ sơ khách
create or replace function public.propose_merge(
  p_keep uuid,
  p_drop uuid,
  p_reason text
)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_req_id uuid;
begin
  perform private.assert_perm('merge.propose');

  if p_keep = p_drop then
    raise exception 'cannot merge guest into themselves' using errcode = 'P0422';
  end if;

  if not exists (select 1 from public.guests where id = p_keep and merged_into is null) or
     not exists (select 1 from public.guests where id = p_drop and merged_into is null) then
    raise exception 'both guests must be active' using errcode = 'P0409';
  end if;

  insert into public.merge_requests (keep_guest_id, drop_guest_id, source, match_reason, proposed_by)
  values (p_keep, p_drop, 'user', coalesce(nullif(btrim(p_reason), ''), 'manual'), (select auth.uid()))
  on conflict (least(keep_guest_id, drop_guest_id), greatest(keep_guest_id, drop_guest_id)) where status = 'pending'
  do update set match_reason = excluded.match_reason, proposed_by = excluded.proposed_by
  returning id into v_req_id;

  perform private.log_event('merge.propose', 'merge_requests', v_req_id, null,
                            jsonb_build_object('keep', p_keep, 'drop', p_drop, 'reason', p_reason));

  return v_req_id;
end $$;

-- 2. Từ chối yêu cầu gộp hồ sơ
create or replace function public.reject_merge(p_request_id uuid, p_note text)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  r public.merge_requests;
begin
  perform private.assert_perm('merge.approve');

  select * into r from public.merge_requests where id = p_request_id and status = 'pending' for update;
  if not found then
    raise exception 'request not pending' using errcode = 'P0409';
  end if;

  update public.merge_requests
  set status = 'rejected',
      decided_by = (select auth.uid()),
      decided_at = now()
  where id = p_request_id;

  perform private.log_event('merge.reject', 'merge_requests', p_request_id, null, jsonb_build_object('note', p_note));
end $$;

-- 3. Đề xuất gắn cờ (Blacklist hoặc Lưu ý)
create or replace function public.propose_flag(
  p_guest_id uuid,
  p_branch_id uuid,
  p_type public.flag_type,
  p_reason text,
  p_evidence text[] default '{}'
)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_flag_id uuid;
begin
  perform private.assert_perm_at('blacklist.propose', p_branch_id);

  if char_length(btrim(coalesce(p_reason, ''))) < 10 then
    raise exception 'reason must be at least 10 chars' using errcode = 'P0422';
  end if;

  insert into public.guest_flags (guest_id, branch_id, flag_type, reason, evidence_paths, proposed_by)
  values (p_guest_id, p_branch_id, p_type, btrim(p_reason), coalesce(p_evidence, '{}'), (select auth.uid()))
  returning id into v_flag_id;

  perform private.log_event('blacklist.propose', 'guest_flags', v_flag_id, p_branch_id,
                            jsonb_build_object('guest_id', p_guest_id, 'type', p_type, 'reason', p_reason));

  return v_flag_id;
end $$;

-- 4. Quyết định duyệt / từ chối cờ
create or replace function public.decide_flag(
  p_id uuid,
  p_approve boolean,
  p_note text default null
)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  f public.guest_flags;
begin
  select * into f from public.guest_flags where id = p_id and status = 'proposed' for update;
  if not found then
    raise exception 'flag not found or not proposed' using errcode = 'P0404';
  end if;

  perform private.assert_perm_at('blacklist.approve', f.branch_id);

  update public.guest_flags
  set status = case when p_approve then 'approved'::public.flag_status else 'removed'::public.flag_status end,
      decided_by = (select auth.uid()),
      decided_at = now(),
      decision_note = nullif(btrim(p_note), ''),
      removed_by = case when not p_approve then (select auth.uid()) end,
      removed_at = case when not p_approve then now() end,
      removed_reason = case when not p_approve then coalesce(nullif(btrim(p_note), ''), 'Từ chối phê duyệt') end
  where id = p_id;

  perform private.log_event('blacklist.decide', 'guest_flags', p_id, f.branch_id,
                            jsonb_build_object('approved', p_approve, 'note', p_note));
end $$;

-- 5. Gỡ bỏ cờ đang hiệu lực
create or replace function public.remove_flag(
  p_id uuid,
  p_reason text
)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  f public.guest_flags;
begin
  select * into f from public.guest_flags where id = p_id and status = 'approved' for update;
  if not found then
    raise exception 'flag not found or not approved' using errcode = 'P0404';
  end if;

  perform private.assert_perm('blacklist.remove');

  if char_length(btrim(coalesce(p_reason, ''))) < 5 then
    raise exception 'reason must be at least 5 chars' using errcode = 'P0422';
  end if;

  update public.guest_flags
  set status = 'removed',
      removed_by = (select auth.uid()),
      removed_at = now(),
      removed_reason = btrim(p_reason)
  where id = p_id;

  perform private.log_event('blacklist.remove', 'guest_flags', p_id, f.branch_id, jsonb_build_object('reason', p_reason));
end $$;

-- 6. Phân quyền
do $$
declare fn text;
begin
  foreach fn in array array[
    'public.propose_merge(uuid, uuid, text)',
    'public.reject_merge(uuid, text)',
    'public.propose_flag(uuid, uuid, public.flag_type, text, text[])',
    'public.decide_flag(uuid, boolean, text)',
    'public.remove_flag(uuid, text)'
  ] loop
    execute format('revoke all on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end $$;
