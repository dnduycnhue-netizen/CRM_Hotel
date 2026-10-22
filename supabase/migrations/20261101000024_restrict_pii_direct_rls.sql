-- 20261101000024_restrict_pii_direct_rls.sql
-- Thắt chặt bảo vệ PII: Bỏ quyền SELECT trực tiếp trên bảng guest_documents
-- Mọi truy cập vào CCCD/Hộ chiếu bắt buộc phải qua RPC có che mặt nạ và ghi nhật ký kiểm toán

-- 1. Xóa policy đọc trực tiếp guest_documents
drop policy if exists read_documents on public.guest_documents;

-- 2. Thu hồi quyền SELECT trực tiếp trên guest_documents từ role ứng dụng
revoke select on public.guest_documents from authenticated;
revoke select on public.guest_documents from anon;

-- 3. Tạo View che mặt nạ giấy tờ (Masked Documents View) cho các truy vấn tra cứu thông thường
create or replace view public.guest_masked_documents as
select
  id,
  guest_id,
  doc_type,
  issuing_country,
  case
    when private.has_perm('guest.view_full') then doc_number
    else private.mask_doc(doc_number)
  end as doc_number,
  created_at
from public.guest_documents;

grant select on public.guest_masked_documents to authenticated;

-- Lễ tân và người dùng thông thường truy vấn PostgREST select * from guest_documents sẽ trả về 403 Forbidden.
