-- 20261101000034_fix_qa_round9_reporting_and_audit.sql
-- Fix QA Round 9: Reporting metrics alignment, audit log branch attribution, and go-live date configuration

-- 1. Cập nhật ngày go-live của ứng dụng về ngày thực tế bắt đầu vận hành (2026-08-01)
-- Giúp report_monthly đồng bộ số liệu CRM từ daily_facts cho các tháng 8, 9, 10/2026 thay vì chỉ nhận từ 12/2026
update public.app_settings
   set value = '"2026-08-01"',
       updated_at = now()
 where key = 'app.go_live_date';

-- 2. Cập nhật function report_monthly:
-- Đảm bảo khoảng thời gian lấy daily_facts hợp lệ (không bị from > to khi go_live_date ở tương lai hoặc đầu kỳ)
-- Thống nhất logic xác định nguồn dữ liệu: 'app', 'baseline', 'mixed', hoặc 'none'
create or replace function public.report_monthly(p_year int, p_branch_ids uuid[] default null)
returns table (
  month date, source text, arrivals bigint, room_nights bigint, available_room_nights bigint,
  occupancy numeric, room_revenue numeric, adr numeric, revpar numeric
)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_br   uuid[] := private.report_scope(p_branch_ids);
  v_live date := date_trunc('month', private.go_live_date())::date;
  v_rev  boolean := private.has_perm('revenue.view');
  v_from date := make_date(p_year - 1, 1, 1);
  v_to   date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
begin
  return query
  with months as (
    select gs::date as m
    from generate_series(make_date(p_year - 1, 1, 1), make_date(p_year, 12, 1), interval '1 month') gs
  ),
  app as (
    select date_trunc('month', f.d)::date as m, f.branch_id,
           sum(f.arrivals) as arrivals, sum(f.room_nights) as room_nights, sum(f.rooms - f.blocked) as avail
    from private.daily_facts(
      greatest(v_from, private.go_live_date()),
      least(make_date(p_year, 12, 31), v_to),
      v_br
    ) f
    group by 1, 2
  ),
  per_branch as (
    select mo.m, b.id as branch_id,
           case
             when mo.m >= v_live and (coalesce(app.room_nights, 0) > 0 or coalesce(app.arrivals, 0) > 0 or mo.m <= v_to) then 'app'
             when fig.room_nights is not null then 'baseline'
             else 'none'
           end as src,
           case when mo.m >= v_live then app.arrivals else fig.arrivals end as arrivals,
           case when mo.m >= v_live then app.room_nights else fig.room_nights end as room_nights,
           case when mo.m >= v_live then app.avail else fig.available_room_nights end as avail,
           case when mo.m >= v_live then null else fig.room_revenue end as room_revenue
    from months mo
    cross join unnest(v_br) b(id)
    left join app on app.m = mo.m and app.branch_id = b.id
    left join public.branch_monthly_figures fig on fig.branch_id = b.id and fig.month = mo.m
  )
  select pb.m,
         case
           when count(distinct pb.src) filter (where pb.src <> 'none') = 1 then
             min(pb.src) filter (where pb.src <> 'none')
           when count(distinct pb.src) filter (where pb.src <> 'none') > 1 then
             'mixed'
           else 'none'
         end as source,
         sum(pb.arrivals)::bigint, sum(pb.room_nights)::bigint, sum(pb.avail)::bigint,
         round(100.0 * sum(pb.room_nights) / nullif(sum(pb.avail), 0), 1),
         case when v_rev then sum(pb.room_revenue) end,
         case when v_rev then round(sum(pb.room_revenue) / nullif(sum(pb.room_nights) filter (where pb.room_revenue is not null), 0), 0) end,
         case when v_rev then round(sum(pb.room_revenue) / nullif(sum(pb.avail) filter (where pb.room_revenue is not null), 0), 0) end
  from per_branch pb
  group by pb.m
  order by pb.m;
end $$;

