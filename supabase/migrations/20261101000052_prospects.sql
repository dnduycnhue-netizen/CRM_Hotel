-- 20261101000052_prospects.sql
-- Khách hàng tiềm năng B2B (công ty tour chưa hợp tác): pipeline chăm sóc,
-- chống trùng 3 lớp, che SĐT theo người phụ trách, nhật ký liên hệ, chuyển đổi
-- thành đối tác (Prospect → Partner, 1 chiều, có lưu vết).
--
-- Nguyên tắc: bảng chỉ ĐỌC được qua RLS (đã siết theo người phụ trách); mọi thao
-- tác GHI đi qua RPC security definer để kiểm tra quyền + chống trùng + cách ly sales.

-- ============================================================================
-- 1. Hàm chuẩn hóa dùng chung (một nơi duy nhất cho form tay, import, chuyển đổi)
-- ============================================================================

-- SĐT: chỉ giữ chữ số, +84 / 0084 → 0. Không đủ chữ số → null.
create or replace function private.normalize_phone(p text)
returns text language sql immutable set search_path = '' as $$
  select case
    when d = '' then null
    when d like '0084%' and length(d) >= 13 then '0' || substr(d, 5)
    when d like '84%'   and length(d) >= 11 then '0' || substr(d, 3)
    else d
  end
  from (select regexp_replace(coalesce(p, ''), '\D', '', 'g') as d) s;
$$;

-- Tên công ty: thường, bỏ dấu tiếng Việt, bỏ từ pháp nhân, bỏ ký tự đặc biệt.
create or replace function private.normalize_company_name(p text)
returns text language sql immutable set search_path = '' as $$
  select nullif(btrim(regexp_replace(
    regexp_replace(
      regexp_replace(
        translate(
          lower(coalesce(p, '')),
          'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ',
          'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd'
        ),
        '[^a-z0-9]+', ' ', 'g'),
      '\y(trach nhiem huu han|co phan|cong ty|tnhh|mtv|cp|jsc|ltd)\y', ' ', 'g'),
    '\s+', ' ', 'g')), '');
$$;

-- Website: chỉ giữ domain (bỏ scheme, www., cổng, đường dẫn, query).
create or replace function private.normalize_domain(p text)
returns text language plpgsql immutable set search_path = '' as $$
declare s text := lower(btrim(coalesce(p, '')));
begin
  if s = '' then return null; end if;
  s := regexp_replace(s, '^[a-z][a-z0-9+.\-]*://', '');
  s := split_part(s, '/', 1);
  s := split_part(s, '?', 1);
  s := split_part(s, '#', 1);
  s := split_part(s, ':', 1);
  s := regexp_replace(s, '^www\.', '');
  return nullif(btrim(s), '');
end $$;

-- Domain của nền tảng dùng chung (trang Facebook, TikTok, Google Sites...): nhiều
-- doanh nghiệp khác nhau cùng dùng, nên KHÔNG được coi là "cùng website" khi so trùng.
create or replace function private.is_generic_domain(p text)
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(p ~ '(^|\.)(facebook|fb|messenger|tiktok|youtube|youtu|instagram|zalo|linktr|google|wikipedia|twitter|x|linkedin|blogspot|wordpress|wixsite|weebly)\.(com|me|be|ee|org|net|vn)$', false);
$$;

-- MST: bỏ khoảng trắng, dấu gạch ngang, dấu chấm.
create or replace function private.normalize_tax_code(p text)
returns text language sql immutable set search_path = '' as $$
  select nullif(regexp_replace(lower(coalesce(p, '')), '[\s\-\.]', '', 'g'), '');
$$;

-- Che SĐT: giữ 3 số đầu + 3 số cuối (090****232)
create or replace function private.mask_phone(p text)
returns text language sql immutable set search_path = '' as $$
  select case
    when p is null or btrim(p) = '' then null
    when length(private.normalize_phone(p)) >= 8
      then left(private.normalize_phone(p), 3) || '****' || right(private.normalize_phone(p), 3)
    else '***'
  end;
$$;

-- ============================================================================
-- 2. Bảng
-- ============================================================================

create table public.tour_prospects (
  id                         uuid primary key default gen_random_uuid(),
  company_name               text not null check (char_length(company_name) between 2 and 160),
  name_norm                  text not null,
  kind                       text not null check (kind in
    ('tour_operator','travel_agency','mice','pilgrimage','school','corporate','small_tour','other')),
  tax_code                   text,
  tax_code_norm              text,
  phone                      text,
  phone_norm                 text,
  email                      text check (email is null or email = lower(email)),
  website                    text,
  website_domain             text,
  address                    text,
  province                   text,
  contact_name               text,
  contact_title              text,
  contact_phone              text,
  contact_phone_norm         text,
  source                     text,
  estimated_groups_per_year  int check (estimated_groups_per_year is null or estimated_groups_per_year >= 0),
  estimated_guests_per_year  int check (estimated_guests_per_year is null or estimated_guests_per_year >= 0),
  assigned_to                uuid references public.profiles(id),
  status                     text not null default 'new' check (status in
    ('new','contacted','nurturing','negotiating','converted','lost','duplicate')),
  lost_reason                text,
  duplicate_of_id            uuid references public.tour_prospects(id),
  priority                   text not null default 'medium' check (priority in ('high','medium','low')),
  note                       text,
  last_contacted_at          timestamptz,
  next_follow_up_at          date,
  dup_override_reason        text,                         -- lý do "Vẫn tạo" khi nghi trùng
  dup_reviewed               boolean not null default true,-- false = đang chờ xử lý trùng
  converted_partner_id       uuid references public.partners(id),
  converted_at               timestamptz,
  converted_by               uuid references public.profiles(id),
  created_by                 uuid references public.profiles(id),
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now(),
  check (status <> 'lost' or lost_reason is not null),
  check (status <> 'converted' or converted_partner_id is not null)
);

