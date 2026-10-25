-- Migration 45: Sprint D, E, F Fixes for QA Round 11
-- 1. Nâng cấp public.guest_profile: Tự suy nguồn khách (source_channel) từ lượt ở gần nhất nếu chưa gán
-- 2. Backfill source_channel_id cho các khách hàng cũ chưa có nguồn
-- 3. Checkout 2 lượt ở treo từ vòng 10 tại Boutique (P.602, P.604) và cập nhật guest_stats
-- 4. Bật module consent tại tất cả cơ sở và dọn dẹp voucher/đoàn test vòng 11

-- 1. Sửa RPC public.guest_profile
create or replace function public.guest_profile(p_guest_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_g           public.guests;
  v_full        boolean;
  v_branch_id   uuid;
  v_log_branch  uuid;
  v_effective_source_id uuid;
begin
  perform private.assert_perm('guest.view_summary');
  select * into v_g from public.guests where id = p_guest_id;
  if not found then raise exception 'guest not found' using errcode = 'P0404'; end if;
  if v_g.merged_into is not null then
    return jsonb_build_object('redirect_to', v_g.merged_into);
  end if;

  select s.last_branch_id into v_branch_id from public.guest_stats s where s.guest_id = p_guest_id;

  v_full := (v_branch_id is not null and private.has_perm('guest.view_full', v_branch_id))
            or private.has_perm('report.view_chain')
            or (v_g.sales_owner_id = (select auth.uid()) and private.has_perm('guest.view_full_own'));

  if v_full then
    v_log_branch := coalesce(
      v_branch_id,
      (select branch_id from public.user_roles where user_id = (select auth.uid()) and branch_id is not null limit 1)
    );
    perform private.log_event('guest.view_full', 'guests', p_guest_id, v_log_branch);
  end if;

  -- Suy nguồn khách từ lượt lưu trú gần nhất nếu chưa có nguồn trực tiếp trên hồ sơ
  v_effective_source_id := coalesce(
    v_g.source_channel_id,
    (
      select st.source_channel_id
      from public.stay_guests sg
      join public.stays st on st.id = sg.stay_id
      where sg.guest_id = p_guest_id
        and st.source_channel_id is not null
      order by st.check_in_at desc
      limit 1
    )
  );

  return jsonb_build_object(
    'guest', jsonb_build_object(
      'id', v_g.id, 'full_name', v_g.full_name, 'gender', v_g.gender,
      'dob', case when v_full then v_g.dob end, 'birth_year', extract(year from v_g.dob),
      'nationality', v_g.nationality,
      'phone', case
        when v_full then v_g.phone
        when length(v_g.phone) >= 7 then overlay(v_g.phone placing '****' from 4 for 4)
        else v_g.phone
      end,
      'phone_intl', case when v_full then v_g.phone_intl else null end,
      'email', v_g.email,
      'address_line', case when v_full then v_g.address_line end,
      'province_code', v_g.province_code, 'ward_code', case when v_full then v_g.ward_code end,
      'tags', v_g.tags, 'created_at', v_g.created_at, 'updated_at', v_g.updated_at,
      'sales_owner', (select jsonb_build_object('id', pr.id, 'name', pr.full_name)
                      from public.profiles pr where pr.id = v_g.sales_owner_id),
      'source_channel', (select jsonb_build_object('id', sc.id, 'name', sc.name, 'kind', sc.kind)
                         from public.source_channels sc where sc.id = v_effective_source_id),
      'tier_override_code', v_g.tier_override_code,
      'tier_override_until', v_g.tier_override_until,
      'tier_override_reason', v_g.tier_override_reason),
    'tier', case when private.has_perm('loyalty.view') then private.guest_tier(p_guest_id) end,
    'tier_events', case when private.has_perm('loyalty.view') then coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id,
        'from_tier', (select name from public.loyalty_tiers where id = e.from_tier_id),
        'to_tier', (select name from public.loyalty_tiers where id = e.to_tier_id),
        'kind', e.kind,
        'policy_name', coalesce(p.name, 'Chính sách mặc định'),
        'actor', pr.full_name,
        'note', e.note,
        'at', e.at
      ) order by e.at desc)
      from public.guest_tier_events e
      left join public.loyalty_policies p on p.id = e.policy_id
      left join public.profiles pr on pr.id = e.actor_id
      where e.guest_id = p_guest_id
      limit 50
    ), '[]'::jsonb) else '[]'::jsonb end,
    'documents', coalesce((
      select jsonb_agg(jsonb_build_object(
        'type', d.doc_type, 'country', d.issuing_country,
        'number', case when v_full then d.doc_number else private.mask_doc(d.doc_number) end)
        order by d.created_at)
      from public.guest_documents d where d.guest_id = p_guest_id), '[]'::jsonb),
    'stats', (select to_jsonb(s) - 'guest_id' from public.guest_stats s where s.guest_id = p_guest_id),
    'stays', coalesce((
      select jsonb_agg(x.j order by x.ts desc) from (
        select st.check_in_at as ts, jsonb_build_object(
          'id', st.id, 'branch', b.name, 'room', r.number, 'status', st.status,
          'check_in_at', st.check_in_at,
          'check_out_at', coalesce(st.checked_out_at, st.expected_check_out_at),
          'nights', st.nights, 'source', sc.name, 'partner', pa.name, 'entry_mode', st.entry_mode,
          'is_primary', sg.is_primary) as j
        from public.stay_guests sg
        join public.stays st   on st.id = sg.stay_id
        join public.branches b on b.id = st.branch_id
        join public.rooms r    on r.id = st.room_id
        join public.source_channels sc on sc.id = st.source_channel_id
        left join public.partners pa   on pa.id = st.partner_id
        where sg.guest_id = p_guest_id
        order by st.check_in_at desc
        limit 50) x), '[]'::jsonb),
    'companions', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'full_name', c.full_name, 'times', c.n, 'last_stay_at', c.last_stay_at) order by c.n desc)
      from (
        select g2.id, g2.full_name, count(*) as n, max(st.check_in_at) as last_stay_at
        from public.stay_guests a
        join public.stay_guests o on o.stay_id = a.stay_id and o.guest_id <> a.guest_id
        join public.stays st      on st.id = a.stay_id
        join public.guests g2     on g2.id = o.guest_id and g2.merged_into is null
        where a.guest_id = p_guest_id
        group by g2.id, g2.full_name
        order by n desc limit 15) c), '[]'::jsonb),
    'notes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', n.id, 'kind', n.kind, 'body', n.body, 'branch', b.name,
        'author', pr.full_name, 'author_id', n.created_by, 'at', n.created_at)
        order by n.created_at desc)
      from (select * from public.guest_notes where guest_id = p_guest_id and deleted_at is null
            order by created_at desc limit 50) n
      left join public.branches b  on b.id = n.branch_id
      left join public.profiles pr on pr.id = n.created_by), '[]'::jsonb),
    'flags', case when private.has_perm('blacklist.view') then coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', f.id, 'type', f.flag_type, 'status', f.status, 'reason', f.reason,
        'branch', b.name, 'proposed_at', f.proposed_at, 'decided_at', f.decided_at)
        order by f.proposed_at desc)
      from public.guest_flags f join public.branches b on b.id = f.branch_id
      where f.guest_id = p_guest_id and f.status in ('proposed', 'approved')), '[]'::jsonb)
      else '[]'::jsonb end,
    'consents', coalesce((
      select jsonb_object_agg(c.channel, c.granted)
      from public.guest_consents c where c.guest_id = p_guest_id), '{}'::jsonb),
    'can', jsonb_build_object(
      'view_full', v_full,
      'update', private.has_perm('guest.update'),
      'assign_owner', private.has_perm('guest.assign_owner'),
      'note', private.has_perm('guest.note_create'),
      'tag', private.has_perm('guest.tag_manage'),
      'propose_flag', private.has_perm('blacklist.propose'),
      'propose_merge', private.has_perm('merge.propose'),
      'override_tier', private.has_perm('loyalty.override'))
  );
