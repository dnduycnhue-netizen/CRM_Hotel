-- Migration 65: Sửa RPC upsert_compliance_doc chấp nhận compliance.manage HOẶC facility.manage
-- Phục vụ QA Vòng 23 - Cho phép tài khoản kỹ thuật viên CSVC cập nhật hồ sơ pháp lý theo cơ sở

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

  -- Dual-layer permission checking: chấp nhận compliance.manage HOẶC facility.manage
  if not (private.has_perm('compliance.manage', v_branch_id) or private.has_perm('facility.manage', v_branch_id)) then
    raise exception 'forbidden: compliance.manage or facility.manage' using errcode = 'P0403';
  end if;
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

revoke all on function public.upsert_compliance_doc(jsonb) from public, anon;
grant execute on function public.upsert_compliance_doc(jsonb) to authenticated;
