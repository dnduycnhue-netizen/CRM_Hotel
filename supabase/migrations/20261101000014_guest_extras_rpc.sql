-- 20261101000014_guest_extras_rpc.sql
-- Bổ sung các RPC nghiệp vụ cho ghi chú, thẻ tag, cập nhật hồ sơ khách, reveal danh tính và consent

-- 1. Thêm ghi chú khách
create or replace function public.add_guest_note(
  p_guest_id uuid,
  p_branch_id uuid,
  p_kind public.note_kind,
  p_body text
)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_note_id uuid;
  v_author_name text;
begin
  perform private.assert_perm('guest.note_create');
  
  if char_length(btrim(coalesce(p_body, ''))) < 1 then
    raise exception 'note body required' using errcode = 'P0422';
  end if;

  insert into public.guest_notes (guest_id, branch_id, kind, body, created_by)
  values (p_guest_id, p_branch_id, coalesce(p_kind, 'general'::public.note_kind), btrim(p_body), (select auth.uid()))
  returning id into v_note_id;

  select full_name into v_author_name from public.profiles where id = (select auth.uid());

  perform private.log_event('guest.note_create', 'guest_notes', v_note_id, p_branch_id, 
                            jsonb_build_object('guest_id', p_guest_id, 'kind', p_kind));

  return jsonb_build_object(
    'id', v_note_id,
    'guest_id', p_guest_id,
    'branch_id', p_branch_id,
    'kind', p_kind,
    'body', btrim(p_body),
    'author', coalesce(v_author_name, 'Hệ thống'),
    'created_at', now()
  );
end $$;

-- 2. Xóa ghi chú khách (tác giả xóa trong 24h hoặc người có quyền guest.note_delete_any)
create or replace function public.delete_guest_note(p_note_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_note public.guest_notes;
begin
  select * into v_note from public.guest_notes where id = p_note_id and deleted_at is null;
  if not found then
    raise exception 'note not found' using errcode = 'P0404';
  end if;

  if v_note.created_by = (select auth.uid()) and v_note.created_at >= now() - interval '24 hours' then
    -- Hợp lệ cho chính tác giả trong 24h
  else
    perform private.assert_perm('guest.note_delete_any');
  end if;

  update public.guest_notes set deleted_at = now() where id = p_note_id;
  perform private.log_event('guest.note_delete', 'guest_notes', p_note_id, v_note.branch_id);
end $$;

-- 3. Cập nhật nhãn (tags) của khách
create or replace function public.set_guest_tags(p_guest_id uuid, p_tags text[])
returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_perm('guest.tag_manage');
  
  update public.guests
  set tags = array(select distinct unnest(coalesce(p_tags, '{}'::text[]))),
      updated_at = now()
  where id = p_guest_id and merged_into is null;

  if not found then
    raise exception 'guest not found' using errcode = 'P0404';
  end if;

  perform private.log_event('guest.tag_manage', 'guests', p_guest_id, null, jsonb_build_object('tags', p_tags));
end $$;

-- 4. Cập nhật thông tin khách (Khóa lạc quan bằng updated_at)
create or replace function public.update_guest(
  p_guest_id uuid,
  p_patch jsonb,
  p_expected_updated_at timestamptz
)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_g public.guests;
  v_name text;
  v_phone text;
  v_email text;
begin
  perform private.assert_perm('guest.update');

  select * into v_g from public.guests where id = p_guest_id for update;
  if not found then
    raise exception 'guest not found' using errcode = 'P0404';
  end if;

  if p_expected_updated_at is not null and v_g.updated_at <> p_expected_updated_at then
    raise exception 'conflict updating guest' using errcode = 'P0409';
  end if;

  v_name  := coalesce(nullif(btrim(p_patch ->> 'full_name'), ''), v_g.full_name);
  v_phone := coalesce(nullif(btrim(p_patch ->> 'phone'), ''), v_g.phone);
  v_email := coalesce(nullif(btrim(p_patch ->> 'email'), ''), v_g.email);

  -- Kiểm tra trùng lặp SĐT với khách khác
  if v_phone is not null and v_phone <> coalesce(v_g.phone, '') then
    if exists (select 1 from public.guests where phone = v_phone and id <> p_guest_id and merged_into is null) then
      raise exception 'phone already exists' using errcode = 'P0411';
    end if;
  end if;

  update public.guests
  set full_name = v_name,
      search_name = private.normalize_search(v_name),
      gender = coalesce((p_patch ->> 'gender')::public.gender, v_g.gender),
      dob = case when p_patch ? 'dob' then (p_patch ->> 'dob')::date else v_g.dob end,
      nationality = coalesce(nullif(p_patch ->> 'nationality', ''), v_g.nationality),
      phone = v_phone,
      phone_intl = case when p_patch ? 'phone_intl' then nullif(p_patch ->> 'phone_intl', '') else v_g.phone_intl end,
      email = v_email,
      address_line = case when p_patch ? 'address_line' then nullif(p_patch ->> 'address_line', '') else v_g.address_line end,
      province_code = case when p_patch ? 'province_code' then nullif(p_patch ->> 'province_code', '') else v_g.province_code end,
      ward_code = case when p_patch ? 'ward_code' then nullif(p_patch ->> 'ward_code', '') else v_g.ward_code end,
      updated_at = now()
  where id = p_guest_id;

  perform private.log_event('guest.update', 'guests', p_guest_id, null, p_patch);

  return jsonb_build_object('id', p_guest_id, 'updated', true);
end $$;

-- 5. Cập nhật đồng thuận liên lạc (consent)
create or replace function public.set_guest_consent(
  p_guest_id uuid,
  p_channel text,
  p_granted boolean,
  p_source text default 'front_desk'
)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_perm('consent.manage');

  if p_channel not in ('zalo', 'sms', 'email', 'phone') then
    raise exception 'invalid consent channel' using errcode = 'P0422';
  end if;

  insert into public.guest_consents (guest_id, channel, granted, recorded_at, recorded_by, source)
  values (p_guest_id, p_channel, p_granted, now(), (select auth.uid()), coalesce(p_source, 'front_desk'))
  on conflict (guest_id, channel) do update
    set granted = excluded.granted,
        recorded_at = excluded.recorded_at,
        recorded_by = excluded.recorded_by,
        source = excluded.source;

  perform private.log_event('consent.update', 'guest_consents', null, null,
                            jsonb_build_object('guest_id', p_guest_id, 'channel', p_channel, 'granted', p_granted));
end $$;

-- 6. Phân quyền thực thi
do $$
declare fn text;
begin
  foreach fn in array array[
    'public.add_guest_note(uuid, uuid, public.note_kind, text)',
    'public.delete_guest_note(uuid)',
    'public.set_guest_tags(uuid, text[])',
    'public.update_guest(uuid, jsonb, timestamptz)',
    'public.set_guest_consent(uuid, text, boolean, text)'
  ] loop
    execute format('revoke all on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end $$;
