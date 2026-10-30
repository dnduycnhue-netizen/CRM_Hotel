-- Migration 64: Sửa triệt để khóa chi nhánh cho nhân viên kỹ thuật và cơ sở, nạp dữ liệu test blacklist
-- Phục vụ QA Vòng 22 - 30/10/2026

-- 1. Cập nhật chi nhánh cố định (default_branch_id) trong profiles cho nhân viên kỹ thuật CSVC và các cơ sở
update public.profiles
   set default_branch_id = (select id from public.branches where code = 'NGOMAY'),
       updated_at = now()
 where id in (select id from auth.users where email = 'kythuat@khachsan.vn');

update public.profiles
   set default_branch_id = (select id from public.branches where code = 'ALOHA'),
       updated_at = now()
 where id in (select id from auth.users where email = 'alohaquynhon@gmail.com')
   and default_branch_id is null;

update public.profiles
   set default_branch_id = (select id from public.branches where code = 'SUN'),
       updated_at = now()
 where id in (select id from auth.users where email = 'mirasunhotelquynhon@gmail.com')
   and default_branch_id is null;

update public.profiles
   set default_branch_id = (select id from public.branches where code = 'ECO'),
       updated_at = now()
 where id in (select id from auth.users where email = 'miraecoquynhon@gmail.com')
   and default_branch_id is null;

-- 2. Tạo sẵn 1 hồ sơ khách hàng mẫu bị Blacklist (0 lượt ở) để QA kiểm thử trực quan cảnh báo khi xóa khách
do $$
declare
  v_guest_id uuid := '77777777-7777-7777-7777-777777777701'::uuid;
  v_branch_id uuid;
  v_admin_id uuid;
begin
  select id into v_branch_id from public.branches where code = 'BOUTIQUE' limit 1;
  select id into v_admin_id from public.profiles where is_active limit 1;

  if v_branch_id is not null and v_admin_id is not null then
    -- Thêm hoặc cập nhật guest
    insert into public.guests (id, full_name, phone, gender, created_at, updated_at)
    values (
      v_guest_id,
      '[SEED QA] Khách Blacklist Test Xóa',
      '0988887766',
      'male',
      now(),
      now()
    )
    on conflict (id) do update set
      full_name = '[SEED QA] Khách Blacklist Test Xóa',
      phone = '0988887766';

    -- Thêm cờ cảnh báo approved (Blacklist) cho khách này
    delete from public.guest_flags where guest_id = v_guest_id;
    insert into public.guest_flags (
      guest_id, branch_id, flag_type, reason, status, proposed_by, proposed_at, decided_by, decided_at
    )
    values (
      v_guest_id,
      v_branch_id,
      'blacklist',
      'Gây rối trật tự và phá hỏng tài sản phòng [TEST QA BLACKLIST WARNING]',
      'approved',
      v_admin_id,
      now(),
      v_admin_id,
      now()
    );
  end if;
end $$;
