-- Migration 69: Sửa hàm public.save_branch ghi audit log đúng chữ ký của private.log_event
-- Khắc phục lỗi: function private.log_event(unknown, unknown, uuid, jsonb, jsonb) does not exist (42883) khi cập nhật cơ sở

create or replace function public.save_branch(
  p_id uuid,
  p_code text,
  p_name text,
  p_phone text default null,
  p_address text default null,
  p_night_cutoff time default '06:00:00',
  p_default_checkout_time time default '12:00:00',
  p_is_active boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := p_id;
  v_old jsonb;
begin
  perform private.assert_perm('settings.branches');

  if p_code is null or trim(p_code) = '' or p_name is null or trim(p_name) = '' then
    raise exception 'Mã và tên cơ sở không được để trống' using errcode = 'P0400';
  end if;

  if v_id is not null then
    select to_jsonb(b) into v_old from public.branches b where id = v_id;
    if v_old is null then
      raise exception 'Không tìm thấy cơ sở' using errcode = 'P0404';
    end if;

    update public.branches
    set code = upper(trim(p_code)),
        name = trim(p_name),
        phone = trim(p_phone),
        address = trim(p_address),
        night_cutoff = p_night_cutoff,
        default_checkout_time = p_default_checkout_time,
        is_active = p_is_active
    where id = v_id;

    perform private.log_event(
      'branch.update',
      'branches',
      v_id,
      v_id,
      jsonb_build_object(
        'code', upper(trim(p_code)),
        'name', trim(p_name),
        'phone', trim(p_phone),
        'address', trim(p_address),
        'night_cutoff', p_night_cutoff,
        'default_checkout_time', p_default_checkout_time,
        'is_active', p_is_active,
        'old', v_old
      )
    );
  else
    insert into public.branches (
      code, name, phone, address, night_cutoff, default_checkout_time, is_active
    )
    values (
      upper(trim(p_code)), trim(p_name), trim(p_phone), trim(p_address),
      p_night_cutoff, p_default_checkout_time, p_is_active
    )
    returning id into v_id;

    perform private.log_event(
      'branch.create',
      'branches',
      v_id,
      v_id,
      jsonb_build_object(
        'code', upper(trim(p_code)),
        'name', trim(p_name),
        'phone', trim(p_phone),
        'address', trim(p_address),
        'night_cutoff', p_night_cutoff,
        'default_checkout_time', p_default_checkout_time,
        'is_active', p_is_active
      )
    );
  end if;

  return v_id;
end $$;

grant execute on function public.save_branch(uuid, text, text, text, text, time, time, boolean) to authenticated;