-- Chặn trùng cứng nội bộ prospects (trùng với partners chặn trong RPC vì khác bảng)
create unique index tour_prospects_tax_uq   on public.tour_prospects (tax_code_norm)
  where tax_code_norm is not null and status <> 'duplicate';
create unique index tour_prospects_phone_uq on public.tour_prospects (phone_norm)
  where phone_norm is not null and status <> 'duplicate';
create index tour_prospects_name_norm_idx   on public.tour_prospects (name_norm);
create index tour_prospects_domain_idx      on public.tour_prospects (website_domain) where website_domain is not null;
create index tour_prospects_status_idx      on public.tour_prospects (status);
create index tour_prospects_assigned_idx    on public.tour_prospects (assigned_to);
create index tour_prospects_follow_up_idx   on public.tour_prospects (next_follow_up_at);

create table public.prospect_interactions (
  id                 uuid primary key default gen_random_uuid(),
  prospect_id        uuid not null references public.tour_prospects(id) on delete cascade,
  entry_type         text not null default 'contact' check (entry_type in ('contact','status_change','system')),
  channel            text check (channel in ('call','zalo','email','meeting','quotation','other')),
  outcome            text check (outcome in ('interested','rejected','no_answer','callback','quotation_sent','met','other')),
  note               text,
  next_follow_up_at  date,
  created_by         uuid references public.profiles(id),
  created_at         timestamptz not null default now()
);
create index prospect_interactions_prospect_idx on public.prospect_interactions (prospect_id, created_at desc);

create trigger tour_prospects_updated_at before update on public.tour_prospects
  for each row execute function private.set_updated_at();
create trigger tour_prospects_audit after insert or update or delete on public.tour_prospects
  for each row execute function private.audit_row();
create trigger prospect_interactions_audit after insert or update or delete on public.prospect_interactions
  for each row execute function private.audit_row();

-- Ghi nhận liên hệ → cập nhật "lần liên hệ cuối" + "hẹn tiếp" của prospect.
-- Mỗi lần liên hệ thay thế lịch hẹn cũ (null = chưa có hẹn mới).
create or replace function private.trg_prospect_interaction_touch()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.entry_type = 'contact' then
    update public.tour_prospects
       set last_contacted_at = now(),
           next_follow_up_at = new.next_follow_up_at,
           status = case when status = 'new' then 'contacted' else status end
     where id = new.prospect_id and status <> 'converted';
  end if;
  return null;
end $$;

create trigger prospect_interactions_touch after insert on public.prospect_interactions
  for each row execute function private.trg_prospect_interaction_touch();

-- ============================================================================
-- 3. Module + quyền (khai báo trùng khớp src/shared/auth/permission-keys.ts)
-- ============================================================================

insert into public.modules (key, name, group_name, depends_on, default_state, is_core, is_available, sort)
values ('prospects', 'Khách hàng tiềm năng B2B', 'Kinh doanh', '{}', 'on', false, true, 24)
on conflict (key) do update
  set name = excluded.name, group_name = excluded.group_name,
      default_state = excluded.default_state, is_available = true;

insert into public.permissions (key, module_key, kind, label, sort) values
  ('prospect.view',    'prospects', 'view',  'Xem khách tiềm năng B2B',                   340),
  ('prospect.manage',  'prospects', 'write', 'Tạo / sửa / ghi liên hệ khách tiềm năng',   341),
  ('prospect.assign',  'prospects', 'write', 'Chuyển người phụ trách khách tiềm năng',    342),
  ('prospect.convert', 'prospects', 'write', 'Chuyển khách tiềm năng thành đối tác',      343),
  ('prospect.import',  'prospects', 'write', 'Nhập khách tiềm năng từ Excel/CSV',         344),
  ('prospect.export',  'prospects', 'view',  'Xuất danh sách khách tiềm năng',            345)
on conflict (key) do nothing;

-- Sales: xem + quản lý + chuyển đổi + import (không assign, không export)
insert into public.role_permissions (role_id, permission_key)
select r.id, k from public.roles r,
  unnest(array['prospect.view','prospect.manage','prospect.convert','prospect.import']) k
where r.key = 'sales'
on conflict do nothing;

-- Quản lý + Chủ chuỗi: đủ 6 quyền
insert into public.role_permissions (role_id, permission_key)
select r.id, k from public.roles r,
  unnest(array['prospect.view','prospect.manage','prospect.assign',
               'prospect.convert','prospect.import','prospect.export']) k
where r.key in ('branch_manager', 'owner')
on conflict do nothing;

-- Quyền hiệu lực được tính sẵn → dựng lại cho mọi tài khoản
select private.rebuild_all_permissions();

-- ============================================================================
-- 4. RLS: chỉ ĐỌC trực tiếp; ghi qua RPC. Sales chỉ đọc thẳng bảng với prospect do
--    mình phụ trách (người khác đọc qua RPC get_prospects để SĐT được che).
-- ============================================================================

alter table public.tour_prospects enable row level security;
alter table public.prospect_interactions enable row level security;

create policy read_tour_prospects on public.tour_prospects
  for select to authenticated
  using (
    private.has_perm('prospect.view')
    and (private.has_perm('prospect.assign') or assigned_to = (select auth.uid()))
  );