end;
$function$;

-- 2. Backfill source_channel_id cho các khách hàng cũ chưa có nguồn
update public.guests g
set source_channel_id = sub.source_channel_id
from (
  select distinct on (sg.guest_id) sg.guest_id, st.source_channel_id
  from public.stay_guests sg
  join public.stays st on st.id = sg.stay_id
  where st.source_channel_id is not null
  order by sg.guest_id, st.check_in_at desc
) sub
where g.id = sub.guest_id and g.source_channel_id is null;

-- 3. Checkout 2 lượt ở treo từ vòng 10 tại Boutique (P.602: f319b1cb-2a10-46e6-8ae2-d69a68c080c9, P.604: 5a84e021-db04-48ab-b313-5c15e97d43ff)
update public.stays
set status = 'checked_out',
    checked_out_at = coalesce(checked_out_at, expected_check_out_at, now())
where id in (
  'f319b1cb-2a10-46e6-8ae2-d69a68c080c9'::uuid,
  '5a84e021-db04-48ab-b313-5c15e97d43ff'::uuid
) and status = 'in_house';

-- Cập nhật lại guest_stats cho 2 khách này
do $$
begin
  perform private.refresh_guest_stats(array[
    '0440d05c-a391-4a7e-b0ff-5f0da3380738'::uuid,
    '13b08dd8-c815-4eda-9527-026a3d8fc2de'::uuid
  ]);
end $$;

-- 4. Bật module consent tại tất cả các cơ sở
update public.branch_modules
set state = 'on', updated_at = now()
where module_key = 'consent';

-- 5. Dọn dẹp voucher test nếu có
delete from public.vouchers
where code in ('SEEDV11W04') or code like 'BDAY2026-71C35A%';
