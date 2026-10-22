-- 20261101000026_checkout_stay_rpc.sql
-- Thêm RPC hoàn tất thủ tục trả phòng (checkout_stay) với kiểm tra phân quyền và ghi audit log

create or replace function public.checkout_stay(
  p_stay_id uuid,
  p_at timestamptz default now()
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_stay public.stays;
  v_checkout_at timestamptz;
begin
  select * into v_stay from public.stays where id = p_stay_id for update;
  if not found then
    raise exception 'stay not found' using errcode = 'P0404';
  end if;

  -- Kiểm tra quyền stay.checkout tại cơ sở của lượt ở
  perform private.assert_perm_at('stay.checkout', v_stay.branch_id);

  if v_stay.status = 'checked_out' then
    raise exception 'stay already checked out' using errcode = 'P0409';
  end if;

  if v_stay.status = 'cancelled' then
    raise exception 'stay was cancelled' using errcode = 'P0409';
  end if;

  v_checkout_at := coalesce(p_at, now());
  if v_checkout_at < v_stay.check_in_at then
    raise exception 'checkout time cannot be before checkin time' using errcode = 'P0422';
  end if;

  update public.stays
     set status = 'checked_out',
         checked_out_at = v_checkout_at,
         updated_by = (select auth.uid())
   where id = p_stay_id;

  -- Ghi audit log
  perform private.log_event(
    'stay.checkout',
    'stay',
    p_stay_id,
    v_stay.branch_id,
    jsonb_build_object(
      'room_id', v_stay.room_id,
      'check_in_at', v_stay.check_in_at,
      'checked_out_at', v_checkout_at
    )
  );
end $$;

revoke all on function public.checkout_stay(uuid, timestamptz) from public;
grant execute on function public.checkout_stay(uuid, timestamptz) to authenticated;
