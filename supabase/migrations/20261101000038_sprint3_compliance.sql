-- Migration 38: Sprint 3 - Module Compliance (Hồ sơ pháp lý, kiểm định cơ sở vật chất)
-- Implements:
-- 1. Storage bucket 'compliance' with private access and RLS
-- 2. Seed additional compliance_doc_types (attp, environment, lightning)
-- 3. RPC upsert_compliance_doc with renewal versioning
-- 4. RPC get_compliance_matrix for branch x doc_type status view
-- 5. RPC get_compliance_docs_list for detailed search & filter
-- 6. RPC get_compliance_history for previous version history
-- 7. Activate module 'compliance' (is_available = true)

-- 1. Storage bucket & policies
insert into storage.buckets (id, name, public)
values ('compliance', 'compliance', false)
on conflict (id) do nothing;

create policy "compliance_read" on storage.objects for select to authenticated
using (
  bucket_id = 'compliance'
);

create policy "compliance_write" on storage.objects for insert to authenticated
with check (
  bucket_id = 'compliance'
);

create policy "compliance_update" on storage.objects for update to authenticated
using (
  bucket_id = 'compliance'
)
with check (
  bucket_id = 'compliance'
);

-- 2. Additional compliance doc types seed
insert into public.compliance_doc_types (code, name, applies_to, remind_days, sort) values
  ('attp',        'Giấy chứng nhận cơ sở đủ điều kiện An toàn thực phẩm', 'branch', 45, 11),
  ('environment', 'Giấy phép môi trường / Đăng ký môi trường',            'branch', 60, 12),
  ('lightning',   'Biên bản đo điện trở chống sét định kỳ',               'branch', 30, 13)
on conflict (code) do nothing;

