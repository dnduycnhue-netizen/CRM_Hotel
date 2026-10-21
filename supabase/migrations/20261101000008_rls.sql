-- 20261101000008_rls.sql
do $$
declare t text;
begin
  foreach t in array array[
    'branches','rooms','profiles','app_settings','admin_provinces','admin_wards',
    'source_channels','partners','room_blocks','loyalty_tiers','guest_tier_events',
    'guests','guest_documents','guest_stats','stays','stay_guests',
    'guest_notes','guest_flags','guest_consents','merge_requests','audit_logs',
    'modules','branch_modules','permissions','roles','role_permissions',
    'user_roles','user_permission_overrides','user_effective_permissions'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

-- ===== Danh mục đọc chung (không nhạy cảm) =====
create policy read_all on public.branches        for select to authenticated using (true);
create policy read_all on public.admin_provinces for select to authenticated using (true);
create policy read_all on public.admin_wards     for select to authenticated using (true);
create policy read_all on public.app_settings    for select to authenticated using (true);
create policy read_all on public.modules         for select to authenticated using (true);
create policy read_all on public.permissions     for select to authenticated using (true);
create policy read_all on public.roles           for select to authenticated using (true);
create policy read_all on public.branch_modules  for select to authenticated using (true);
create policy read_all on public.source_channels for select to authenticated using (true);
create policy read_all on public.partners        for select to authenticated using (true);
create policy read_all on public.loyalty_tiers   for select to authenticated using (true);

-- ===== Hạng thành viên: cấu hình ghi trực tiếp có RLS; lịch sử hạng chỉ đọc =====
create policy admin_insert on public.loyalty_tiers for insert to authenticated
  with check (private.has_perm('loyalty.configure'));
create policy admin_update on public.loyalty_tiers for update to authenticated
  using (private.has_perm('loyalty.configure')) with check (private.has_perm('loyalty.configure'));
create policy read_tier_events on public.guest_tier_events for select to authenticated
  using (private.has_perm('loyalty.view'));

-- ===== Nguồn khách, đối tác: danh mục, ghi trực tiếp có RLS =====
create policy admin_insert on public.source_channels for insert to authenticated
  with check (private.has_perm('settings.sources'));
create policy admin_update on public.source_channels for update to authenticated
  using (private.has_perm('settings.sources')) with check (private.has_perm('settings.sources'));
create policy admin_insert on public.partners for insert to authenticated
  with check (private.has_perm('settings.sources'));
create policy admin_update on public.partners for update to authenticated
  using (private.has_perm('settings.sources')) with check (private.has_perm('settings.sources'));

-- ===== Khóa phòng: đọc theo cơ sở; ghi qua RPC (12) =====
create policy read_branch on public.room_blocks for select to authenticated
  using (branch_id in (select private.branches_with('stay.view'))
         or branch_id in (select private.branches_with('wo.view')));

-- ===== Quản trị cơ sở, phòng: ghi trực tiếp qua bảng, có RLS =====
create policy admin_write on public.branches for insert to authenticated
  with check (private.has_perm('settings.branches'));
create policy admin_update on public.branches for update to authenticated
  using (private.has_perm('settings.branches')) with check (private.has_perm('settings.branches'));

create policy read_branch on public.rooms for select to authenticated
  using (branch_id in (select private.branches_with('stay.view')) or private.has_perm('settings.rooms'));
create policy admin_write on public.rooms for insert to authenticated
  with check (private.has_perm('settings.rooms', branch_id));
create policy admin_update on public.rooms for update to authenticated
  using (private.has_perm('settings.rooms', branch_id)) with check (private.has_perm('settings.rooms', branch_id));

-- ===== Nhân viên =====
create policy read_staff on public.profiles for select to authenticated using (true);  -- danh bạ nội bộ: tên người viết ghi chú...
create policy update_self on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()) and is_active = true);
-- is_active, default_branch_id của người khác: chỉ qua RPC admin (settings.users)

-- ===== Khách =====
-- Đọc trực tiếp bảng guests: người có view_full, hoặc khách từng ở cơ sở mà mình có stay.view.
-- Tìm kiếm + hồ sơ dùng RPC (06) để che CCCD và ghi audit.
create policy read_guests on public.guests for select to authenticated using (
  private.has_perm('guest.view_full')
  or (sales_owner_id = (select auth.uid()) and private.has_perm('guest.view_full_own'))
  or exists (
    select 1 from public.stay_guests sg
    join public.stays s on s.id = sg.stay_id
    where sg.guest_id = guests.id
      and s.branch_id in (select private.branches_with('stay.view'))
  )
);

-- Giấy tờ: chỉ view_full, hoặc khách ĐANG Ở cơ sở mình (để lễ tân sửa lượt ở)
create policy read_documents on public.guest_documents for select to authenticated using (
  private.has_perm('guest.view_full')
  or exists (select 1 from public.guests g
             where g.id = guest_documents.guest_id
               and g.sales_owner_id = (select auth.uid())
               and private.has_perm('guest.view_full_own'))
  or exists (
    select 1 from public.stay_guests sg
    join public.stays s on s.id = sg.stay_id
    where sg.guest_id = guest_documents.guest_id
      and s.status = 'in_house'
      and s.branch_id in (select private.branches_with('stay.view'))
  )
);

create policy read_stats on public.guest_stats for select to authenticated
  using (private.has_perm('guest.search'));

-- ===== Lượt ở =====
create policy read_branch on public.stays for select to authenticated
  using (branch_id in (select private.branches_with('stay.view')));
create policy read_via_stay on public.stay_guests for select to authenticated
  using (exists (select 1 from public.stays s where s.id = stay_guests.stay_id));   -- RLS của stays áp dụng

-- ===== Ghi chú, cờ, consent, gộp =====
create policy read_notes on public.guest_notes for select to authenticated
  using (deleted_at is null and private.has_perm('guest.search'));
create policy read_flags on public.guest_flags for select to authenticated
  using (private.has_perm('blacklist.view'));
create policy read_consents on public.guest_consents for select to authenticated
  using (private.has_perm('guest.view_summary'));
create policy read_merge on public.merge_requests for select to authenticated
  using (private.has_perm('merge.propose') or private.has_perm('merge.approve'));

-- ===== Nhật ký =====
create policy read_audit on public.audit_logs for select to authenticated using (
  private.has_perm('audit.view_all')
  or branch_id in (select private.branches_with('audit.view_branch'))
);

-- ===== Phân quyền: chỉ đọc; ghi qua RPC ở 04 =====
create policy read_admin on public.role_permissions for select to authenticated
  using (private.has_perm('settings.roles') or private.has_perm('settings.users'));
create policy read_self_or_admin on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()) or private.has_perm('settings.users'));
create policy read_self_or_admin on public.user_permission_overrides for select to authenticated
  using (user_id = (select auth.uid()) or private.has_perm('settings.users'));
create policy read_self_or_admin on public.user_effective_permissions for select to authenticated
  using (user_id = (select auth.uid()) or private.has_perm('settings.users'));

-- -----------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('flag-evidence', 'flag-evidence', false, 5242880, array['image/jpeg','image/png','image/webp','application/pdf']);

create policy evidence_read on storage.objects for select to authenticated
  using (bucket_id = 'flag-evidence' and private.has_perm('blacklist.view'));
create policy evidence_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'flag-evidence' and private.has_perm('blacklist.propose'));
