-- Migration 67: Chức năng Đổi phòng cho khách đang lưu trú (Stay Room Moves)
-- 1. Bảng lưu vết lịch sử chuyển phòng stay_room_moves
create table if not exists public.stay_room_moves (
  id              uuid primary key default gen_random_uuid(),
  stay_id         uuid not null references public.stays(id) on delete cascade,
  branch_id       uuid not null references public.branches(id),
  from_room_id    uuid not null references public.rooms(id),
  to_room_id      uuid not null references public.rooms(id),
  moved_at        timestamptz not null default now(),
  moved_by        uuid not null references public.profiles(id),
  reason_category text not null check (reason_category in ('maintenance', 'guest_request', 'upgrade', 'operational', 'other')),
  reason_note     text not null check (char_length(reason_note) >= 5 and char_length(reason_note) <= 500),
  cleaned_at      timestamptz,
  created_at      timestamptz not null default now()
);

-- RLS cho stay_room_moves
alter table public.stay_room_moves enable row level security;

create policy stay_room_moves_select on public.stay_room_moves
  for select to authenticated
  using (
    private.has_perm('stay.view', branch_id)
  );

create index if not exists stay_room_moves_stay_idx on public.stay_room_moves(stay_id);
create index if not exists stay_room_moves_branch_idx on public.stay_room_moves(branch_id);
create index if not exists stay_room_moves_from_room_idx on public.stay_room_moves(from_room_id, moved_at desc);
create index if not exists stay_room_moves_to_room_idx on public.stay_room_moves(to_room_id);

