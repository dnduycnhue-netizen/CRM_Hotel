-- Migration: Allow facility / work order staff to view rooms for reporting & maintenance
-- Fixes QA-17: Kỹ thuật không tạo được phiếu sự cố do RLS chặn đọc danh sách phòng

drop policy if exists read_branch on public.rooms;
create policy read_branch on public.rooms for select to authenticated
  using (
    branch_id in (select private.branches_with('stay.view'))
    or branch_id in (select private.branches_with('wo.create'))
    or branch_id in (select private.branches_with('wo.view'))
    or branch_id in (select private.branches_with('facility.view'))
    or private.has_perm('settings.rooms')
  );