-- 3. Cải tiến hàm ghi audit log: Tự động gán branch_id nếu actor thao tác thuộc về một cơ sở cụ thể
create or replace function private.log_event(
  p_action text,
  p_entity text,
  p_entity_id uuid,
  p_branch_id uuid default null,
  p_meta jsonb default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_branch_id uuid := p_branch_id;
begin
  if v_branch_id is null then
    -- Tự động lấy branch_id phân quyền của actor nếu có
    select branch_id into v_branch_id
    from public.user_roles
    where user_id = (select auth.uid()) and branch_id is not null
    limit 1;
  end if;

  insert into public.audit_logs (actor_id, branch_id, action, entity, entity_id, meta)
  values ((select auth.uid()), v_branch_id, p_action, p_entity, p_entity_id, p_meta);
end $$;

-- 4. Cải tiến trigger private.audit_row(): Tự động gán branch_id nếu bản ghi không có cột branch_id (guests, guest_notes, v.v.)
create or replace function private.audit_row()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_before jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) - 'updated_at' - 'search_name' end;
  v_after  jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) - 'updated_at' - 'search_name' end;
  v_row    jsonb := coalesce(v_after, v_before);
  v_branch_id uuid := nullif(v_row ->> 'branch_id', '')::uuid;
begin
  if tg_op = 'UPDATE' and v_before = v_after then
    return null;                                   -- không có thay đổi thật
  end if;

  if v_branch_id is null then
    -- Nếu entity là guests hoặc liên quan đến guest, thử lấy last_branch_id của khách
    if tg_table_name in ('guests', 'guest_documents', 'guest_notes', 'guest_flags', 'guest_consents') then
      select s.last_branch_id into v_branch_id
      from public.guest_stats s
      where s.guest_id = nullif(coalesce(v_row ->> 'id', v_row ->> 'guest_id'), '')::uuid;
    end if;

    -- Nếu vẫn null, gán theo cơ sở mà actor phụ trách
    if v_branch_id is null then
      select branch_id into v_branch_id
      from public.user_roles
      where user_id = (select auth.uid()) and branch_id is not null
      limit 1;
    end if;
  end if;

  insert into public.audit_logs (actor_id, branch_id, action, entity, entity_id, before, after)
  values ((select auth.uid()),
          v_branch_id,
          lower(tg_op),
          tg_table_name,
          nullif(coalesce(v_row ->> 'id', v_row ->> 'guest_id', v_row ->> 'stay_id'), '')::uuid,
          v_before,
          v_after);
  return null;
end $$;

-- 5. Cập nhật RPC get_guest_profile: Gán branch_id khi ghi audit log xem hồ sơ đầy đủ
create or replace function public.get_guest_profile(p_guest_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_g           public.guests%rowtype;
  v_full        boolean;
  v_branch_id   uuid;
  v_log_branch  uuid;
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
                         from public.source_channels sc where sc.id = v_g.source_channel_id)),
    'tier', case when private.has_perm('loyalty.view') then private.guest_tier(p_guest_id) end,
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
      select jsonb_agg(jsonb_build_object('id', c.id, 'full_name', c.full_name, 'times', c.n) order by c.n desc)
      from (
        select g2.id, g2.full_name, count(*) as n
        from public.stay_guests a
        join public.stay_guests o on o.stay_id = a.stay_id and o.guest_id <> a.guest_id
        join public.guests g2     on g2.id = o.guest_id and g2.merged_into is null
        where a.guest_id = p_guest_id
        group by g2.id, g2.full_name
        order by n desc limit 10) c), '[]'::jsonb),
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
      'propose_merge', private.has_perm('merge.propose'))
  );
end;
$function$;

-- 6. Backfill branch_id cho các bản ghi audit log cũ chưa có branch_id nhưng người thao tác có cơ sở cố định
update public.audit_logs a
   set branch_id = ur.branch_id
  from (
    select distinct on (user_id) user_id, branch_id
    from public.user_roles
    where branch_id is not null
  ) ur
 where a.branch_id is null and a.actor_id = ur.user_id;
