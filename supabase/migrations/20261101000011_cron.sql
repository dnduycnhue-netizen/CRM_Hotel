-- 20261101000011_cron.sql
-- Cặp đã từng được đề xuất (dù đã duyệt hay từ chối) thì không đề xuất lại
create or replace function private.pair_seen(p_a uuid, p_b uuid)
returns boolean language sql stable set search_path = '' as $$
  select exists (
    select 1 from public.merge_requests m
    where least(m.keep_guest_id, m.drop_guest_id) = least(p_a, p_b)
      and greatest(m.keep_guest_id, m.drop_guest_id) = greatest(p_a, p_b));
$$;

create or replace function private.detect_duplicates()
returns void language sql security definer set search_path = '' as $$
  -- 1. Cùng tên không dấu + cùng ngày sinh
  insert into public.merge_requests (keep_guest_id, drop_guest_id, source, match_reason)
  select a.id, b.id, 'system', 'same_name_dob'
  from public.guests a
  join public.guests b on b.search_name = a.search_name and b.dob = a.dob and b.id > a.id
  where a.merged_into is null and b.merged_into is null and a.dob is not null
    and not private.pair_seen(a.id, b.id)
  on conflict do nothing;

  -- 2. CCCD lệch đúng 1 chữ số, cùng mã tỉnh
  insert into public.merge_requests (keep_guest_id, drop_guest_id, source, match_reason)
  select distinct a.guest_id, b.guest_id, 'system', 'cccd_one_digit'
  from public.guest_documents a
  join public.guest_documents b
    on b.doc_type = 'cccd' and left(b.doc_number, 3) = left(a.doc_number, 3)
   and b.guest_id > a.guest_id
   and extensions.levenshtein(a.doc_number, b.doc_number) = 1
  where a.doc_type = 'cccd'
    and not private.pair_seen(a.guest_id, b.guest_id)
  on conflict do nothing;
$$;

select cron.schedule('detect-duplicates', '0 20 * * *', $$select private.detect_duplicates()$$);      -- 03:00 giờ VN
select cron.schedule('rebuild-permissions', '30 20 * * *', $$select private.rebuild_all_permissions()$$);
select cron.schedule('rate-limit-cleanup', '*/30 * * * *',
  $$delete from private.rate_limits where window_start < now() - interval '1 hour'$$);
