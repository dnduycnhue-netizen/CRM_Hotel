-- 20261101000013_reports.sql

-- Số liệu tháng nhập tay: trước ngày chạy thật dùng làm số nền (lượt đến, đêm phòng...),
-- sau ngày chạy thật chỉ dùng cột doanh thu.
create table public.branch_monthly_figures (
  branch_id             uuid not null references public.branches(id),
  month                 date not null check (extract(day from month) = 1),
  arrivals              int check (arrivals >= 0),
  guests                int check (guests >= 0),
  room_nights           int check (room_nights >= 0),
  available_room_nights int check (available_room_nights > 0),
  room_revenue          numeric(16, 0) check (room_revenue >= 0),
  other_revenue         numeric(16, 0) check (other_revenue >= 0),
  note                  text,
  entered_by            uuid references public.profiles(id),
  entered_at            timestamptz not null default now(),
  primary key (branch_id, month),
  check (room_nights is null or available_room_nights is null or room_nights <= available_room_nights)
);

-- Ngày lễ, Tết, sự kiện để đánh dấu trên biểu đồ (branch_id null = toàn chuỗi)
create table public.calendar_events (
  id        uuid primary key default gen_random_uuid(),
  name      text not null,
  kind      text not null default 'holiday' check (kind in ('holiday', 'festival', 'event', 'other')),
  starts_on date not null,
  ends_on   date not null,
  branch_id uuid references public.branches(id),
  check (ends_on >= starts_on)
);
create index calendar_events_range_idx on public.calendar_events(starts_on, ends_on);

alter table public.branch_monthly_figures enable row level security;
alter table public.calendar_events enable row level security;
revoke all on public.branch_monthly_figures, public.calendar_events from anon;

create policy read_branch on public.branch_monthly_figures for select to authenticated
  using (private.has_perm('revenue.view', branch_id) or private.has_perm('revenue.input', branch_id));
create policy write_branch on public.branch_monthly_figures for insert to authenticated
  with check (private.has_perm('revenue.input', branch_id));
create policy update_branch on public.branch_monthly_figures for update to authenticated
  using (private.has_perm('revenue.input', branch_id)) with check (private.has_perm('revenue.input', branch_id));
create policy read_all on public.calendar_events for select to authenticated using (true);
create policy write_events on public.calendar_events for insert to authenticated
  with check (private.has_perm('report.view_chain'));
create policy update_events on public.calendar_events for update to authenticated
  using (private.has_perm('report.view_chain')) with check (private.has_perm('report.view_chain'));

create trigger branch_monthly_figures_audit after insert or update or delete on public.branch_monthly_figures
  for each row execute function private.audit_row();

-- Cơ sở người dùng được xem báo cáo (giao với danh sách yêu cầu)
create or replace function private.report_scope(p_branch_ids uuid[])
returns uuid[] language plpgsql stable security definer set search_path = '' as $$
declare
  v uuid[];
begin
  if private.has_perm('report.view_chain') then
    v := array(select b.id from public.branches b where p_branch_ids is null or b.id = any (p_branch_ids));
  else
    v := array(select x from private.branches_with('report.view_branch') x
               where p_branch_ids is null or x = any (p_branch_ids));
  end if;
  if coalesce(array_length(v, 1), 0) = 0 then
    raise exception 'forbidden: report' using errcode = 'P0403';
  end if;
  return v;
end $$;

create or replace function private.compare_range(p_from date, p_to date, p_mode text)
returns table (c_from date, c_to date) language sql immutable set search_path = '' as $$
  select case p_mode when 'previous_period' then p_from - (p_to - p_from + 1)
                     when 'same_period_ly'  then (p_from - interval '1 year')::date
                     when 'same_weekday_ly' then p_from - 364 end,
         case p_mode when 'previous_period' then p_from - 1
                     when 'same_period_ly'  then (p_to - interval '1 year')::date
                     when 'same_weekday_ly' then p_to - 364 end
  where p_mode in ('previous_period', 'same_period_ly', 'same_weekday_ly');
$$;

