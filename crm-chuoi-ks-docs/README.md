# CRM chuỗi khách sạn – Bộ tài liệu kỹ thuật (Giai đoạn 1, phiên bản 2)

> v2 (21/10/2026): áp phản hồi chủ đầu tư, thêm quản lý cơ sở vật chất (12) và báo cáo biểu đồ, so sánh cùng kỳ (13). Bảng thay đổi ở cuối `01-tong-quan-nghiep-vu.md`.

Hệ thống quản lý khách hàng và cơ sở vật chất nội bộ cho chuỗi 8 khách sạn (~200–300 phòng). Lễ tân nhập tay thông tin khách và lượt ở; hồ sơ khách dùng chung toàn chuỗi; sales tra cứu nhanh; kỹ thuật xử lý sự cố, bảo trì; chủ chuỗi xem báo cáo so sánh cùng kỳ, bật/tắt module và phân quyền động bằng checkbox. Vận hành phòng, giá, OTA, thanh toán vẫn nằm trên ezCloud (chưa tích hợp ở giai đoạn này).

**Stack:** Next.js 16 (App Router) trên Vercel · Supabase (Postgres, Auth, RLS, RPC) · TypeScript strict · Tailwind CSS + shadcn/ui · PWA.

## Đọc theo thứ tự

| # | File | Nội dung | Ai cần đọc |
| --- | --- | --- | --- |
| 0 | [AGENTS.md](AGENTS.md) | 15 luật bắt buộc khi viết code (cho người và AI agent) | Tất cả |
| 1 | [01-tong-quan-nghiep-vu.md](01-tong-quan-nghiep-vu.md) | Phạm vi, thuật ngữ, luồng nghiệp vụ | Tất cả |
| 2 | [02-kien-truc.md](02-kien-truc.md) | Kiến trúc, cấu trúc thư mục, quy tắc phụ thuộc giữa các tầng | Dev |
| 3 | [03-database.md](03-database.md) | Schema SQL đầy đủ, index, trigger, migration | Dev backend |
| 4 | [04-phan-quyen-dong.md](04-phan-quyen-dong.md) | Quyền động dạng checkbox, vai trò, module flags | Dev |
| 5 | [05-bao-mat.md](05-bao-mat.md) | RLS, bảo vệ dữ liệu CCCD, audit, checklist bảo mật | Dev, reviewer |
| 6 | [06-nghiep-vu-va-api.md](06-nghiep-vu-va-api.md) | RPC, Server Actions, validate, tìm kiếm | Dev |
| 7 | [07-giao-dien-va-pwa.md](07-giao-dien-va-pwa.md) | Màn hình, component, phím tắt, PWA cài trên điện thoại | Dev frontend |
| 8 | [08-hieu-nang.md](08-hieu-nang.md) | Ngân sách hiệu năng, index, caching | Dev |
| 9 | [09-quy-uoc-code-va-test.md](09-quy-uoc-code-va-test.md) | Quy ước code, kiểm thử, review | Dev |
| 10 | [10-trien-khai-van-hanh.md](10-trien-khai-van-hanh.md) | Môi trường, CI/CD, Vercel, Supabase, backup, giám sát | Dev, DevOps |
| 11 | [11-lo-trinh-backlog.md](11-lo-trinh-backlog.md) | Sprint, user story, tiêu chí nghiệm thu, quyết định đã chốt, câu hỏi mở | PM, dev |
| 12 | [12-co-so-vat-chat.md](12-co-so-vat-chat.md) | Tài sản, sự cố, khóa phòng, bảo trì định kỳ, kiểm tra, hồ sơ pháp lý | Dev, PM |
| 13 | [13-bao-cao-thong-ke.md](13-bao-cao-thong-ke.md) | Chỉ số, biểu đồ, so sánh cùng kỳ, số liệu nền, doanh thu tháng | Dev, PM |
| — | [seed/branches_rooms.sql](seed/branches_rooms.sql) | Dữ liệu khởi tạo 8 cơ sở, 240 phòng (từ file của CĐT) | Dev |

## Khởi động nhanh (máy dev)

```bash
# Yêu cầu: Node.js >= 20.9, pnpm, Docker (cho Supabase local), Supabase CLI
pnpm create next-app@latest crm-chuoi-ks --ts --tailwind --app --src-dir --use-pnpm
cd crm-chuoi-ks
pnpm add @supabase/supabase-js @supabase/ssr zod react-hook-form @hookform/resolvers server-only sonner date-fns date-fns-tz lucide-react exceljs
pnpm add -D supabase vitest @playwright/test @axe-core/playwright @biomejs/biome dependency-cruiser
pnpm dlx shadcn@latest init

pnpm supabase init
pnpm supabase start                 # in ra URL + publishable key + secret key local
# tạo các file migration theo bảng thứ tự ở 03 §3 (SQL nằm ở 03, 04, 05, 06)
pnpm supabase db reset              # chạy toàn bộ migration + seed
pnpm supabase gen types typescript --local > src/shared/db/types.ts
pnpm dev
```

## Trạng thái tài liệu

- Toàn bộ SQL trong 03–06, 12, 13 đã được chạy thử theo đúng thứ tự migration trên PostgreSQL 16 (giả lập schema `auth`, `storage`, `cron` của Supabase), kèm kịch bản kiểm thử theo từng vai trò: check-in có nguồn khách, nhập bù quá khứ và chống trùng thời gian, hủy trong 6 giờ, lễ tân xem đầy đủ và xuất Excel có giới hạn, sales thêm khách và chỉ xem đầy đủ khách mình phụ trách, quản lý không sửa được chủ chuỗi, chống leo quyền, module Chỉ xem, MFA, blacklist, gộp hồ sơ; phiếu sự cố + khóa phòng chặn check-in, vòng đời phiếu theo quyền, bảo trì định kỳ tự sinh phiếu, kiểm tra sinh phiếu, cảnh báo hết hạn; báo cáo KPI, chuỗi tuần, tháng dùng số liệu nền, khớp thứ 364 ngày, năm nhuận.
- Code TypeScript ở mức mẫu kiến trúc (khung, hàm domain, pattern). Hàm domain (`checkCccd`, `normalizeVnPhone`, `classifyQuery`) đã chạy thử.
- Khi dựng trên Supabase thật, chạy lại `supabase db reset` và Security Advisor để bắt khác biệt môi trường.

## Nguyên tắc vàng

1. Database là tuyến phòng thủ cuối: mọi quyền được kiểm tra lại bằng RLS / RPC, không chỉ ở giao diện.
2. Mọi bất biến nghiệp vụ (không cộng nhầm lượt ở, không trùng CCCD) nằm trong Postgres (constraint, RPC transaction).
3. Code chia theo **tính năng** (feature), mỗi tính năng tách **domain thuần / dữ liệu / hành động / giao diện**.
4. Dữ liệu CCCD là dữ liệu cá nhân: che mặc định, xem đầy đủ phải có quyền và bị ghi nhật ký.
5. Thêm chức năng mới = thêm module + khóa quyền + migration, không sửa lõi.
