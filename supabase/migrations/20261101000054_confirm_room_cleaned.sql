-- 20261101000054_confirm_room_cleaned.sql
-- Thêm cột cleaned_at cho stays và RPC confirm_room_cleaned để lễ tân báo phòng sạch ngay

-- 1. Bổ sung cột cleaned_at nullable vào public.stays
alter table public.stays add column if not exists cleaned_at timestamptz;

-- 2. RPC confirm_room_cleaned(p_room_id uuid)
create or replace function public.confirm_room_cleaned(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_branch_id uuid;
  v_stay_id   uuid;
begin
  -- 1. Xác định cơ sở của phòng
  select branch_id into v_branch_id
  from public.rooms
  where id = p_room_id;

  if not found then
    raise exception 'room not found' using errcode = 'P0404';
  end if;

  -- 2. Kiểm tra quyền stay.checkout tại đúng cơ sở của phòng
  perform private.assert_perm_at('stay.checkout', v_branch_id);

  -- 3. Tìm lượt ở checked_out mới nhất còn trong cửa sổ dọn dẹp 6 giờ và chưa được báo sạch
  select id into v_stay_id
  from public.stays
  where room_id = p_room_id
    and status = 'checked_out'
    and checked_out_at >= now() - interval '6 hours'
    and cleaned_at is null
  order by checked_out_at desc
  limit 1
  for update;

  -- 4. Nếu không tìm thấy lượt nào thỏa mãn thì trả về no-op thành công, không báo lỗi
  if v_stay_id is null then
    return jsonb_build_object(
      'success', true,
      'noop', true,
      'stay_id', null
    );
  end if;

  -- 5. Cập nhật cleaned_at
  update public.stays
     set cleaned_at = now()
   where id = v_stay_id;

  -- 6. Ghi audit log
  perform private.log_event(
    'room.cleaned',
    'stay',
    v_stay_id,
    v_branch_id,
    jsonb_build_object(
      'room_id', p_room_id,
      'cleaned_at', now()
    )
  );

  return jsonb_build_object(
    'success', true,
    'noop', false,
    'stay_id', v_stay_id
  );
end $$;