-- Bảng sự kiện theo ngày × cơ sở: nền tảng của mọi báo cáo khách/lưu trú
create or replace function private.daily_facts(p_from date, p_to date, p_branches uuid[])
returns table (
  branch_id uuid, d date, rooms int, blocked int, room_nights int, arrivals int, arrival_nights int,
  guests int, new_guests int, returning_guests int, cross_branch_guests int, cancellations int
)
language sql stable security definer set search_path = '' as $$
  with days as (
    select b.id as branch_id, gs::date as d
    from public.branches b
    cross join generate_series(p_from, p_to, interval '1 day') gs
    where b.id = any (p_branches)
  ),
  inv as (
    select dd.branch_id, dd.d, count(r.id)::int as rooms
    from days dd
    join public.rooms r on r.branch_id = dd.branch_id
     and (r.opened_on is null or r.opened_on <= dd.d)
     and (r.closed_on is null or r.closed_on > dd.d)
    group by dd.branch_id, dd.d
  ),
  blk as (   -- phòng bị khóa lúc 20:00 của đêm đó
    select dd.branch_id, dd.d, count(distinct rb.room_id)::int as blocked
    from days dd
    join public.room_blocks rb on rb.branch_id = dd.branch_id
     and rb.starts_at <= ((dd.d + time '20:00') at time zone 'Asia/Ho_Chi_Minh')
     and ((dd.d + time '20:00') at time zone 'Asia/Ho_Chi_Minh')
         < least(coalesce(rb.ends_at, 'infinity'), coalesce(rb.released_at, 'infinity'))
    group by dd.branch_id, dd.d
  ),
  base as (
    select s.* from public.stays s
    where s.branch_id = any (p_branches)
      and s.business_date <= p_to
      and s.business_date + s.nights - 1 >= p_from
  ),
  rn as (    -- mỗi lượt ở chiếm phòng các đêm business_date .. business_date + nights - 1
    select s.branch_id, s.business_date + k as d, count(*)::int as room_nights
    from base s cross join lateral generate_series(0, s.nights - 1) k
    where s.status <> 'cancelled'
    group by 1, 2
  ),
  arr as (
    select s.branch_id, s.business_date as d,
           count(*) filter (where s.status <> 'cancelled')::int as arrivals,
           coalesce(sum(s.nights) filter (where s.status <> 'cancelled'), 0)::int as arrival_nights,
           count(*) filter (where s.status = 'cancelled')::int as cancellations
    from base s
    where s.business_date between p_from and p_to
    group by 1, 2
  ),
  gv as (
    select s.branch_id, s.business_date as d,
           exists (select 1 from public.stay_guests sg2 join public.stays s2 on s2.id = sg2.stay_id
                   where sg2.guest_id = sg.guest_id and s2.status <> 'cancelled'
                     and (s2.business_date, s2.created_at) < (s.business_date, s.created_at)) as is_returning,
           exists (select 1 from public.stay_guests sg2 join public.stays s2 on s2.id = sg2.stay_id
                   where sg2.guest_id = sg.guest_id and s2.status <> 'cancelled' and s2.branch_id <> s.branch_id
                     and (s2.business_date, s2.created_at) < (s.business_date, s.created_at)) as is_cross
    from base s join public.stay_guests sg on sg.stay_id = s.id
    where s.status <> 'cancelled' and s.business_date between p_from and p_to
  ),
  g as (
    select branch_id, d, count(*)::int as guests,
           count(*) filter (where not is_returning)::int as new_guests,
           count(*) filter (where is_returning)::int as returning_guests,
           count(*) filter (where is_cross)::int as cross_branch_guests
    from gv group by 1, 2
  )
  select dd.branch_id, dd.d,
         coalesce(inv.rooms, 0), coalesce(blk.blocked, 0), coalesce(rn.room_nights, 0),
         coalesce(arr.arrivals, 0), coalesce(arr.arrival_nights, 0),
         coalesce(g.guests, 0), coalesce(g.new_guests, 0), coalesce(g.returning_guests, 0),
         coalesce(g.cross_branch_guests, 0), coalesce(arr.cancellations, 0)
  from days dd
  left join inv on inv.branch_id = dd.branch_id and inv.d = dd.d
  left join blk on blk.branch_id = dd.branch_id and blk.d = dd.d
  left join rn  on rn.branch_id  = dd.branch_id and rn.d  = dd.d
  left join arr on arr.branch_id = dd.branch_id and arr.d = dd.d
  left join g   on g.branch_id   = dd.branch_id and g.d   = dd.d;