-- 2. RPC change_stay_room: chuyển phòng an toàn cho khách đang lưu trú
create or replace function public.change_stay_room(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_stay_id         uuid := (p_payload ->> 'stay_id')::uuid;
  v_to_room_id      uuid := (p_payload ->> 'to_room_id')::uuid;
  v_reason_cat      text := trim(p_payload ->> 'reason_category');
  v_reason_note     text := trim(p_payload ->> 'reason_note');
  v_create_wo       boolean := coalesce((p_payload ->> 'create_work_order')::boolean, false);
  v_wo_title        text := trim(p_payload ->> 'work_order_title');
  v_wo_priority     text := coalesce(nullif(trim(p_payload ->> 'work_order_priority'), ''), 'high');

  v_stay            public.stays;
  v_from_room       public.rooms;
  v_to_room         public.rooms;
  v_move_id         uuid;
  v_wo_id           uuid := null;
  v_wo_number       bigint := null;
begin
  -- Validate input
  if v_stay_id is null or v_to_room_id is null then
    raise exception 'stay_id and to_room_id are required' using errcode = 'P0422';
  end if;

  if v_reason_cat not in ('maintenance', 'guest_request', 'upgrade', 'operational', 'other') then
    raise exception 'invalid reason_category' using errcode = 'P0422';
  end if;

  if char_length(v_reason_note) < 5 or char_length(v_reason_note) > 500 then
    raise exception 'reason_note must be between 5 and 500 characters' using errcode = 'P0422';
  end if;

  -- 1. Khóa và lấy thông tin lượt ở
  select * into v_stay from public.stays where id = v_stay_id for update;
  if not found then
    raise exception 'stay not found' using errcode = 'P0404';
  end if;

  -- 2. Kiểm tra quyền stay.update tại cơ sở của lượt ở
  perform private.assert_perm_at('stay.update', v_stay.branch_id);

  -- 3. Chỉ được đổi phòng khi trạng thái là in_house
  if v_stay.status <> 'in_house' then
    raise exception 'only in_house stays can change room' using errcode = 'P0409';
  end if;

  -- 4. Không được đổi sang chính phòng hiện tại
  if v_to_room_id = v_stay.room_id then
    raise exception 'destination room must be different from current room' using errcode = 'P0422';
  end if;

  -- 5. Lấy thông tin phòng cũ
  select * into v_from_room from public.rooms where id = v_stay.room_id;

  -- 6. Kiểm tra phòng mới (phải thuộc cùng cơ sở, active)
  select * into v_to_room from public.rooms
  where id = v_to_room_id and branch_id = v_stay.branch_id and is_active;
  if not found then
    raise exception 'destination room not found, inactive, or not in same branch' using errcode = 'P0422';
  end if;

  -- 7. Phòng mới không được có khách khác đang ở
  if exists (select 1 from public.stays where room_id = v_to_room_id and status = 'in_house') then
    raise exception 'destination room is already occupied' using errcode = 'P0409';
  end if;

  -- 8. Phòng mới không được đang bị khóa bảo trì (room block)
  if private.room_blocked_at(v_to_room_id, now()) then
    raise exception 'destination room is currently blocked / out of order' using errcode = 'P0413';
  end if;

  -- 9. Lưu bản ghi lịch sử chuyển phòng
  insert into public.stay_room_moves (
    stay_id,
    branch_id,
    from_room_id,
    to_room_id,
    moved_at,
    moved_by,
    reason_category,
    reason_note
  ) values (
    v_stay.id,
    v_stay.branch_id,
    v_stay.room_id,
    v_to_room_id,
    now(),
    (select auth.uid()),
    v_reason_cat,
    v_reason_note
  ) returning id into v_move_id;

  -- 10. Cập nhật phòng mới cho lượt ở
  update public.stays
     set room_id = v_to_room_id,
         updated_by = (select auth.uid()),
         updated_at = now()
   where id = v_stay.id;

  -- 11. Tự động tạo Phiếu sửa chữa cho phòng cũ nếu yêu cầu
  if v_create_wo and private.has_perm('wo.create', v_stay.branch_id) then
    insert into public.work_orders (
      branch_id,
      kind,
      title,
      description,
      priority,
      status,
      room_id,
      blocks_room,
      reported_by,
      reported_at
    ) values (
      v_stay.branch_id,
      'corrective',
      coalesce(nullif(v_wo_title, ''), 'Sự cố phòng ' || v_from_room.number || ': ' || v_reason_note),
      'Đổi phòng cho khách sang ' || v_to_room.number || '. Lý do: ' || v_reason_note,
      case
        when v_wo_priority in ('urgent', 'high', 'normal', 'low') then v_wo_priority::public.wo_priority
        else 'high'::public.wo_priority
      end,
      'new',
      v_from_room.id,
      false,
      (select auth.uid()),
      now()
    ) returning id, number into v_wo_id, v_wo_number;
  end if;

  -- 12. Ghi Audit log
  perform private.log_event(
    'stay.room_change',
    'stay',
    v_stay.id,
    v_stay.branch_id,
    jsonb_build_object(
      'from_room_id', v_from_room.id,
      'from_room_number', v_from_room.number,
      'to_room_id', v_to_room.id,
      'to_room_number', v_to_room.number,
      'reason_category', v_reason_cat,
      'reason_note', v_reason_note,
      'move_id', v_move_id,
      'work_order_id', v_wo_id,
      'work_order_number', v_wo_number
    )
  );

  return jsonb_build_object(
    'success', true,
    'move_id', v_move_id,
    'from_room_number', v_from_room.number,
    'to_room_number', v_to_room.number,
    'work_order_number', v_wo_number
  );
end $$;

revoke all on function public.change_stay_room(jsonb) from public;
grant execute on function public.change_stay_room(jsonb) to authenticated, service_role;

-- 3. Cập nhật confirm_room_cleaned để hỗ trợ dọn sạch cả phòng vừa đổi
create or replace function public.confirm_room_cleaned(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_branch_id uuid;
  v_stay_id   uuid;
  v_move_id   uuid;
  v_updated   boolean := false;
begin
  select branch_id into v_branch_id
  from public.rooms
  where id = p_room_id;

  if not found then
    raise exception 'room not found' using errcode = 'P0404';
  end if;

  perform private.assert_perm_at('stay.checkout', v_branch_id);

  -- 1. Tìm lượt ở checkout trong 6 giờ chưa dọn
  select id into v_stay_id
  from public.stays
  where room_id = p_room_id
    and status = 'checked_out'
    and checked_out_at >= now() - interval '6 hours'
    and cleaned_at is null
  order by checked_out_at desc
  limit 1
  for update;

  if v_stay_id is not null then
    update public.stays
       set cleaned_at = now()
     where id = v_stay_id;
    v_updated := true;
  end if;

  -- 2. Tìm lượt đổi phòng từ phòng này trong 6 giờ chưa dọn
  select id into v_move_id
  from public.stay_room_moves
  where from_room_id = p_room_id
    and moved_at >= now() - interval '6 hours'
    and cleaned_at is null
  order by moved_at desc
  limit 1
  for update;

  if v_move_id is not null then
    update public.stay_room_moves
       set cleaned_at = now()
     where id = v_move_id;
    v_updated := true;
  end if;

  if not v_updated then
    return jsonb_build_object(
      'success', true,
      'noop', true,
      'stay_id', null
    );
  end if;

  perform private.log_event(
    'room.cleaned',
    'room',
    p_room_id,
    v_branch_id,
    jsonb_build_object('stay_id', v_stay_id, 'move_id', v_move_id)
  );

  return jsonb_build_object(
    'success', true,
    'noop', false,
    'stay_id', v_stay_id,
    'move_id', v_move_id
  );
end $$;

