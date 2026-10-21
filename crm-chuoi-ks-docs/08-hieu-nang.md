# 08 – Hiệu năng

## 1. Ngân sách (đo trên staging, mạng 4G Việt Nam)

| Chỉ số | Mục tiêu | Cách đo |
| --- | --- | --- |
| Tra cứu tại quầy (`lookup_for_checkin`) | p95 < 300 ms end-to-end | Log thời gian trong Server Action |
| Lưu check-in | p95 < 500 ms | Như trên |
| Tìm kiếm | p95 < 400 ms | Như trên |
| Mở hồ sơ 360° | LCP < 1,5 s (desktop), < 2,5 s (mobile 4G) | Vercel Speed Insights |
| JavaScript tải ban đầu mỗi route | < 150 KB gzip | `next build` output |
| RPC trong Postgres | p95 < 50 ms | `pg_stat_statements` (Supabase → Query Performance) |

## 2. Vị trí hạ tầng

- Supabase project ở **Southeast Asia (Singapore)** – `ap-southeast-1`.
- Vercel Functions đặt cùng vùng: `vercel.json` → `{ "regions": ["sin1"] }`.
- Mỗi query từ Function tới DB lúc này là một chặng ngắn trong cùng vùng; đặt lệch vùng sẽ nhân độ trễ lên theo số query mỗi trang.

## 3. Quy tắc tầng dữ liệu

1. **Một trang = một round-trip DB khi có thể.** Hồ sơ 360° dùng một RPC trả JSON hoàn chỉnh (`get_guest_profile`), không gọi 6 query riêng.
2. **Song song hoá** các truy vấn độc lập trong Server Component bằng `Promise.all`.
3. **Chỉ chọn cột cần dùng**; không `select('*')` trong code ứng dụng.
4. **Danh sách phân trang theo con trỏ** (`created_at, id`), không dùng `offset` lớn.
5. **`getSession()` bọc `cache()`** của React: mỗi request chỉ gọi `my_access` một lần.
6. **Không N+1:** cần dữ liệu liên quan thì join trong RPC/view.
7. **Index cho mọi cột lọc + mọi cột trong điều kiện RLS** (đã có trong 03, 04). Thêm bộ lọc mới thì xem `explain analyze` trước khi merge.

## 4. RLS nhanh

- Gói hàm trong subquery: `(select auth.uid())`, `branch_id in (select private.branches_with('stay.view'))` để Postgres tính một lần mỗi câu lệnh thay vì mỗi dòng.
- `user_effective_permissions` đã tính sẵn, tra bằng khóa chính.
- Bảng truy vấn nhiều (tìm kiếm, hồ sơ) đi qua RPC `SECURITY DEFINER` với kiểm tra quyền một lần ở đầu hàm, thay vì để RLS đánh giá trên từng dòng của nhiều bảng join.

## 5. Tìm kiếm

| Chế độ | Index dùng | Ghi chú |
| --- | --- | --- |
| SĐT chính xác | `guests_phone_uq` (btree) | Nhanh nhất |
| Đuôi SĐT / đuôi giấy tờ | GIN trigram trên `phone`, `doc_number` | Bắt buộc ≥ 4 / ≥ 6 ký tự để trigram có tác dụng |
| CCCD / Passport chính xác | unique `(doc_type, issuing_country, doc_number)` | |
| Email | `guests_email_idx` (tiền tố) | |
| Họ tên | GIN trigram trên `search_name` | Với < 200.000 hồ sơ, `LIKE ALL` theo từng từ chạy dưới 30 ms. Lớn hơn: chuyển sang toán tử `%` + `similarity` có ngưỡng |

Client: debounce 250 ms, huỷ request cũ bằng `AbortController`, không gửi khi < 2 ký tự.

## 6. Rendering và caching

- Mặc định mọi trang là **dynamic** (dữ liệu theo người dùng + RLS). Không bật cache cho dữ liệu khách.
- Danh mục ít đổi (cơ sở, phòng, module, quyền, đơn vị hành chính): đọc trong Server Component; với Next.js 16 có thể bật `cacheComponents` và dùng `"use cache"` **chỉ cho dữ liệu không phụ thuộc người dùng** như đơn vị hành chính; gọi `updateTag()` trong Server Action khi chỉnh sửa.
- Dùng `<Suspense>` để stream phần chậm (lịch sử lượt ở, ghi chú) sau phần đầu hồ sơ.
- Dropdown phường/xã: tải theo tỉnh đã chọn (≤ vài trăm dòng), không tải cả ~3.300 dòng.
- Bật `reactCompiler: true` sau khi đo build time chấp nhận được.

## 7. Bundle

- Thư viện nặng (xuất Excel `exceljs`) chỉ chạy phía server trong Route Handler `/api/export/guests`; client chỉ nhận file.
- Icon: `lucide-react` import từng icon.
- Component tương tác lớn (ma trận quyền, bảng nhật ký) dùng `next/dynamic` để tách chunk.
- Không đưa `@supabase/supabase-js` vào client bundle ngoài trang đăng nhập.

## 8. Quy mô dự kiến và điểm cần xem lại

| Mốc | Dấu hiệu | Việc cần làm |
| --- | --- | --- |
| ~35.000 lượt ở/năm, ~100.000 hồ sơ sau 2–3 năm | Bình thường | Không cần gì thêm, Supabase Pro + compute Micro đủ |
| `audit_logs` > 5 triệu dòng | Truy vấn nhật ký chậm | Partition theo tháng, chuyển log > 2 năm sang bảng lưu trữ |
| Nhiều chuỗi (SaaS) | > 1 triệu hồ sơ | Thêm `org_id`, index phức hợp `(org_id, ...)`, nâng compute, cân nhắc read replica |
| Job trùng hồ sơ > 1 phút | Levenshtein toàn bảng | Chỉ xét giấy tờ tạo trong 24h qua so với toàn bảng |