$$;

-- Gộp các dòng daily_facts thành bộ chỉ số
create or replace function private.kpi_json(
  p_arrivals bigint, p_arrival_nights bigint, p_guests bigint, p_new bigint, p_returning bigint,
  p_cross bigint, p_cancel bigint, p_room_nights bigint, p_rooms bigint, p_blocked bigint)
returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object(
    'arrivals', p_arrivals, 'guests', p_guests, 'room_nights', p_room_nights,
    'available_room_nights', p_rooms - p_blocked, 'blocked_room_nights', p_blocked,
    'occupancy', round(100.0 * p_room_nights / nullif(p_rooms - p_blocked, 0), 1),
    'alos', round(p_arrival_nights::numeric / nullif(p_arrivals, 0), 2),
    'new_guests', p_new, 'returning_guests', p_returning, 'cross_branch_guests', p_cross,
    'returning_rate', round(100.0 * p_returning / nullif(p_guests, 0), 1),
    'cancellations', p_cancel,
    'cancel_rate', round(100.0 * p_cancel / nullif(p_arrivals + p_cancel, 0), 1));
$$;

create or replace function private.kpi_totals(p_from date, p_to date, p_branches uuid[])
returns jsonb language sql stable security definer set search_path = '' as $$
  select private.kpi_json(sum(arrivals), sum(arrival_nights), sum(guests), sum(new_guests), sum(returning_guests),
                          sum(cross_branch_guests), sum(cancellations), sum(room_nights), sum(rooms), sum(blocked))
  from private.daily_facts(p_from, p_to, p_branches);
$$;