-- 3. RPC upsert_compliance_doc
create or replace function public.upsert_compliance_doc(
  p jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_branch_id uuid;
  v_doc_type_id uuid;
  v_asset_id uuid;
  v_number text;
  v_issuer text;
  v_issued_on date;
  v_expires_on date;
  v_file_paths text[];
  v_note text;
  v_is_renew boolean;
  v_new_id uuid;
begin
  v_id          := nullif(p->>'id', '')::uuid;
  v_branch_id   := (p->>'branch_id')::uuid;
  v_doc_type_id := (p->>'doc_type_id')::uuid;
  v_asset_id    := nullif(p->>'asset_id', '')::uuid;
  v_number      := nullif(trim(p->>'number'), '');
  v_issuer      := nullif(trim(p->>'issuer'), '');
  v_issued_on   := nullif(p->>'issued_on', '')::date;
  v_expires_on  := nullif(p->>'expires_on', '')::date;
  v_note        := nullif(trim(p->>'note'), '');
  v_is_renew    := coalesce((p->>'is_renew')::boolean, false);

  if v_branch_id is null or v_doc_type_id is null then
    raise exception 'Branch ID and Doc Type ID are required' using errcode = 'P0400';
  end if;

  if v_expires_on is not null and v_issued_on is not null and v_expires_on < v_issued_on then
    raise exception 'Ngày hết hạn không được trước ngày cấp' using errcode = 'P0422';
  end if;

  -- Dual-layer permission checking
  perform private.assert_perm_at('compliance.manage', v_branch_id);
  perform private.assert_module(v_branch_id, 'compliance');

  -- Parse file_paths array
  if p ? 'file_paths' and jsonb_typeof(p->'file_paths') = 'array' then
    select coalesce(array_agg(value::text), '{}'::text[])
    into v_file_paths
    from jsonb_array_elements_text(p->'file_paths');
  else
    v_file_paths := '{}'::text[];
  end if;

  if v_id is not null and not v_is_renew then
    -- Direct update existing current document
    update public.compliance_docs
    set number      = v_number,
        issuer      = v_issuer,
        issued_on   = v_issued_on,
        expires_on  = v_expires_on,
        file_paths  = v_file_paths,
        note        = v_note,
        asset_id    = v_asset_id,
        updated_at  = now()
    where id = v_id and branch_id = v_branch_id;

    if not found then
      raise exception 'Hồ sơ pháp lý không tồn tại' using errcode = 'P0404';
    end if;

    perform private.log_audit(
      v_branch_id,
      'compliance_doc.update',
      'compliance_docs',
      v_id,
      jsonb_build_object('number', v_number, 'expires_on', v_expires_on)
    );

    return jsonb_build_object('id', v_id, 'action', 'updated');
  else
    -- Creating a new document OR renewing an existing one
    -- If renewing or inserting new, archive any existing active document of the same type/asset in branch
    if v_id is not null and v_is_renew then
      update public.compliance_docs
      set is_current = false,
          updated_at = now()
      where id = v_id;
    else
      -- Check if any other doc of same branch & type & asset is currently marked active
      update public.compliance_docs
      set is_current = false,
          updated_at = now()
      where branch_id = v_branch_id
        and doc_type_id = v_doc_type_id
        and ((asset_id is null and v_asset_id is null) or asset_id = v_asset_id)
        and is_current = true;
    end if;

    insert into public.compliance_docs (
      branch_id,
      doc_type_id,
      asset_id,
      number,
      issuer,
      issued_on,
      expires_on,
      file_paths,
      note,
      is_current,
      created_by
    ) values (
      v_branch_id,
      v_doc_type_id,
      v_asset_id,
      v_number,
      v_issuer,
      v_issued_on,
      v_expires_on,
      v_file_paths,
      v_note,
      true,
      auth.uid()
    ) returning id into v_new_id;

    perform private.log_audit(
      v_branch_id,
      case when v_is_renew then 'compliance_doc.renew' else 'compliance_doc.create' end,
      'compliance_docs',
      v_new_id,
      jsonb_build_object(
        'previous_id', v_id,
        'number', v_number,
        'doc_type_id', v_doc_type_id,
        'expires_on', v_expires_on
      )
    );

    return jsonb_build_object('id', v_new_id, 'action', case when v_is_renew then 'renewed' else 'created' end);
  end if;
end $$;

-- 4. RPC get_compliance_matrix
create or replace function public.get_compliance_matrix(
  p_branch_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := current_date;
  v_branches jsonb;
  v_doc_types jsonb;
  v_cells jsonb;
begin
  -- Branches list
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', b.id,
    'name', b.name,
    'code', b.code
  ) order by b.name), '[]'::jsonb)
  into v_branches
  from public.branches b
  where b.is_active = true
    and (p_branch_id is null or b.id = p_branch_id)
    and (private.has_perm('report.view_chain') or private.has_perm('compliance.view', b.id));

  -- Doc types list
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', dt.id,
    'code', dt.code,
    'name', dt.name,
    'applies_to', dt.applies_to,
    'remind_days', dt.remind_days,
    'sort', dt.sort
  ) order by dt.sort, dt.name), '[]'::jsonb)
  into v_doc_types
  from public.compliance_doc_types dt;

  -- Cells: active compliance documents status
  select coalesce(jsonb_agg(jsonb_build_object(
    'branch_id', d.branch_id,
    'doc_type_id', d.doc_type_id,
    'doc_id', d.id,
    'number', d.number,
    'issuer', d.issuer,
    'issued_on', d.issued_on,
    'expires_on', d.expires_on,
    'file_paths', d.file_paths,
    'file_count', cardinality(d.file_paths),
    'note', d.note,
    'asset_id', d.asset_id,
    'asset_name', a.name,
    'status', case
      when d.expires_on is null then 'good'
      when d.expires_on < v_today then 'expired'
      when d.expires_on <= v_today + dt.remind_days then 'expiring'
      else 'good'
    end,
    'days_remaining', case
      when d.expires_on is not null then (d.expires_on - v_today)
      else null
    end
  )), '[]'::jsonb)
  into v_cells
  from public.compliance_docs d
  join public.compliance_doc_types dt on dt.id = d.doc_type_id
  left join public.assets a on a.id = d.asset_id
  where d.is_current = true
    and (p_branch_id is null or d.branch_id = p_branch_id)
    and (private.has_perm('report.view_chain') or private.has_perm('compliance.view', d.branch_id));

  return jsonb_build_object(
    'branches', v_branches,
    'doc_types', v_doc_types,
    'cells', v_cells
  );
end $$;

