-- 20261101000025_guests_list_rpc.sql
-- Cung cấp RPC get_guests_list an toàn, che mặt nạ CCCD cho màn hình danh sách khách hàng
-- Thay thế hoàn toàn việc client gọi trực tiếp relation guest_documents

create or replace function public.get_guests_list(
  p_limit int default 50,
  p_sales_owner_id uuid default null,
  p_tag text default null
)
returns table (
  id uuid,
  full_name text,
  gender text,
  dob date,
  phone text,
  email text,
  tags text[],
  sales_owner_id uuid,
  sales_owner_name text,
  total_stays int,
  total_nights int,
  last_stay_at timestamptz,
  last_branch_name text,
  doc_number text,
  doc_type text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_perm('guest.search');

  return query
  select
    g.id,
    g.full_name,
    g.gender::text,
    g.dob,
    case
      when private.has_perm('guest.view_full') then g.phone
      when length(g.phone) >= 7 then overlay(g.phone placing '****' from 4 for 4)
      else g.phone
    end as phone,
    g.email,
    g.tags,
    g.sales_owner_id,
    p.full_name as sales_owner_name,
    coalesce(s.total_stays, 0) as total_stays,
    coalesce(s.total_nights, 0) as total_nights,
    s.last_stay_at,
    b.name as last_branch_name,
    case
      when private.has_perm('guest.view_full') then d.doc_number
      else private.mask_doc(d.doc_number)
    end as doc_number,
    d.doc_type::text
  from public.guests g
  left join public.profiles p on p.id = g.sales_owner_id
  left join public.guest_stats s on s.guest_id = g.id
  left join public.branches b on b.id = s.last_branch_id
  left join lateral (
    select gd.doc_number, gd.doc_type
    from public.guest_documents gd
    where gd.guest_id = g.id
    order by (gd.doc_type = 'cccd') desc, gd.created_at desc
    limit 1
  ) d on true
  where g.merged_into is null
    and (p_sales_owner_id is null or g.sales_owner_id = p_sales_owner_id)
    and (p_tag is null or p_tag = any(g.tags))
  order by g.created_at desc
  limit least(coalesce(p_limit, 50), 200);
end $$;

grant execute on function public.get_guests_list(int, uuid, text) to authenticated;
