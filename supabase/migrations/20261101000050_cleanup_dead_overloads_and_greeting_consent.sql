-- 20261101000050_cleanup_dead_overloads_and_greeting_consent.sql
-- QA vòng 15:
--  1. Gỡ các overload "chết" tạo ở migration 47 (viết theo tên cột không có trong
--     schema thật, không được app gọi) để tránh nhầm lẫn / tranh chấp overload.
--  2. Đưa kiểm tra NĐ 13/2023 vào đúng RPC mà Server Action gọi
--     (record_birthday_greeting 8 tham số): kênh sms/zalo/email chỉ được ghi
--     nhận khi khách đã đồng ý nhận tin (tiếp thị hoặc đúng kênh đó).

drop function if exists public.save_group_booking(jsonb);
drop function if exists public.approve_commission(uuid);
drop function if exists public.record_birthday_greeting(uuid, text, text, text, text);

create or replace function public.record_birthday_greeting(
  p_guest_id uuid,
  p_branch_id uuid,
  p_year integer,
  p_channel text,
  p_gift_description text default null::text,
  p_auto_issue_voucher boolean default false,
  p_voucher_discount_pct integer default 15,
  p_note text default null::text
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_res record;
  v_voucher_id uuid := null;
  v_voucher_code text;
  v_guest record;
begin
  perform private.assert_perm('birthday.view', p_branch_id);

  select full_name, phone into v_guest
  from public.guests
  where id = p_guest_id;

  if not found then
    raise exception 'Không tìm thấy hồ sơ khách hàng' using errcode = 'P0404';
  end if;

  -- NĐ 13/2023: chặn tin nhắn tiếp thị tự động nếu khách chưa đồng ý
  if p_channel in ('sms', 'zalo', 'email') and not exists (
    select 1
    from public.guest_consents c
    where c.guest_id = p_guest_id
      and c.channel in ('marketing', p_channel)
      and c.granted
  ) then
    raise exception 'Khách hàng chưa đồng ý nhận tin tiếp thị (Nghị định 13/2023), không thể gửi qua kênh %', p_channel
      using errcode = 'P0403';
  end if;

  -- Nếu chọn tự động phát voucher sinh nhật độc quyền
  if p_auto_issue_voucher then
    v_voucher_code := 'BDAY' || p_year || '-' || upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 6));

    insert into public.vouchers (
      code, title, discount_type, discount_value, max_discount_amount,
      min_spend_amount, valid_from, valid_to, usage_limit, target_guest_id,
      applicable_branch_id, note, created_by
    )
    values (
      v_voucher_code,
      'Ưu đãi mừng sinh nhật ' || p_year || ' - ' || v_guest.full_name,
      'percent',
      coalesce(p_voucher_discount_pct, 15),
      500000,
      0,
      current_date,
      (current_date + interval '60 days')::date,
      1,
      p_guest_id,
      null,
      'Voucher sinh nhật cấp tự động cho ' || v_guest.full_name,
      auth.uid()
    )
    returning id into v_voucher_id;
  end if;

  insert into public.birthday_greetings (
    guest_id, branch_id, year, channel, voucher_id,
    gift_description, status, note, created_by
  )
  values (
    p_guest_id, p_branch_id, p_year, p_channel, v_voucher_id,
    nullif(btrim(p_gift_description), ''), 'sent',
    nullif(btrim(p_note), ''), auth.uid()
  )
  on conflict (guest_id, year) do update
    set branch_id = excluded.branch_id,
        channel = excluded.channel,
        voucher_id = coalesce(excluded.voucher_id, birthday_greetings.voucher_id),
        gift_description = coalesce(excluded.gift_description, birthday_greetings.gift_description),
        note = coalesce(excluded.note, birthday_greetings.note),
        status = 'sent'
  returning * into v_res;

  return jsonb_build_object(
    'greeting_id', v_res.id,
    'guest_id', v_res.guest_id,
    'year', v_res.year,
    'channel', v_res.channel,
    'voucher_id', v_res.voucher_id,
    'voucher_code', v_voucher_code,
    'status', v_res.status
  );
end;
$function$;

grant execute on function public.record_birthday_greeting(uuid, uuid, integer, text, text, boolean, integer, text) to authenticated;