-- 5. RPC get_compliance_docs_list
create or replace function public.get_compliance_docs_list(
  p_branch_id uuid default null,
  p_doc_type_id uuid default null,
  p_status text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := current_date;
  v_results jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', d.id,
    'branch_id', d.branch_id,
    'branch_name', b.name,
    'doc_type_id', d.doc_type_id,
    'doc_type_code', dt.code,
    'doc_type_name', dt.name,
    'applies_to', dt.applies_to,
    'remind_days', dt.remind_days,
    'asset_id', d.asset_id,
    'asset_name', a.name,
    'number', d.number,
    'issuer', d.issuer,
    'issued_on', d.issued_on,
    'expires_on', d.expires_on,
    'days_remaining', case when d.expires_on is not null then (d.expires_on - v_today) else null end,
    'status', case
      when d.expires_on is null then 'good'
      when d.expires_on < v_today then 'expired'
      when d.expires_on <= v_today + dt.remind_days then 'expiring'
      else 'good'
    end,
    'file_paths', d.file_paths,
    'file_count', cardinality(d.file_paths),
    'note', d.note,
    'is_current', d.is_current,
    'created_at', d.created_at,
    'created_by_name', prof.full_name,
    'history_count', (
      select count(*)
      from public.compliance_docs old
      where old.branch_id = d.branch_id
        and old.doc_type_id = d.doc_type_id
        and ((old.asset_id is null and d.asset_id is null) or old.asset_id = d.asset_id)
        and old.is_current = false
    )
  ) order by
    case
      when d.expires_on is not null and d.expires_on < v_today then 1
      when d.expires_on is not null and d.expires_on <= v_today + dt.remind_days then 2
      else 3
    end,
    d.expires_on asc nulls last,
    d.created_at desc
  ), '[]'::jsonb)
  into v_results
  from public.compliance_docs d
  join public.branches b on b.id = d.branch_id
  join public.compliance_doc_types dt on dt.id = d.doc_type_id
  left join public.assets a on a.id = d.asset_id
  left join public.profiles prof on prof.id = d.created_by
  where d.is_current = true
    and (p_branch_id is null or d.branch_id = p_branch_id)
    and (p_doc_type_id is null or d.doc_type_id = p_doc_type_id)
    and (private.has_perm('report.view_chain') or private.has_perm('compliance.view', d.branch_id))
    and (
      p_status is null
      or p_status = 'all'
      or (p_status = 'expired' and d.expires_on is not null and d.expires_on < v_today)
      or (p_status = 'expiring' and d.expires_on is not null and d.expires_on >= v_today and d.expires_on <= v_today + dt.remind_days)
      or (p_status = 'good' and (d.expires_on is null or d.expires_on > v_today + dt.remind_days))
    );

  return v_results;
end $$;

-- 6. RPC get_compliance_history
create or replace function public.get_compliance_history(
  p_doc_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target public.compliance_docs;
  v_history jsonb;
begin
  select * into v_target
  from public.compliance_docs
  where id = p_doc_id;

  if not found then
    return '[]'::jsonb;
  end if;

  if not (private.has_perm('report.view_chain') or private.has_perm('compliance.view', v_target.branch_id)) then
    raise exception 'Không có quyền xem hồ sơ cơ sở này' using errcode = 'P0403';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', old.id,
    'number', old.number,
    'issuer', old.issuer,
    'issued_on', old.issued_on,
    'expires_on', old.expires_on,
    'file_paths', old.file_paths,
    'note', old.note,
    'created_at', old.created_at,
    'created_by_name', prof.full_name
  ) order by old.created_at desc), '[]'::jsonb)
  into v_history
  from public.compliance_docs old
  left join public.profiles prof on prof.id = old.created_by
  where old.branch_id = v_target.branch_id
    and old.doc_type_id = v_target.doc_type_id
    and ((old.asset_id is null and v_target.asset_id is null) or old.asset_id = v_target.asset_id)
    and old.id <> v_target.id;

  return v_history;
end $$;

-- 7. Grant permissions
revoke all on function public.upsert_compliance_doc(jsonb) from public, anon;
grant execute on function public.upsert_compliance_doc(jsonb) to authenticated;

revoke all on function public.get_compliance_matrix(uuid) from public, anon;
grant execute on function public.get_compliance_matrix(uuid) to authenticated;

revoke all on function public.get_compliance_docs_list(uuid, uuid, text) from public, anon;
grant execute on function public.get_compliance_docs_list(uuid, uuid, text) to authenticated;

revoke all on function public.get_compliance_history(uuid) from public, anon;
grant execute on function public.get_compliance_history(uuid) to authenticated;

-- 8. Mark module compliance as available
update public.modules
set is_available = true
where key = 'compliance';