create or replace function private.go_live_date()
returns date language sql stable security definer set search_path = '' as $$
  select coalesce((select (value #>> '{}')::date from public.app_settings where key = 'app.go_live_date'), '2000-01-01');
$$;

-- Thẻ chỉ số + phân rã theo cơ sở, kênh, quốc tịch, có kỳ so sánh
create or replace function public.report_kpis(
  p_from date, p_to date, p_branch_ids uuid[] default null, p_compare text default 'same_period_ly')
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_br  uuid[];
  v_cf  date;
  v_ct  date;
  v_cov numeric;
begin
  if p_to < p_from or p_to - p_from > 731 then
    raise exception 'invalid range' using errcode = 'P0422';
  end if;
  v_br := private.report_scope(p_branch_ids);
  select c_from, c_to into v_cf, v_ct from private.compare_range(p_from, p_to, p_compare);
  if v_cf is not null then
    v_cov := round(greatest(0, least(1, (v_ct - greatest(v_cf, private.go_live_date()) + 1)::numeric
                                        / (v_ct - v_cf + 1))), 2);
  end if;

  return jsonb_build_object(
    'range',         jsonb_build_object('from', p_from, 'to', p_to),
    'compare_range', case when v_cf is not null
                          then jsonb_build_object('from', v_cf, 'to', v_ct, 'mode', p_compare, 'coverage', v_cov) end,
    'current',       private.kpi_totals(p_from, p_to, v_br),
    'compare',       case when v_cf is not null then private.kpi_totals(v_cf, v_ct, v_br) end,
    'by_branch', (
      select jsonb_agg(jsonb_build_object(
               'branch_id', b.id, 'branch', b.name,
               'current', private.kpi_totals(p_from, p_to, array[b.id]),
               'compare', case when v_cf is not null then private.kpi_totals(v_cf, v_ct, array[b.id]) end)
             order by b.code)
      from public.branches b where b.id = any (v_br)),
    'by_channel', (
      select jsonb_agg(x order by (x ->> 'current')::int desc) from (
        select jsonb_build_object(
                 'channel', sc.name, 'kind', sc.kind,
                 'current', count(*) filter (where s.business_date between p_from and p_to),
                 'compare', count(*) filter (where v_cf is not null and s.business_date between v_cf and v_ct)) as x
        from public.stays s join public.source_channels sc on sc.id = s.source_channel_id
        where s.status <> 'cancelled' and s.branch_id = any (v_br)
          and (s.business_date between p_from and p_to
               or (v_cf is not null and s.business_date between v_cf and v_ct))
        group by sc.id, sc.name, sc.kind) t),
    'by_nationality', (
      select jsonb_agg(x) from (
        select jsonb_build_object('nationality', g.nationality, 'guests', count(*)) as x
        from public.stays s
        join public.stay_guests sg on sg.stay_id = s.id
        join public.guests g on g.id = sg.guest_id
        where s.status <> 'cancelled' and s.branch_id = any (v_br) and s.business_date between p_from and p_to
        group by g.nationality order by count(*) desc limit 10) t)
  );
end $$;

-- Chuỗi thời gian kỳ này + kỳ so sánh, khớp theo thứ tự nhóm (ngày/tuần/tháng)
create or replace function public.report_series(
  p_from date, p_to date, p_branch_ids uuid[] default null,
  p_grain text default 'day', p_compare text default 'same_period_ly')
returns table (idx int, bucket date, cmp_bucket date, cur jsonb, cmp jsonb)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_br uuid[];
  v_cf date;
  v_ct date;
begin
  if p_grain not in ('day', 'week', 'month') then
    raise exception 'invalid grain' using errcode = 'P0422';
  end if;
  if p_to < p_from or p_to - p_from > 731 then
    raise exception 'invalid range' using errcode = 'P0422';
  end if;
  v_br := private.report_scope(p_branch_ids);
  select c_from, c_to into v_cf, v_ct from private.compare_range(p_from, p_to, p_compare);

  return query
  with cur_b as (
    select date_trunc(p_grain, f.d)::date as b,
           private.kpi_json(sum(f.arrivals), sum(f.arrival_nights), sum(f.guests), sum(f.new_guests),
                            sum(f.returning_guests), sum(f.cross_branch_guests), sum(f.cancellations),
                            sum(f.room_nights), sum(f.rooms), sum(f.blocked)) as k
    from private.daily_facts(p_from, p_to, v_br) f
    group by 1
  ), cmp_b as (
    select date_trunc(p_grain, f.d)::date as b,
           private.kpi_json(sum(f.arrivals), sum(f.arrival_nights), sum(f.guests), sum(f.new_guests),
                            sum(f.returning_guests), sum(f.cross_branch_guests), sum(f.cancellations),
                            sum(f.room_nights), sum(f.rooms), sum(f.blocked)) as k
    from private.daily_facts(v_cf, v_ct, v_br) f
    where v_cf is not null
    group by 1
  ), c1 as (select row_number() over (order by b)::int as i, b, k from cur_b),
     c2 as (select row_number() over (order by b)::int as i, b, k from cmp_b)
  select c1.i, c1.b, c2.b,
         c1.k,
         case when c2.b is null or c2.b < date_trunc(p_grain, private.go_live_date())::date then null else c2.k end
  from c1 left join c2 on c2.i = c1.i
  order by c1.i;
end $$;

-- Báo cáo theo tháng của năm p_year và năm trước: dữ liệu hệ thống từ tháng chạy thật, số nền trước đó
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
begin
  return query
  with months as (
    select gs::date as m from generate_series(make_date(p_year - 1, 1, 1), make_date(p_year, 12, 1), interval '1 month') gs
  ),
  app as (
    select date_trunc('month', f.d)::date as m, f.branch_id,
           sum(f.arrivals) as arrivals, sum(f.room_nights) as room_nights, sum(f.rooms - f.blocked) as avail
    from private.daily_facts(greatest(make_date(p_year - 1, 1, 1), private.go_live_date()),
                             least(make_date(p_year, 12, 31), (now() at time zone 'Asia/Ho_Chi_Minh')::date),
                             v_br) f
    group by 1, 2
  ),
  per_branch as (
    select mo.m, b.id as branch_id,
           case when mo.m >= v_live then 'app' when fig.room_nights is not null then 'baseline' else 'none' end as src,
           case when mo.m >= v_live then app.arrivals else fig.arrivals end as arrivals,
           case when mo.m >= v_live then app.room_nights else fig.room_nights end as room_nights,
           case when mo.m >= v_live then app.avail else fig.available_room_nights end as avail,
           fig.room_revenue
    from months mo
    cross join unnest(v_br) b(id)
    left join app on app.m = mo.m and app.branch_id = b.id
    left join public.branch_monthly_figures fig on fig.branch_id = b.id and fig.month = mo.m
  )
  select pb.m,
         case when count(distinct pb.src) = 1 then min(pb.src) else 'mixed' end,
         sum(pb.arrivals)::bigint, sum(pb.room_nights)::bigint, sum(pb.avail)::bigint,
         round(100.0 * sum(pb.room_nights) / nullif(sum(pb.avail), 0), 1),
         case when v_rev then sum(pb.room_revenue) end,
         case when v_rev then round(sum(pb.room_revenue) / nullif(sum(pb.room_nights) filter (where pb.room_revenue is not null), 0), 0) end,
         case when v_rev then round(sum(pb.room_revenue) / nullif(sum(pb.avail) filter (where pb.room_revenue is not null), 0), 0) end
  from per_branch pb
  group by pb.m
  order by pb.m;
end $$;

-- Báo cáo cơ sở vật chất có so sánh
create or replace function private.facility_kpis(p_from date, p_to date, p_branches uuid[])
returns jsonb language sql stable security definer set search_path = '' as $$
  with w as (
    select * from public.work_orders
    where branch_id = any (p_branches) and status <> 'cancelled'
  ), rng as (
    select ((p_from + time '00:00') at time zone 'Asia/Ho_Chi_Minh') as t0,
           ((p_to + 1 + time '00:00') at time zone 'Asia/Ho_Chi_Minh') as t1
  )
  select jsonb_build_object(
    'created',        (select count(*) from w, rng where w.reported_at >= t0 and w.reported_at < t1),
    'completed',      (select count(*) from w, rng where w.completed_at >= t0 and w.completed_at < t1),
    'avg_resolve_hours', (select round(avg(extract(epoch from w.completed_at - w.reported_at) / 3600)::numeric, 1)
                          from w, rng where w.kind <> 'preventive' and w.completed_at >= t0 and w.completed_at < t1),
    'on_time_rate',   (select round(100.0 * count(*) filter (where w.completed_at <= w.due_at) / nullif(count(*), 0), 1)
                       from w, rng where w.completed_at >= t0 and w.completed_at < t1 and w.due_at is not null),
    'total_cost',     (select coalesce(sum(w.total_cost), 0) from w, rng where w.completed_at >= t0 and w.completed_at < t1),
    'pm_due',         (select count(*) from w, rng where w.kind = 'preventive' and w.due_at >= t0 and w.due_at < t1),
    'pm_on_time_rate',(select round(100.0 * count(*) filter (where w.completed_at <= w.due_at) / nullif(count(*), 0), 1)
                       from w, rng where w.kind = 'preventive' and w.due_at >= t0 and w.due_at < t1),
    'blocked_room_nights', (select coalesce(sum(blocked), 0) from private.daily_facts(p_from, p_to, p_branches)),
    'by_category', (select jsonb_agg(jsonb_build_object('category', c.name, 'orders', x.n, 'cost', x.cost) order by x.n desc)
                    from (select a.category_id, count(*) as n, sum(w.total_cost) as cost
                          from w join public.assets a on a.id = w.asset_id, rng
                          where w.reported_at >= t0 and w.reported_at < t1
                          group by a.category_id) x
                    join public.asset_categories c on c.id = x.category_id));
$$;

create or replace function public.report_facilities(
  p_from date, p_to date, p_branch_ids uuid[] default null, p_compare text default 'same_period_ly')
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_br uuid[];
  v_cf date;
  v_ct date;
begin
  if p_to < p_from or p_to - p_from > 731 then
    raise exception 'invalid range' using errcode = 'P0422';
  end if;
  v_br := private.report_scope(p_branch_ids);
  select c_from, c_to into v_cf, v_ct from private.compare_range(p_from, p_to, p_compare);
  return jsonb_build_object(
    'current', private.facility_kpis(p_from, p_to, v_br),
    'compare', case when v_cf is not null then private.facility_kpis(v_cf, v_ct, v_br) end,
    'compare_range', case when v_cf is not null then jsonb_build_object('from', v_cf, 'to', v_ct) end);
end $$;

do $$
declare fn text;
begin
  foreach fn in array array[
    'public.report_kpis(date, date, uuid[], text)',
    'public.report_series(date, date, uuid[], text, text)',
    'public.report_monthly(int, uuid[])',
    'public.report_facilities(date, date, uuid[], text)'
  ] loop
    execute format('revoke all on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end $$;
