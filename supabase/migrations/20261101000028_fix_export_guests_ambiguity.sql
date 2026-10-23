-- Migration 20261101000028_fix_export_guests_ambiguity.sql
-- Khắc phục lỗi "column reference doc_number is ambiguous" và ép kiểu g.nationality::text trong hàm export_guests

create or replace function public.export_guests(p_reason text, p_limit int default 500)
returns table (
  id uuid,
  full_name text,
  gender text,
  dob date,
  phone text,
  email text,
  nationality text,
  tags text[],
  sales_name text,
  total_stays int,
  total_nights int,
  doc_number text,
  is_full boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_has_full boolean;
  v_limit int;
begin
  -- 1. Kiểm tra quyền export
  perform private.assert_perm('guest.export');

  -- 2. Kiểm tra lý do xuất file
  if length(trim(coalesce(p_reason, ''))) < 3 then
    raise exception 'Cần nhập lý do xuất dữ liệu khách hàng (tối thiểu 3 ký tự)' using errcode = 'P0400';
  end if;

  v_has_full := private.has_perm('guest.export_full');
  v_limit := least(greatest(coalesce(p_limit, 500), 1), 2000);

  -- 3. Ghi log kiểm toán thông qua private.log_event
  perform private.log_event(
    'guest.export_excel',
    'guests',
    null,
    null,
    jsonb_build_object(
      'reason', p_reason,
      'has_full_perm', v_has_full,
      'requested_limit', v_limit
    )
  );

  -- 4. Trả về bảng dữ liệu được che chắn
  return query
  select
    g.id,
    g.full_name,
    g.gender::text,
    g.dob,
    case
      when v_has_full then g.phone
      when length(g.phone) >= 7 then overlay(g.phone placing '****' from 4 for 4)
      else g.phone
    end as phone,
    g.email,
    g.nationality::text,
    g.tags,
    p.full_name as sales_name,
    coalesce(gs.total_stays, 0) as total_stays,
    coalesce(gs.total_nights, 0) as total_nights,
    case
      when v_has_full then gd.doc_num
      when length(gd.doc_num) >= 8 then overlay(gd.doc_num placing '******' from 4 for 6)
      when gd.doc_num is not null then '******' || right(gd.doc_num, 4)
      else null
    end as doc_number,
    v_has_full as is_full
  from public.guests g
  left join public.profiles p on p.id = g.sales_owner_id
  left join public.guest_stats gs on gs.guest_id = g.id
  left join lateral (
    select d.doc_number as doc_num from public.guest_documents d where d.guest_id = g.id order by (d.doc_type = 'cccd') desc, d.created_at desc limit 1
  ) gd on true
  where g.merged_into is null
  order by g.created_at desc
  limit v_limit;
end $$;

grant execute on function public.export_guests(text, int) to authenticated;