create policy read_prospect_interactions on public.prospect_interactions
  for select to authenticated
  using (
    private.has_perm('prospect.view')
    and exists (select 1 from public.tour_prospects t where t.id = prospect_interactions.prospect_id)
  );

revoke all on public.tour_prospects, public.prospect_interactions from anon;
revoke insert, update, delete, truncate on public.tour_prospects, public.prospect_interactions from authenticated;
grant select on public.tour_prospects, public.prospect_interactions to authenticated;

-- ============================================================================
-- 5. Tìm bản ghi trùng (dùng chung cho save_prospect, form, import dry-run)
-- ============================================================================

create or replace function private.find_prospect_duplicates(
  p_name text, p_phone text, p_tax_code text, p_website text,
  p_province text, p_exclude_id uuid
)
returns table (match_type text, source text, id uuid, name text, phone text,
               assigned_to uuid, status text)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_name   text := private.normalize_company_name(p_name);
  v_phone  text := private.normalize_phone(p_phone);
  v_tax    text := private.normalize_tax_code(p_tax_code);
  v_domain text := case when private.is_generic_domain(private.normalize_domain(p_website))
                        then null else private.normalize_domain(p_website) end;
  v_prov   text := nullif(lower(btrim(coalesce(p_province, ''))), '');
begin
  -- Lớp 1: chặn cứng MST
  if v_tax is not null then
    return query
      select 'hard_tax'::text, 'prospect'::text, t.id, t.company_name, t.phone_norm, t.assigned_to, t.status
        from public.tour_prospects t
       where t.tax_code_norm = v_tax and t.status <> 'duplicate'
         and (p_exclude_id is null or t.id <> p_exclude_id);
    return query
      select 'hard_tax'::text, 'partner'::text, p.id, p.name, private.normalize_phone(p.phone), null::uuid, null::text
        from public.partners p
       where private.normalize_tax_code(p.tax_code) = v_tax;
  end if;

  -- Lớp 1: chặn cứng SĐT
  if v_phone is not null then
    return query
      select 'hard_phone'::text, 'prospect'::text, t.id, t.company_name, t.phone_norm, t.assigned_to, t.status
        from public.tour_prospects t
       where t.phone_norm = v_phone and t.status <> 'duplicate'
         and (p_exclude_id is null or t.id <> p_exclude_id);
    return query
      select 'hard_phone'::text, 'partner'::text, p.id, p.name, private.normalize_phone(p.phone), null::uuid, null::text
        from public.partners p
       where private.normalize_phone(p.phone) = v_phone;
  end if;

  -- Lớp 2: nghi trùng theo tên chuẩn hóa + cùng tỉnh (thiếu tỉnh ở 1 bên vẫn cảnh báo)
  if v_name is not null then
    return query
      select 'soft_name'::text, 'prospect'::text, t.id, t.company_name, t.phone_norm, t.assigned_to, t.status
        from public.tour_prospects t
       where t.name_norm = v_name and t.status <> 'duplicate'
         and (p_exclude_id is null or t.id <> p_exclude_id)
         and (v_prov is null or t.province is null or lower(btrim(t.province)) = v_prov);
    return query
      select 'soft_name'::text, 'partner'::text, p.id, p.name, private.normalize_phone(p.phone), null::uuid, null::text
        from public.partners p
       where private.normalize_company_name(p.name) = v_name;
  end if;

  -- Lớp 2: nghi trùng theo domain website
  if v_domain is not null then
    return query
      select 'soft_domain'::text, 'prospect'::text, t.id, t.company_name, t.phone_norm, t.assigned_to, t.status
        from public.tour_prospects t
       where t.website_domain = v_domain and t.status <> 'duplicate'
         and (p_exclude_id is null or t.id <> p_exclude_id);
  end if;

  -- SĐT trùng khách lẻ: chỉ cảnh báo nhẹ, không chặn
  if v_phone is not null then
    return query
      select 'soft_guest_phone'::text, 'guest'::text, g.id,
             case when private.has_perm('guest.view_summary') then g.full_name else 'Khách lẻ' end,
             null::text, null::uuid, null::text
        from public.guests g
       where g.merged_into is null and private.normalize_phone(g.phone) = v_phone
       limit 3;
  end if;
end $$;

-- Dạng JSON, đã che SĐT theo luật: chỉ quản lý (prospect.assign) hoặc người phụ trách thấy đủ
create or replace function private.prospect_duplicates_json(
  p_name text, p_phone text, p_tax_code text, p_website text,
  p_province text, p_exclude_id uuid
) returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'match_type', d.match_type,
    'source', d.source,
    'id', d.id,
    'name', d.name,
    'status', d.status,
    'phone', case
      when d.source = 'prospect' and not (private.has_perm('prospect.assign') or coalesce(d.assigned_to = (select auth.uid()), false))
        then private.mask_phone(d.phone)
      else d.phone end,
    'assigned_to', d.assigned_to
  ) order by d.match_type, d.source, d.name), '[]'::jsonb)
  from private.find_prospect_duplicates(p_name, p_phone, p_tax_code, p_website, p_province, p_exclude_id) d;
$$;

