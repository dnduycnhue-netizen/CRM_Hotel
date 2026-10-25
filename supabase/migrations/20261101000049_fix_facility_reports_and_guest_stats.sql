-- Migration 49: Fix Facilities Reports (W09), Cancelled Stays Loyalty (C9), and Work Orders Seed Data
-- 1. Sửa RPC private.facility_kpis:
--    - MTTR không âm: w.status in ('done', 'closed') và w.completed_at >= w.reported_at
--    - completed count chỉ tính status in ('done', 'closed')
--    - by_category dùng LEFT JOIN assets & asset_categories, nhóm theo 'Chung / Khác' khi không gán tài sản,
--      và lọc w.completed_at thay vì w.reported_at để khớp chính xác 100% với card tổng chi phí
-- 2. Dọn dẹp dữ liệu Work Orders:
--    - Sửa WO #37 ([SEED QA] V10 W26): đặt completed_at = '2026-10-24 10:00:00+00' (sau reported_at)
--    - Sửa WO #20 ('Cửa sổ kẹt không đóng được'): đặt status = 'closed', closed_at = '2026-10-07 00:00:00+00'
-- 3. Xử lý C9:
--    - Chuyển 2 lượt ở của V9 KHÁCH 02 ('0902888005') sang 'cancelled' để kiểm chứng triệt để quy tắc lượt hủy không tính hạng/tích lũy
--    - Chạy lại private.refresh_guest_stats cho toàn bộ khách hàng

-- 1. Cập nhật private.facility_kpis
create or replace function private.facility_kpis(p_from date, p_to date, p_branches uuid[])
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with w as (
    select * from public.work_orders
    where branch_id = any (p_branches) and status <> 'cancelled'
  ), rng as (
    select ((p_from + time '00:00') at time zone 'Asia/Ho_Chi_Minh') as t0,
           ((p_to + 1 + time '00:00') at time zone 'Asia/Ho_Chi_Minh') as t1
  )
  select jsonb_build_object(
    'created',        (select count(*) from w, rng where w.reported_at >= t0 and w.reported_at < t1),
    'completed',      (select count(*) from w, rng where w.status in ('done', 'closed') and w.completed_at >= t0 and w.completed_at < t1),
    'avg_resolve_hours', (select round(avg(greatest(0, extract(epoch from w.completed_at - w.reported_at) / 3600))::numeric, 1)
                          from w, rng where w.kind <> 'preventive' and w.status in ('done', 'closed') and w.completed_at >= t0 and w.completed_at < t1 and w.completed_at >= w.reported_at),
    'on_time_rate',   (select round(100.0 * count(*) filter (where w.completed_at <= w.due_at) / nullif(count(*), 0), 1)
                       from w, rng where w.status in ('done', 'closed') and w.completed_at >= t0 and w.completed_at < t1 and w.due_at is not null),
    'total_cost',     (select coalesce(sum(w.total_cost), 0) from w, rng where w.completed_at >= t0 and w.completed_at < t1),
    'pm_due',         (select count(*) from w, rng where w.kind = 'preventive' and w.due_at >= t0 and w.due_at < t1),
    'pm_on_time_rate',(select round(100.0 * count(*) filter (where w.completed_at <= w.due_at) / nullif(count(*), 0), 1)
                       from w, rng where w.kind = 'preventive' and w.due_at >= t0 and w.due_at < t1),
    'blocked_room_nights', (select coalesce(sum(blocked), 0) from private.daily_facts(p_from, p_to, p_branches)),
    'by_category',    (select coalesce(jsonb_agg(jsonb_build_object('category', x.category_name, 'orders', x.n, 'cost', x.cost) order by x.cost desc, x.n desc), '[]'::jsonb)
                       from (
                         select coalesce(c.name, 'Chung / Khác') as category_name,
                                count(*) as n,
                                coalesce(sum(w.total_cost), 0) as cost
                         from w
                         left join public.assets a on a.id = w.asset_id
                         left join public.asset_categories c on c.id = a.category_id, rng
                         where w.completed_at >= t0 and w.completed_at < t1
                         group by coalesce(c.name, 'Chung / Khác')
                       ) x)
  );
$$;

-- 2. Dọn dẹp dữ liệu Work Orders
-- 2.1 WO #37 ([SEED QA] V10 W26): Sửa completed_at thành sau reported_at
update public.work_orders
set completed_at = '2026-10-24 10:00:00+00'
where id = '6cf4f4c9-db20-4568-aa88-a2f7aae465a3' or title = '[SEED QA] V10 W26';

-- 2.2 WO #20 ('Cửa sổ kẹt không đóng được'): Cập nhật status thành 'closed'
update public.work_orders
set status = 'closed',
    closed_at = coalesce(closed_at, completed_at, '2026-10-07 00:00:00+00')
where id = '86a101c6-7ab5-497e-8bd0-b826ffd446b4' or title = 'Cửa sổ kẹt không đóng được';

-- 3. Xử lý C9: Khách V9 KHÁCH 02 (0902888005)
-- Cập nhật 2 lượt ở sang 'cancelled' để kiểm chứng quy tắc loại bỏ lượt hủy khỏi hạng và tích lũy
update public.stays
set status = 'cancelled',
    cancel_reason = 'Khách hủy đặt phòng (Kiểm chứng quy tắc C9 - không tích lũy hạng cho lượt hủy)'
where id in ('1b2d1c71-d188-41cc-8dec-31165fed8236', 'ec97caf2-b20f-413f-807e-010ee4642449');

-- 4. Chạy lại refresh_guest_stats cho toàn bộ khách hàng
do $$
begin
  perform private.refresh_guest_stats(array(select id from public.guests));
end $$;
