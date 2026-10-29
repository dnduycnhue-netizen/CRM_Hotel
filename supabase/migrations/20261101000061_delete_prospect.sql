-- Migration 61: Thêm quyền và RPC xóa khách hàng tiềm năng B2B (delete_prospect)
-- ----------------------------------------------------------------------------------------------------

insert into public.permissions (key, module_key, kind, label, sort) values
  ('prospect.delete', 'prospects', 'write', 'Xóa khách hàng tiềm năng B2B', 346)
on conflict (key) do nothing;

-- Cấp quyền cho sales, receptionist, branch_manager, owner
insert into public.role_permissions (role_id, permission_key)
select r.id, 'prospect.delete'
from public.roles r
where r.key in ('sales', 'receptionist', 'branch_manager', 'owner')
on conflict do nothing;

select private.rebuild_all_permissions();

-- RPC xóa khách hàng tiềm năng
create or replace function public.delete_prospect(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_p public.tour_prospects%rowtype;
begin
  perform private.assert_perm('prospect.delete');

  select * into v_p from public.tour_prospects where id = p_id;
  if not found then
    raise exception 'Không tìm thấy khách tiềm năng' using errcode = 'P0404';
  end if;

  if v_p.converted_partner_id is not null or v_p.status = 'converted' then
    raise exception 'Không thể xóa khách tiềm năng đã chuyển đổi thành đối tác' using errcode = 'P0422';
  end if;

  -- Gỡ liên kết duplicate_of_id nếu có prospect khác đang trỏ vào
  update public.tour_prospects
     set duplicate_of_id = null
   where duplicate_of_id = p_id;

  -- Xóa bản ghi (bảng prospect_interactions tự động cascade on delete)
  delete from public.tour_prospects where id = p_id;

  return jsonb_build_object('success', true, 'id', p_id);
end;
$$;

grant execute on function public.delete_prospect(uuid) to authenticated;
