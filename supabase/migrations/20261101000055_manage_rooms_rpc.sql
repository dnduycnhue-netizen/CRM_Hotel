-- 20261101000055_manage_rooms_rpc.sql
-- Cấp quyền settings.rooms cho Quản lý chi nhánh và tạo các RPC quản lý phòng

-- 1. Cấp lại quyền settings.rooms cho vai trò branch_manager
insert into public.role_permissions (role_id, permission_key)
select id, 'settings.rooms'
from public.roles
where key = 'branch_manager'
on conflict do nothing;

select private.rebuild_all_permissions();

-- 2. RPC create_room
create or replace function public.create_room(
  p_branch_id uuid,
  p_number text,
  p_floor smallint default null,
  p_room_type text default 'Standard',
  p_opened_on date default current_date
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_num text := btrim(p_number);
begin
  if p_branch_id is null then
    raise exception 'branch required' using errcode = 'P0422';
  end if;

  if v_num is null or char_length(v_num) < 1 or char_length(v_num) > 10 then
    raise exception 'invalid room number' using errcode = 'P0422';
  end if;

  -- Kiểm tra quyền settings.rooms tại chi nhánh
  perform private.assert_perm_at('settings.rooms', p_branch_id);

  -- Kiểm tra trùng số phòng trong cùng chi nhánh
  if exists (
    select 1 from public.rooms
    where branch_id = p_branch_id and number = v_num
  ) then
    raise exception 'room number already exists in branch' using errcode = 'P0409';
  end if;

  insert into public.rooms (
    branch_id,
    number,
    floor,
    room_type,
    opened_on,
    is_active
  ) values (
    p_branch_id,
    v_num,
    p_floor,
    nullif(btrim(p_room_type), ''),
    coalesce(p_opened_on, current_date),
    true
  )
  returning id into v_id;

  perform private.log_event(
    'room.create',
    'room',
    v_id,
    p_branch_id,
    jsonb_build_object(
      'number', v_num,
      'floor', p_floor,
      'room_type', p_room_type
    )
  );

  return v_id;
end $$;

-- 3. RPC update_room
create or replace function public.update_room(
  p_room_id uuid,
  p_number text,
  p_floor smallint default null,
  p_room_type text default null,
  p_opened_on date default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_branch_id uuid;
  v_num text := btrim(p_number);
begin
  select branch_id into v_branch_id
  from public.rooms
  where id = p_room_id;

  if not found then
    raise exception 'room not found' using errcode = 'P0404';
  end if;

  -- Kiểm tra quyền settings.rooms tại chi nhánh
  perform private.assert_perm_at('settings.rooms', v_branch_id);

  if v_num is not null then
    if char_length(v_num) < 1 or char_length(v_num) > 10 then
      raise exception 'invalid room number' using errcode = 'P0422';
    end if;

    -- Kiểm tra trùng số phòng với phòng khác trong cùng chi nhánh
    if exists (
      select 1 from public.rooms
      where branch_id = v_branch_id and number = v_num and id <> p_room_id
    ) then
      raise exception 'room number already exists in branch' using errcode = 'P0409';
    end if;
  end if;

  update public.rooms
     set number = coalesce(v_num, number),
         floor = coalesce(p_floor, floor),
         room_type = coalesce(nullif(btrim(p_room_type), ''), room_type),
         opened_on = coalesce(p_opened_on, opened_on)
   where id = p_room_id;

  perform private.log_event(
    'room.update',
    'room',
    p_room_id,
    v_branch_id,
    jsonb_build_object(
      'number', v_num,
      'floor', p_floor,
      'room_type', p_room_type
    )
  );

  return p_room_id;
end $$;

-- 4. RPC deactivate_room (ngừng kinh doanh)
create or replace function public.deactivate_room(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_branch_id uuid;
begin
  select branch_id into v_branch_id
  from public.rooms
  where id = p_room_id;

  if not found then
    raise exception 'room not found' using errcode = 'P0404';
  end if;

  perform private.assert_perm_at('settings.rooms', v_branch_id);

  update public.rooms
     set is_active = false,
         closed_on = current_date
   where id = p_room_id;

  perform private.log_event(
    'room.deactivate',
    'room',
    p_room_id,
    v_branch_id,
    jsonb_build_object('closed_on', current_date)
  );
end $$;

-- 5. RPC reactivate_room (mở bán lại)
create or replace function public.reactivate_room(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_branch_id uuid;
begin
  select branch_id into v_branch_id
  from public.rooms
  where id = p_room_id;

  if not found then
    raise exception 'room not found' using errcode = 'P0404';
  end if;

  perform private.assert_perm_at('settings.rooms', v_branch_id);

  update public.rooms
     set is_active = true,
         closed_on = null
   where id = p_room_id;

  perform private.log_event(
    'room.reactivate',
    'room',
    p_room_id,
    v_branch_id,
    jsonb_build_object('reactivated_at', now())
  );
end $$;

-- 6. RPC delete_room_permanent (xóa vĩnh viễn - chỉ dành cho Chủ chuỗi khi chưa có lượt ở và chưa có block OOO)
create or replace function public.delete_room_permanent(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_branch_id uuid;
  v_number text;
  v_is_owner boolean;
begin
  select branch_id, number into v_branch_id, v_number
  from public.rooms
  where id = p_room_id;

  if not found then
    raise exception 'room not found' using errcode = 'P0404';
  end if;

  -- Kiểm tra quyền Chủ chuỗi: vai trò owner
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on ur.role_id = r.id
    where ur.user_id = (select auth.uid()) and r.key = 'owner'
  ) into v_is_owner;

  if not v_is_owner then
    raise exception 'only owner can permanently delete room' using errcode = 'P0403';
  end if;

  -- Kiểm tra ràng buộc stays
  if exists (select 1 from public.stays where room_id = p_room_id) then
    raise exception 'cannot delete room with stay history' using errcode = 'P0409';
  end if;

  -- Kiểm tra ràng buộc room_blocks
  if exists (select 1 from public.room_blocks where room_id = p_room_id) then
    raise exception 'cannot delete room with block history' using errcode = 'P0409';
  end if;

  delete from public.rooms where id = p_room_id;

  perform private.log_event(
    'room.delete_permanent',
    'room',
    p_room_id,
    v_branch_id,
    jsonb_build_object('number', v_number)
  );
end $$;

