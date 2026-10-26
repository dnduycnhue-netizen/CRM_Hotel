-- 20261101000053_prospect_unassigned_option.sql
-- Phương án A (chủ chuỗi chốt 26/10/2026): cho phép "Không gán" người phụ trách để sales
-- tự nhận sau (claim_prospect). QA vòng 16: qua giao diện / import không bao giờ tạo được
-- prospect chưa gán nên nút "Nhận chăm sóc" không thể xuất hiện.
--
--  1. save_prospect: phân biệt key assigned_to vắng mặt (mặc định người tạo) với
--     assigned_to = null (cố ý không gán). Chỉ quản lý/owner; sales luôn là chính mình.
--  2. assign_prospect: cho p_assignee = null ("Không gán").
--  3. get_prospects: thêm p_unassigned_only (bộ lọc "Chưa gán").
--  4. unassign_prospects: bỏ gán hàng loạt để dọn dữ liệu đã import.
-- Không đổi: claim_prospect, can_claim, RLS, che SĐT.

create or replace function public.save_prospect(
  p_payload jsonb,
  p_force boolean default false,
  p_force_reason text default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid       uuid := (select auth.uid());
  v_is_mgr    boolean;
  v_id        uuid := nullif(p_payload ->> 'id', '')::uuid;
  v_old       public.tour_prospects%rowtype;
  v_name      text := btrim(coalesce(p_payload ->> 'company_name', ''));
  v_kind      text := coalesce(nullif(p_payload ->> 'kind', ''), 'other');
  v_phone     text := nullif(btrim(coalesce(p_payload ->> 'phone', '')), '');
  v_email     text := nullif(lower(btrim(coalesce(p_payload ->> 'email', ''))), '');
  v_tax       text := nullif(btrim(coalesce(p_payload ->> 'tax_code', '')), '');
  v_website   text := nullif(btrim(coalesce(p_payload ->> 'website', '')), '');
  v_province  text := nullif(btrim(coalesce(p_payload ->> 'province', '')), '');
  v_cphone    text := nullif(btrim(coalesce(p_payload ->> 'contact_phone', '')), '');
  v_assignee  uuid;
  v_priority  text := coalesce(nullif(p_payload ->> 'priority', ''), 'medium');
  v_follow    date := nullif(p_payload ->> 'next_follow_up_at', '')::date;
  v_dup       record;
  v_cands     jsonb;
  v_notices   jsonb;
  v_reason    text := nullif(btrim(coalesce(p_force_reason, '')), '');
  v_check_soft boolean := true;
begin
  perform private.assert_perm('prospect.manage');
  v_is_mgr := private.has_perm('prospect.assign');

  if char_length(v_name) < 2 or char_length(v_name) > 160 then
    raise exception 'Tên công ty phải từ 2 đến 160 ký tự' using errcode = 'P0422';
  end if;
  if v_kind not in ('tour_operator','travel_agency','mice','pilgrimage','school','corporate','small_tour','other') then
    raise exception 'Loại hình không hợp lệ' using errcode = 'P0422';
  end if;
  if v_priority not in ('high','medium','low') then
    raise exception 'Độ ưu tiên không hợp lệ' using errcode = 'P0422';
  end if;
  if v_phone is null and v_email is null then
    raise exception 'Cần ít nhất số điện thoại hoặc email để chống trùng' using errcode = 'P0422';
  end if;
  if v_phone is not null and length(coalesce(private.normalize_phone(v_phone), '')) < 8 then
    raise exception 'Số điện thoại không hợp lệ' using errcode = 'P0422';
  end if;
  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Email không đúng định dạng' using errcode = 'P0422';
  end if;

  if v_id is not null then
    select * into v_old from public.tour_prospects where id = v_id for update;
    if not found then
      raise exception 'Không tìm thấy khách tiềm năng' using errcode = 'P0404';
    end if;
    perform private.assert_prospect_editable(v_old);
    -- Chỉ kiểm tra nghi trùng lại khi các trường dùng để so trùng thay đổi
    v_check_soft := private.normalize_company_name(v_name) is distinct from v_old.name_norm
                 or private.normalize_domain(v_website) is distinct from v_old.website_domain
                 or lower(coalesce(v_province, '')) is distinct from lower(coalesce(v_old.province, ''));
  end if;

  -- Lớp 1: chặn cứng MST rồi SĐT (cả prospects lẫn partners)
  select d.* into v_dup
    from private.find_prospect_duplicates(v_name, v_phone, v_tax, v_website, v_province, v_id) d
   where d.match_type = 'hard_tax' limit 1;
  if found then
    raise exception 'Trùng mã số thuế với % "%"',
      case v_dup.source when 'partner' then 'đối tác' else 'khách tiềm năng' end, v_dup.name
      using errcode = 'P0450',
            detail = jsonb_build_object('source', v_dup.source, 'id', v_dup.id, 'name', v_dup.name)::text;
  end if;
  select d.* into v_dup
    from private.find_prospect_duplicates(v_name, v_phone, v_tax, v_website, v_province, v_id) d
   where d.match_type = 'hard_phone' limit 1;
  if found then
    raise exception 'Trùng số điện thoại với % "%"',
      case v_dup.source when 'partner' then 'đối tác' else 'khách tiềm năng' end, v_dup.name
      using errcode = 'P0451',
            detail = jsonb_build_object('source', v_dup.source, 'id', v_dup.id, 'name', v_dup.name)::text;
  end if;

  -- Lớp 2: nghi trùng (tên + tỉnh, domain) → hỏi lại, hoặc ép tạo kèm lý do
  if v_check_soft then
    select coalesce(jsonb_agg(jsonb_build_object(
             'match_type', d.match_type, 'source', d.source, 'id', d.id,
             'name', d.name, 'status', d.status,
             'phone', case when d.source = 'prospect'
                            and not (v_is_mgr or coalesce(d.assigned_to = v_uid, false))
                           then private.mask_phone(d.phone) else d.phone end)), '[]'::jsonb)
      into v_cands
      from private.find_prospect_duplicates(v_name, v_phone, v_tax, v_website, v_province, v_id) d
     where d.match_type in ('soft_name', 'soft_domain');

    if jsonb_array_length(v_cands) > 0 then
      if not p_force then
        return jsonb_build_object('status', 'possible_duplicates', 'candidates', v_cands);
      end if;
      if v_reason is null then
        raise exception 'Cần ghi lý do khi vẫn tạo dù nghi trùng' using errcode = 'P0422';
      end if;
    end if;
  end if;

  -- Người phụ trách: sales luôn là chính mình khi tạo; quản lý/owner được chọn
  if v_id is null then
    -- Phân biệt "không truyền key" (mặc định: người tạo) với "truyền null" (cố ý
    -- không gán). `->>` trả NULL cho cả hai nên dùng toán tử `?` để biết key có mặt.
    -- Sales luôn là chính mình, bất kể payload.
    v_assignee := case when not v_is_mgr then v_uid
                       when p_payload ? 'assigned_to'
                         then nullif(p_payload ->> 'assigned_to', '')::uuid
                       else v_uid end;
  else
    v_assignee := case when v_is_mgr and nullif(p_payload ->> 'assigned_to', '') is not null
                       then (p_payload ->> 'assigned_to')::uuid
                       else v_old.assigned_to end;
  end if;
  if v_assignee is not null and not exists (
       select 1 from public.profiles pr where pr.id = v_assignee and pr.is_active) then
    raise exception 'Người phụ trách không hợp lệ' using errcode = 'P0422';
  end if;

  begin
    if v_id is null then
      insert into public.tour_prospects (
        company_name, name_norm, kind, tax_code, tax_code_norm, phone, phone_norm,
        email, website, website_domain, address, province,
        contact_name, contact_title, contact_phone, contact_phone_norm,
        source, estimated_groups_per_year, estimated_guests_per_year,
        assigned_to, priority, note, next_follow_up_at,
        dup_override_reason, dup_reviewed, created_by
      ) values (
        v_name, coalesce(private.normalize_company_name(v_name), lower(v_name)), v_kind,
        v_tax, private.normalize_tax_code(v_tax), v_phone, private.normalize_phone(v_phone),
        v_email, v_website, private.normalize_domain(v_website),
        nullif(btrim(coalesce(p_payload ->> 'address', '')), ''), v_province,
        nullif(btrim(coalesce(p_payload ->> 'contact_name', '')), ''),
        nullif(btrim(coalesce(p_payload ->> 'contact_title', '')), ''),
        v_cphone, private.normalize_phone(v_cphone),
        nullif(btrim(coalesce(p_payload ->> 'source', '')), ''),
        nullif(p_payload ->> 'estimated_groups_per_year', '')::int,
        nullif(p_payload ->> 'estimated_guests_per_year', '')::int,
        v_assignee, v_priority,
        nullif(btrim(coalesce(p_payload ->> 'note', '')), ''), v_follow,
        case when v_cands is not null and jsonb_array_length(v_cands) > 0 then v_reason end,
        not (v_cands is not null and jsonb_array_length(v_cands) > 0),
        v_uid
      ) returning id into v_id;
    else
      update public.tour_prospects set
        company_name = v_name,
        name_norm = coalesce(private.normalize_company_name(v_name), lower(v_name)),
        kind = v_kind,
        tax_code = v_tax, tax_code_norm = private.normalize_tax_code(v_tax),
        phone = v_phone, phone_norm = private.normalize_phone(v_phone),
        email = v_email, website = v_website, website_domain = private.normalize_domain(v_website),
        address = nullif(btrim(coalesce(p_payload ->> 'address', '')), ''),
        province = v_province,
        contact_name = nullif(btrim(coalesce(p_payload ->> 'contact_name', '')), ''),
        contact_title = nullif(btrim(coalesce(p_payload ->> 'contact_title', '')), ''),
        contact_phone = v_cphone, contact_phone_norm = private.normalize_phone(v_cphone),
        source = nullif(btrim(coalesce(p_payload ->> 'source', '')), ''),
        estimated_groups_per_year = nullif(p_payload ->> 'estimated_groups_per_year', '')::int,
        estimated_guests_per_year = nullif(p_payload ->> 'estimated_guests_per_year', '')::int,
        assigned_to = v_assignee,
        priority = v_priority,
        note = nullif(btrim(coalesce(p_payload ->> 'note', '')), ''),
        next_follow_up_at = v_follow,
        dup_override_reason = case when v_cands is not null and jsonb_array_length(v_cands) > 0
                                   then v_reason else dup_override_reason end,
        dup_reviewed = case when v_cands is not null and jsonb_array_length(v_cands) > 0
                            then false else dup_reviewed end
      where id = v_id;
    end if;
  exception when unique_violation then
    raise exception 'Trùng số điện thoại hoặc mã số thuế với khách tiềm năng khác'
      using errcode = 'P0451';
  end;

  -- Cảnh báo nhẹ: SĐT trùng khách lẻ (không chặn)
  select coalesce(jsonb_agg(jsonb_build_object('match_type', d.match_type, 'source', d.source,
                                               'id', d.id, 'name', d.name)), '[]'::jsonb)
    into v_notices
    from private.find_prospect_duplicates(v_name, v_phone, null, null, null, v_id) d
   where d.match_type = 'soft_guest_phone';

  return jsonb_build_object('status', 'saved', 'id', v_id, 'notices', v_notices);
end $$;

create or replace function public.assign_prospect(p_id uuid, p_assignee uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_old public.tour_prospects%rowtype;
begin
  perform private.assert_perm('prospect.assign');
  select * into v_old from public.tour_prospects where id = p_id for update;
  if not found then
    raise exception 'Không tìm thấy khách tiềm năng' using errcode = 'P0404';
  end if;
  if v_old.status = 'converted' then
    raise exception 'Khách tiềm năng đã chuyển đổi, không thể đổi người phụ trách' using errcode = 'P0422';
  end if;
  -- p_assignee null = "Không gán": prospect về trạng thái chưa gán (sales tự nhận sau),
  -- giữ nguyên trạng thái pipeline. Có người thì phải là nhân viên hợp lệ.
  if p_assignee is not null and (
       not exists (select 1 from public.profiles pr where pr.id = p_assignee and pr.is_active)
       or not exists (
         select 1 from public.user_effective_permissions u
          where u.user_id = p_assignee and u.permission_key = 'prospect.manage')) then
    raise exception 'Người phụ trách phải là nhân viên đang hoạt động và có quyền quản lý khách tiềm năng'
      using errcode = 'P0422';
  end if;

  -- Không đổi gì thì không ghi log
  if v_old.assigned_to is not distinct from p_assignee then
    return jsonb_build_object('id', p_id, 'assigned_to', p_assignee, 'unchanged', true);
  end if;

  update public.tour_prospects set assigned_to = p_assignee where id = p_id;
  insert into public.prospect_interactions (prospect_id, entry_type, note, created_by)
  values (p_id, 'status_change',
          'Chuyển người phụ trách: ' ||
            coalesce((select full_name from public.profiles where id = v_old.assigned_to), 'chưa gán') ||
            ' → ' ||
            coalesce((select full_name from public.profiles where id = p_assignee), 'chưa gán'),
          (select auth.uid()));
  return jsonb_build_object('id', p_id, 'assigned_to', p_assignee, 'unchanged', false);
end $$;

-- Đổi chữ ký (thêm tham số cuối) nên phải bỏ bản cũ để không còn 2 overload
drop function if exists public.get_prospects(text, text, text, text, uuid, boolean, boolean, int);

create or replace function public.get_prospects(
  p_search text default null,
  p_status text default null,
  p_kind text default null,
  p_province text default null,
  p_assigned_to uuid default null,
  p_overdue_only boolean default false,
  p_dup_pending boolean default false,
  p_limit int default 500,
  p_unassigned_only boolean default false
) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_q      text := nullif(btrim(coalesce(p_search, '')), '');
  v_qname  text := private.normalize_company_name(p_search);
  v_qphone text := private.normalize_phone(p_search);
  v_today  date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_res    jsonb;
begin
  perform private.assert_perm('prospect.view');

  with filtered as (
    select t.id
      from public.tour_prospects t
     where (v_q is null
            or (v_qname is not null and t.name_norm like '%' || v_qname || '%')
            or (v_qphone is not null and length(v_qphone) >= 4
                and (t.phone_norm like '%' || v_qphone || '%' or t.contact_phone_norm like '%' || v_qphone || '%'))
            or t.website_domain like '%' || lower(v_q) || '%'
            or lower(coalesce(t.contact_name, '')) like '%' || lower(v_q) || '%')
       and (p_status is null or t.status = p_status)
       and (p_kind is null or t.kind = p_kind)
       and (nullif(btrim(coalesce(p_province, '')), '') is null
            or lower(coalesce(t.province, '')) = lower(btrim(p_province)))
       and (p_assigned_to is null or t.assigned_to = p_assigned_to)
       and (not coalesce(p_unassigned_only, false) or t.assigned_to is null)
       and (not coalesce(p_overdue_only, false)
            or (t.status in ('new','contacted','nurturing','negotiating') and t.next_follow_up_at < v_today))
       and (not coalesce(p_dup_pending, false) or not t.dup_reviewed)
     order by t.created_at desc
     limit least(greatest(coalesce(p_limit, 500), 1), 1000)
  )
  select coalesce(jsonb_agg(private.prospect_to_json(tp) order by
           -- coalesce: prospect chưa có ngày hẹn cho NULL, mà ORDER BY ... DESC xếp NULL lên đầu
           coalesce(tp.status in ('new','contacted','nurturing','negotiating')
                    and tp.next_follow_up_at < v_today, false) desc,
           tp.next_follow_up_at asc nulls last, tp.created_at desc), '[]'::jsonb)
    into v_res
    from filtered f
    join public.tour_prospects tp on tp.id = f.id;
  return v_res;
end $$;

-- Bỏ gán hàng loạt (chỉ quản lý/owner có prospect.assign). Dùng để dọn dữ liệu đã import:
-- mỗi dòng ghi timeline + audit (trigger audit_row trên tour_prospects). Không đổi
-- trạng thái pipeline; bỏ qua dòng đã chưa gán / đã chuyển đổi / không tồn tại.
create or replace function public.unassign_prospects(p_ids uuid[])
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
  v_old public.tour_prospects%rowtype;
  v_done int := 0;
  v_skipped jsonb := '[]'::jsonb;
begin
  perform private.assert_perm('prospect.assign');
  if p_ids is null or coalesce(array_length(p_ids, 1), 0) = 0 then
    raise exception 'Chưa chọn khách tiềm năng nào' using errcode = 'P0422';
  end if;
  if array_length(p_ids, 1) > 500 then
    raise exception 'Mỗi lần bỏ gán tối đa 500 dòng' using errcode = 'P0422';
  end if;

  for v_id in select distinct x from unnest(p_ids) x loop
    select * into v_old from public.tour_prospects where id = v_id for update;
    if not found then
      v_skipped := v_skipped || jsonb_build_array(jsonb_build_object('id', v_id, 'reason', 'not_found'));
    elsif v_old.status = 'converted' then
      v_skipped := v_skipped || jsonb_build_array(jsonb_build_object('id', v_id, 'reason', 'converted'));
    elsif v_old.assigned_to is null then
      v_skipped := v_skipped || jsonb_build_array(jsonb_build_object('id', v_id, 'reason', 'already_unassigned'));
    else
      update public.tour_prospects set assigned_to = null where id = v_id;
      insert into public.prospect_interactions (prospect_id, entry_type, note, created_by)
      values (v_id, 'status_change',
              'Bỏ gán hàng loạt: ' ||
                coalesce((select full_name from public.profiles where id = v_old.assigned_to), 'không rõ') ||
                ' → chưa gán',
              v_uid);
      v_done := v_done + 1;
    end if;
  end loop;

  return jsonb_build_object('unassigned', v_done, 'skipped', v_skipped);
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.get_prospects(text, text, text, text, uuid, boolean, boolean, int, boolean)',
    'public.unassign_prospects(uuid[])'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