create or replace function public.check_prospect_duplicates(
  p_name text default null, p_phone text default null, p_tax_code text default null,
  p_website text default null, p_province text default null, p_exclude_id uuid default null
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.assert_perm('prospect.view');
  return private.prospect_duplicates_json(p_name, p_phone, p_tax_code, p_website, p_province, p_exclude_id);
end $$;

-- ============================================================================
-- 6. Kiểm tra quyền sửa một prospect (cách ly sales, khóa khi đã chuyển đổi)
-- ============================================================================

create or replace function private.assert_prospect_editable(p public.tour_prospects)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if p.status = 'converted' then
    raise exception 'Khách tiềm năng đã chuyển đổi thành đối tác, không thể chỉnh sửa'
      using errcode = 'P0422';
  end if;
  -- Sales chỉ sửa prospect do chính mình phụ trách (chưa gán thì chờ quản lý gán)
  if not private.has_perm('prospect.assign')
     and p.assigned_to is distinct from (select auth.uid()) then
    raise exception 'FORBIDDEN_PROSPECT_EDIT: Khách tiềm năng này do Sales khác phụ trách'
      using errcode = 'P0403';
  end if;
end $$;

-- ============================================================================
-- 7. save_prospect: tạo / sửa + chống trùng
--    Trả {status:'saved', id, notices} hoặc {status:'possible_duplicates', candidates}
--    Lỗi chặn cứng: P0450 (MST) / P0451 (SĐT), kèm DETAIL json {source,id,name}
-- ============================================================================

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
    v_assignee := case when v_is_mgr
                       then coalesce(nullif(p_payload ->> 'assigned_to', '')::uuid, v_uid)
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

-- ============================================================================
-- 8. Đổi trạng thái / chuyển phụ trách / xử lý trùng / bổ sung thông tin
-- ============================================================================

create or replace function public.set_prospect_status(
  p_id uuid, p_status text, p_note text default null,
  p_next_follow_up date default null, p_duplicate_of uuid default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_old public.tour_prospects%rowtype;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_next date;
begin
  perform private.assert_perm('prospect.manage');
  if p_status not in ('new','contacted','nurturing','negotiating','lost','duplicate') then
    raise exception 'Trạng thái không hợp lệ (chuyển đổi dùng nút "Chuyển thành đối tác")'
      using errcode = 'P0422';
  end if;

  select * into v_old from public.tour_prospects where id = p_id for update;
  if not found then
    raise exception 'Không tìm thấy khách tiềm năng' using errcode = 'P0404';
  end if;
  perform private.assert_prospect_editable(v_old);

  v_next := coalesce(p_next_follow_up, v_old.next_follow_up_at);
  if p_status in ('nurturing','negotiating') and (v_next is null or v_next < current_date) then
    raise exception 'Trạng thái "%" bắt buộc có ngày hẹn liên hệ tiếp (từ hôm nay trở đi)',
      case p_status when 'nurturing' then 'Đang chăm sóc' else 'Đang đàm phán' end
      using errcode = 'P0422';
  end if;
  if p_status = 'lost' and v_note is null then
    raise exception 'Cần ghi lý do khi chuyển sang "Không tiềm năng"' using errcode = 'P0422';
  end if;
  if p_status = 'duplicate' then
    if p_duplicate_of is null or p_duplicate_of = p_id
       or not exists (select 1 from public.tour_prospects t where t.id = p_duplicate_of) then
      raise exception 'Cần chọn bản ghi gốc khi đánh dấu trùng lặp' using errcode = 'P0422';
    end if;
  end if;

  update public.tour_prospects set
    status = p_status,
    lost_reason = case when p_status = 'lost' then v_note else null end,
    duplicate_of_id = case when p_status = 'duplicate' then p_duplicate_of else null end,
    next_follow_up_at = case when p_status in ('lost','duplicate') then null else v_next end,
    dup_reviewed = case when p_status = 'duplicate' then true else dup_reviewed end
  where id = p_id;

  insert into public.prospect_interactions (prospect_id, entry_type, note, created_by)
  values (p_id, 'status_change',
          format('Đổi trạng thái: %s → %s%s', v_old.status, p_status,
                 case when v_note is not null then '. ' || v_note else '' end),
          (select auth.uid()));

  return jsonb_build_object('id', p_id, 'status', p_status);
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
  if p_assignee is null or not exists (
       select 1 from public.profiles pr where pr.id = p_assignee and pr.is_active)
     or not exists (
       select 1 from public.user_effective_permissions u
        where u.user_id = p_assignee and u.permission_key = 'prospect.manage') then
    raise exception 'Người phụ trách phải là nhân viên đang hoạt động và có quyền quản lý khách tiềm năng'
      using errcode = 'P0422';
  end if;

  update public.tour_prospects set assigned_to = p_assignee where id = p_id;
  insert into public.prospect_interactions (prospect_id, entry_type, note, created_by)
  values (p_id, 'status_change',
          'Chuyển người phụ trách: ' ||
            coalesce((select full_name from public.profiles where id = v_old.assigned_to), 'chưa gán') ||
            ' → ' || (select full_name from public.profiles where id = p_assignee),
          (select auth.uid()));
  return jsonb_build_object('id', p_id, 'assigned_to', p_assignee);
end $$;

-- Tự nhận chăm sóc: sales (chỉ cần prospect.manage) nhận một prospect CHƯA có người
-- phụ trách thành của mình. Không cần prospect.assign (quyền đó dành cho quản lý đổi
-- người phụ trách khi đã có người). Có người phụ trách rồi thì bị chặn, kể cả cùng lúc.
create or replace function public.claim_prospect(p_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_old public.tour_prospects%rowtype;
  v_owner text;
begin
  perform private.assert_perm('prospect.manage');

  select * into v_old from public.tour_prospects where id = p_id for update;
  if not found then
    raise exception 'Không tìm thấy khách tiềm năng' using errcode = 'P0404';
  end if;
  if v_old.status = 'converted' then
    raise exception 'Khách tiềm năng đã chuyển đổi thành đối tác, không thể nhận chăm sóc'
      using errcode = 'P0422';
  end if;
  if v_old.status in ('lost', 'duplicate') then
    raise exception 'Khách tiềm năng đang ở trạng thái "%", không thể nhận chăm sóc',
      case v_old.status when 'lost' then 'Không tiềm năng' else 'Trùng lặp' end
      using errcode = 'P0422';
  end if;
  if v_old.assigned_to is not null then
    select full_name into v_owner from public.profiles where id = v_old.assigned_to;
    raise exception 'Khách tiềm năng này đã có người phụ trách%',
      case when v_owner is not null then ' (' || v_owner || ')' else '' end
      using errcode = 'P0409';
  end if;

  update public.tour_prospects set assigned_to = v_uid where id = p_id;

  insert into public.prospect_interactions (prospect_id, entry_type, note, created_by)
  values (p_id, 'status_change',
          'Nhận chăm sóc: ' || coalesce((select full_name from public.profiles where id = v_uid), 'nhân viên'),
          v_uid);
  perform private.log_event('prospect.claim', 'tour_prospects', p_id, null,
    jsonb_build_object('claimed_by', v_uid));

  return jsonb_build_object('id', p_id, 'assigned_to', v_uid);
end $$;

-- Đánh dấu đã xem xét xong cảnh báo trùng (rời khỏi hàng đợi "Chờ xử lý trùng")
create or replace function public.resolve_prospect_duplicate(p_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_old public.tour_prospects%rowtype;
begin
  perform private.assert_perm('prospect.manage');
  select * into v_old from public.tour_prospects where id = p_id for update;
  if not found then
    raise exception 'Không tìm thấy khách tiềm năng' using errcode = 'P0404';
  end if;
  perform private.assert_prospect_editable(v_old);
  update public.tour_prospects set dup_reviewed = true where id = p_id;
  return jsonb_build_object('id', p_id);
end $$;

-- "Gộp": giữ bản cũ, bổ sung thông tin mới vào ghi chú (không đè dữ liệu cũ)
create or replace function public.merge_prospect_info(p_target_id uuid, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_old public.tour_prospects%rowtype;
  v_line text;
begin
  perform private.assert_perm('prospect.manage');
  select * into v_old from public.tour_prospects where id = p_target_id for update;
  if not found then
    raise exception 'Không tìm thấy khách tiềm năng' using errcode = 'P0404';
  end if;
  perform private.assert_prospect_editable(v_old);

  v_line := format('[Bổ sung %s] %s', to_char((now() at time zone 'Asia/Ho_Chi_Minh'), 'DD/MM/YYYY'),
    concat_ws(' · ',
      nullif(btrim(coalesce(p_payload ->> 'company_name', '')), ''),
      nullif('SĐT ' || btrim(coalesce(p_payload ->> 'phone', '')), 'SĐT '),
      nullif('Email ' || btrim(coalesce(p_payload ->> 'email', '')), 'Email '),
      nullif('MST ' || btrim(coalesce(p_payload ->> 'tax_code', '')), 'MST '),
      nullif('Web ' || btrim(coalesce(p_payload ->> 'website', '')), 'Web '),
      nullif('Liên hệ ' || btrim(coalesce(p_payload ->> 'contact_name', '')), 'Liên hệ '),
      nullif('Nguồn ' || btrim(coalesce(p_payload ->> 'source', '')), 'Nguồn ')));

  update public.tour_prospects
     set note = case when note is null or btrim(note) = '' then v_line else note || E'\n' || v_line end
   where id = p_target_id;
  insert into public.prospect_interactions (prospect_id, entry_type, note, created_by)
  values (p_target_id, 'system', 'Gộp thông tin từ bản ghi trùng: ' || v_line, (select auth.uid()));
  return jsonb_build_object('id', p_target_id);
end $$;

-- ============================================================================
-- 9. Nhật ký chăm sóc
-- ============================================================================

create or replace function public.log_prospect_interaction(
  p_prospect_id uuid, p_channel text, p_outcome text,
  p_note text default null, p_next_follow_up_at date default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_old public.tour_prospects%rowtype;
  v_id uuid;
begin
  perform private.assert_perm('prospect.manage');
  if p_channel not in ('call','zalo','email','meeting','quotation','other') then
    raise exception 'Loại liên hệ không hợp lệ' using errcode = 'P0422';
  end if;
  if p_outcome not in ('interested','rejected','no_answer','callback','quotation_sent','met','other') then
    raise exception 'Kết quả liên hệ không hợp lệ' using errcode = 'P0422';
  end if;
  if p_next_follow_up_at is not null and p_next_follow_up_at < current_date then
    raise exception 'Ngày hẹn liên hệ tiếp không được ở quá khứ' using errcode = 'P0422';
  end if;

  select * into v_old from public.tour_prospects where id = p_prospect_id for update;
  if not found then
    raise exception 'Không tìm thấy khách tiềm năng' using errcode = 'P0404';
  end if;
  perform private.assert_prospect_editable(v_old);

  insert into public.prospect_interactions
    (prospect_id, entry_type, channel, outcome, note, next_follow_up_at, created_by)
  values (p_prospect_id, 'contact', p_channel, p_outcome,
          nullif(btrim(coalesce(p_note, '')), ''), p_next_follow_up_at, (select auth.uid()))
  returning id into v_id;

  return jsonb_build_object('id', v_id);
end $$;

-- ============================================================================
-- 10. Chuyển đổi Prospect → Partner (1 transaction, idempotent)
-- ============================================================================

create or replace function public.convert_prospect_to_partner(p_prospect_id uuid)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_old       public.tour_prospects%rowtype;
  v_dup       record;
  v_kind      text;
  v_res       jsonb;
  v_partner   uuid;
  v_actor     text;
  v_note      text;
begin
  perform private.assert_perm('prospect.convert');

  select * into v_old from public.tour_prospects where id = p_prospect_id for update;
  if not found then
    raise exception 'Không tìm thấy khách tiềm năng' using errcode = 'P0404';
  end if;

  -- Idempotent: đã chuyển đổi thì trả lại partner hiện có, không tạo partner thứ 2
  if v_old.status = 'converted' then
    return jsonb_build_object('partner_id', v_old.converted_partner_id, 'already_converted', true);
  end if;

  perform private.assert_prospect_editable(v_old);
  if v_old.status in ('lost', 'duplicate') then
    raise exception 'Khách tiềm năng đang ở trạng thái "%", hãy chuyển về trạng thái chăm sóc trước khi chuyển đổi',
      case v_old.status when 'lost' then 'Không tiềm năng' else 'Trùng lặp' end
      using errcode = 'P0422';
  end if;

  -- Kiểm tra trùng lần cuối với partners (MST / SĐT / tên)
  select p.id, p.name into v_dup
    from public.partners p
   where (v_old.tax_code_norm is not null and private.normalize_tax_code(p.tax_code) = v_old.tax_code_norm)
      or (v_old.phone_norm is not null and private.normalize_phone(p.phone) = v_old.phone_norm)
      or private.normalize_company_name(p.name) = v_old.name_norm
      or lower(p.name) = lower(v_old.company_name)
   limit 1;
  if found then
    raise exception 'Đối tác "%" đã tồn tại trong hệ thống, không tạo trùng', v_dup.name
      using errcode = 'P0452',
            detail = jsonb_build_object('source', 'partner', 'id', v_dup.id, 'name', v_dup.name)::text;
  end if;

  v_kind := case v_old.kind
              when 'tour_operator' then 'tour_operator'
              when 'travel_agency' then 'travel_agency'
              when 'corporate'     then 'corporate'
              else 'other' end;
  select full_name into v_actor from public.profiles where id = (select auth.uid());
  v_note := concat_ws(E'\n', nullif(btrim(coalesce(v_old.note, '')), ''),
    format('Nguồn: chuyển đổi từ khách tiềm năng ngày %s bởi %s',
           to_char((now() at time zone 'Asia/Ho_Chi_Minh'), 'DD/MM/YYYY'), coalesce(v_actor, 'hệ thống')));

  -- Tái dùng RPC save_partner (không copy logic insert partner)
  v_res := public.save_partner(
    null, v_old.company_name, v_kind, v_old.contact_name,
    coalesce(v_old.phone, v_old.contact_phone), v_old.email, v_old.tax_code,
    concat_ws(', ', v_old.address, v_old.province),
    null, null, null, 0, null, v_note, true);
  v_partner := (v_res ->> 'id')::uuid;

  update public.tour_prospects set
    status = 'converted',
    converted_partner_id = v_partner,
    converted_at = now(),
    converted_by = (select auth.uid()),
    next_follow_up_at = null,
    dup_reviewed = true
  where id = p_prospect_id;

  insert into public.prospect_interactions (prospect_id, entry_type, note, created_by)
  values (p_prospect_id, 'status_change',
          'Chuyển đổi thành đối tác "' || v_old.company_name || '"', (select auth.uid()));

  perform private.log_event('prospect.convert', 'tour_prospects', p_prospect_id, null,
    jsonb_build_object('partner_id', v_partner));

  return jsonb_build_object('partner_id', v_partner, 'already_converted', false);
end $$;

-- ============================================================================
-- 11. Đọc dữ liệu (che SĐT theo luật: chỉ quản lý hoặc người phụ trách thấy đủ)
-- ============================================================================

create or replace function private.prospect_to_json(t public.tour_prospects)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid  uuid := (select auth.uid());
  v_mgr  boolean := private.has_perm('prospect.assign');
  v_full boolean;
begin
  v_full := v_mgr or coalesce(t.assigned_to = v_uid, false);
  return jsonb_build_object(
    'id', t.id, 'company_name', t.company_name, 'kind', t.kind,
    'tax_code', t.tax_code, 'email', t.email, 'website', t.website,
    'address', t.address, 'province', t.province,
    'phone_display', case when v_full then t.phone else private.mask_phone(t.phone) end,
    'contact_phone_display', case when v_full then t.contact_phone else private.mask_phone(t.contact_phone) end,
    'is_masked', not v_full,
    'contact_name', t.contact_name, 'contact_title', t.contact_title,
    'source', t.source,
    'estimated_groups_per_year', t.estimated_groups_per_year,
    'estimated_guests_per_year', t.estimated_guests_per_year,
    'assigned_to', t.assigned_to,
    'assigned_to_name', (select pr.full_name from public.profiles pr where pr.id = t.assigned_to),
    'status', t.status, 'lost_reason', t.lost_reason, 'duplicate_of_id', t.duplicate_of_id,
    'priority', t.priority, 'note', t.note,
    'last_contacted_at', t.last_contacted_at, 'next_follow_up_at', t.next_follow_up_at,
    'dup_override_reason', t.dup_override_reason, 'dup_reviewed', t.dup_reviewed,
    'converted_partner_id', t.converted_partner_id,
    'converted_partner_name', (select p.name from public.partners p where p.id = t.converted_partner_id),
    'converted_at', t.converted_at,
    'created_at', t.created_at, 'updated_at', t.updated_at,
    'is_overdue', (t.status in ('new','contacted','nurturing','negotiating')
                   and t.next_follow_up_at is not null
                   and t.next_follow_up_at < (now() at time zone 'Asia/Ho_Chi_Minh')::date),
    'can_edit', (t.status <> 'converted' and private.has_perm('prospect.manage')
                 and (v_mgr or coalesce(t.assigned_to = v_uid, false))),
    'can_claim', (t.assigned_to is null
                  and t.status in ('new','contacted','nurturing','negotiating')
                  and private.has_perm('prospect.manage')),
    'interaction_count', (select count(*) from public.prospect_interactions i
                           where i.prospect_id = t.id and i.entry_type = 'contact')
  );
end $$;

create or replace function public.get_prospects(
  p_search text default null,
  p_status text default null,
  p_kind text default null,
  p_province text default null,
  p_assigned_to uuid default null,
  p_overdue_only boolean default false,
  p_dup_pending boolean default false,
  p_limit int default 500
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

create or replace function public.get_prospect_detail(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_t public.tour_prospects%rowtype;
begin
  perform private.assert_perm('prospect.view');
  select * into v_t from public.tour_prospects where id = p_id;
  if not found then
    raise exception 'Không tìm thấy khách tiềm năng' using errcode = 'P0404';
  end if;
  return jsonb_build_object(
    'prospect', private.prospect_to_json(v_t),
    'duplicate_of', (select jsonb_build_object('id', d.id, 'name', d.company_name)
                       from public.tour_prospects d where d.id = v_t.duplicate_of_id),
    'interactions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id, 'entry_type', i.entry_type, 'channel', i.channel, 'outcome', i.outcome,
        'note', i.note, 'next_follow_up_at', i.next_follow_up_at, 'created_at', i.created_at,
        'created_by_name', (select pr.full_name from public.profiles pr where pr.id = i.created_by)
      ) order by i.created_at desc)
      from public.prospect_interactions i where i.prospect_id = p_id), '[]'::jsonb)
  );
end $$;

create or replace function public.get_prospects_overview()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_conv int; v_lost int;
begin
  perform private.assert_perm('prospect.view');
  select count(*) filter (where status = 'converted'), count(*) filter (where status = 'lost')
    into v_conv, v_lost from public.tour_prospects;

  return jsonb_build_object(
    'total', (select count(*) from public.tour_prospects),
    'by_status', coalesce((select jsonb_object_agg(s.status, s.n)
                             from (select status, count(*) n from public.tour_prospects group by status) s), '{}'::jsonb),
    'overdue', (select count(*) from public.tour_prospects
                 where status in ('new','contacted','nurturing','negotiating') and next_follow_up_at < v_today),
    'dup_pending', (select count(*) from public.tour_prospects where not dup_reviewed),
    'conversion_rate', case when v_conv + v_lost = 0 then null
                            else round(v_conv::numeric * 100 / (v_conv + v_lost), 1) end,
    'top_sales', coalesce((
      select jsonb_agg(jsonb_build_object('user_id', x.converted_by, 'name', x.full_name, 'converted', x.n)
                       order by x.n desc)
        from (select t.converted_by, pr.full_name, count(*) n
                from public.tour_prospects t
                join public.profiles pr on pr.id = t.converted_by
               where t.status = 'converted'
               group by t.converted_by, pr.full_name
               order by count(*) desc limit 5) x), '[]'::jsonb),
    'assignees', coalesce((
      select jsonb_agg(jsonb_build_object('id', pr.id, 'name', pr.full_name) order by pr.full_name)
        from public.profiles pr
       where pr.is_active and exists (
         select 1 from public.user_effective_permissions u
          where u.user_id = pr.id and u.permission_key = 'prospect.manage')), '[]'::jsonb)
  );
end $$;

-- ============================================================================
-- 11b. Import Excel/CSV bước 1 (dry-run): phân loại từng dòng, KHÔNG ghi gì.
--      new = tạo được; soft = nghi trùng (cần lý do khi vẫn tạo); hard = trùng cứng
--      (kể cả trùng giữa các dòng trong cùng file); invalid = thiếu dữ liệu bắt buộc.
-- ============================================================================

create or replace function public.preview_prospect_import(p_rows jsonb)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid   uuid := (select auth.uid());
  v_mgr   boolean;
  r       jsonb;
  i       int := 0;
  v_out   jsonb := '[]'::jsonb;
  v_seen_phone text[] := '{}';
  v_seen_tax   text[] := '{}';
  v_seen_name  text[] := '{}';
  v_seen_prov  text[] := '{}';
  v_seen_domain text[] := '{}';
  k int;
  v_file_name_dup boolean;
  v_name text; v_phone text; v_email text; v_pn text; v_tn text; v_nn text; v_prov text;
  v_class text; v_msg text; v_hard jsonb; v_soft jsonb; v_row_id text; v_dn text;
begin
  perform private.assert_perm('prospect.import');
  v_mgr := private.has_perm('prospect.assign');

  if jsonb_typeof(p_rows) is distinct from 'array' then
    raise exception 'Dữ liệu import không hợp lệ' using errcode = 'P0422';
  end if;
  if jsonb_array_length(p_rows) > 500 then
    raise exception 'Mỗi lần nhập tối đa 500 dòng' using errcode = 'P0422';
  end if;

  for r in select value from jsonb_array_elements(p_rows) loop
    i := i + 1;
    v_row_id := coalesce(nullif(r ->> 'row_id', ''), i::text);
    v_name  := btrim(coalesce(r ->> 'company_name', ''));
    v_phone := nullif(btrim(coalesce(r ->> 'phone', '')), '');
    v_email := nullif(btrim(coalesce(r ->> 'email', '')), '');
    v_prov  := nullif(btrim(coalesce(r ->> 'province', '')), '');
    v_pn := private.normalize_phone(v_phone);
    v_tn := private.normalize_tax_code(r ->> 'tax_code');
    v_nn := private.normalize_company_name(v_name);
    v_dn := private.normalize_domain(r ->> 'website');
    if private.is_generic_domain(v_dn) then v_dn := null; end if;
    v_class := 'new'; v_msg := null; v_hard := null; v_soft := '[]'::jsonb;

    if char_length(v_name) < 2 or char_length(v_name) > 160 then
      v_class := 'invalid'; v_msg := 'Tên công ty phải từ 2 đến 160 ký tự';
    elsif v_phone is null and v_email is null then
      v_class := 'invalid'; v_msg := 'Thiếu số điện thoại và email';
    elsif v_phone is not null and length(coalesce(v_pn, '')) < 8 then
      v_class := 'invalid'; v_msg := 'Số điện thoại không hợp lệ';
    elsif v_email is not null and lower(v_email) !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
      v_class := 'invalid'; v_msg := 'Email không đúng định dạng';
    else
      select jsonb_build_object('match_type', d.match_type, 'source', d.source, 'id', d.id, 'name', d.name)
        into v_hard
        from private.find_prospect_duplicates(v_name, v_phone, r ->> 'tax_code', r ->> 'website', v_prov, null) d
       where d.match_type in ('hard_tax', 'hard_phone')
       order by d.match_type limit 1;

      if v_hard is null and v_pn is not null and v_pn = any(v_seen_phone) then
        v_hard := jsonb_build_object('match_type', 'hard_phone', 'source', 'file', 'name', 'dòng khác trong file');
      elsif v_hard is null and v_tn is not null and v_tn = any(v_seen_tax) then
        v_hard := jsonb_build_object('match_type', 'hard_tax', 'source', 'file', 'name', 'dòng khác trong file');
      end if;

      if v_hard is not null then
        v_class := 'hard';
        v_msg := case v_hard ->> 'match_type' when 'hard_tax' then 'Trùng mã số thuế' else 'Trùng số điện thoại' end;
      else
        select coalesce(jsonb_agg(jsonb_build_object(
                 'match_type', d.match_type, 'source', d.source, 'id', d.id, 'name', d.name,
                 'status', d.status,
                 'phone', case when d.source = 'prospect' and not (v_mgr or coalesce(d.assigned_to = v_uid, false))
                               then private.mask_phone(d.phone) else d.phone end)), '[]'::jsonb)
          into v_soft
          from private.find_prospect_duplicates(v_name, v_phone, null, r ->> 'website', v_prov, null) d
         where d.match_type in ('soft_name', 'soft_domain');
        -- Trùng tên trong file: chỉ tính khi cùng tỉnh (thiếu tỉnh ở 1 bên vẫn cảnh báo),
        -- khớp với cách save_prospect so trùng lúc ghi thật
        v_file_name_dup := false;
        if v_nn is not null then
          for k in 1 .. coalesce(array_length(v_seen_name, 1), 0) loop
            if v_seen_name[k] = v_nn
               and (v_prov is null or v_seen_prov[k] = '' or v_seen_prov[k] = lower(v_prov)) then
              v_file_name_dup := true;
              exit;
            end if;
          end loop;
        end if;
        if v_file_name_dup then
          v_soft := v_soft || jsonb_build_array(jsonb_build_object(
            'match_type', 'soft_name', 'source', 'file', 'name', 'dòng khác trong file'));
        end if;
        if v_dn is not null and v_dn = any(v_seen_domain) then
          v_soft := v_soft || jsonb_build_array(jsonb_build_object(
            'match_type', 'soft_domain', 'source', 'file', 'name', 'dòng khác trong file'));
        end if;
        if jsonb_array_length(v_soft) > 0 then
          v_class := 'soft'; v_msg := 'Nghi trùng, cần ghi lý do nếu vẫn tạo';
        end if;
      end if;

      if v_class in ('new', 'soft') then
        if v_pn is not null then v_seen_phone := v_seen_phone || v_pn; end if;
        if v_tn is not null then v_seen_tax := v_seen_tax || v_tn; end if;
        if v_nn is not null then
          v_seen_name := v_seen_name || v_nn;
          v_seen_prov := v_seen_prov || coalesce(lower(v_prov), '');
        end if;
        if v_dn is not null then v_seen_domain := v_seen_domain || v_dn; end if;
      end if;
    end if;

    v_out := v_out || jsonb_build_array(jsonb_build_object(
      'row_id', v_row_id, 'classification', v_class, 'message', v_msg,
      'hard', v_hard, 'candidates', v_soft));
  end loop;

  return v_out;
end $$;

-- ============================================================================
-- 12. Quyền thực thi: chỉ người dùng đăng nhập
-- ============================================================================

do $$
declare f text;
begin
  foreach f in array array[
    'public.check_prospect_duplicates(text, text, text, text, text, uuid)',
    'public.save_prospect(jsonb, boolean, text)',
    'public.set_prospect_status(uuid, text, text, date, uuid)',
    'public.assign_prospect(uuid, uuid)',
    'public.claim_prospect(uuid)',
    'public.resolve_prospect_duplicate(uuid)',
    'public.merge_prospect_info(uuid, jsonb)',
    'public.log_prospect_interaction(uuid, text, text, text, date)',
    'public.convert_prospect_to_partner(uuid)',
    'public.get_prospects(text, text, text, text, uuid, boolean, boolean, int)',
    'public.get_prospect_detail(uuid)',
    'public.get_prospects_overview()',
    'public.preview_prospect_import(jsonb)'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
