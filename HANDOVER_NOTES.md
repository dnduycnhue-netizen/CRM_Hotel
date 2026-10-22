# TÀI LIỆU KẾ THỪA VÀ BÀN GIAO HỆ THỐNG (HANDOVER & CHANGELOG)
**Dự án:** CRM Chuỗi Khách Sạn (CRM Hotel Multi-Branch)  
**Ngày cập nhật:** 22/10/2026  
**Môi trường:** Production (`https://crm-hotel-five.vercel.app`)  
**Nhánh Git:** `main` (Commit `d26f994`)  
**Tác giả bàn giao:** Antigravity Pair-Programming Agent

---

## 1. Tổng quan dự án & Kiến trúc kỹ thuật

- **Framework:** Next.js 16.4.2 (App Router, Turbopack, React 19).
- **Backend / Database:** Supabase (PostgreSQL 15+ có Row-Level Security, RPC functions, Supabase Auth).
- **Quy tắc phát triển bắt buộc:** Tuân thủ triệt để [AGENTS.md](file:///Users/duyduong/Documents/code/CRM_Hotel/AGENTS.md):
  1. *Route mỏng:* `src/app/**` chỉ làm nhiệm vụ layout, ghép component và gọi dữ liệu qua Feature.
  2. *Feature độc lập:* Gói gọn trong `src/features/<feature>/`, chỉ expose API qua `index.ts`.
  3. *Kiểm tra quyền hai lớp:* Server Action gọi `requirePermission()` kết hợp Postgres RPC gọi `private.assert_perm_at()` hoặc RLS Policy.
  4. *Ghi dữ liệu một cửa:* Mọi thao tác ghi đi qua Server Actions (`actions.ts`). Tuyệt đối không gọi `supabase.from().insert/update/delete` từ Client Component.

---

## 2. Chi tiết 25 hạng mục đã khắc phục & tối ưu (QA-01 → QA-25)

Dưới đây là chi tiết mã lỗi từ đợt kiểm thử QA ngày 22/10/2026, nguyên nhân gốc rễ và giải pháp đã thực thi:

### Nhóm P0: Lỗi chặn nghiệp vụ & Bảo mật nghiêm trọng
| Mã QA | Vấn đề | Nguyên nhân & Giải pháp | File xử lý chính |
| :--- | :--- | :--- | :--- |
| **QA-01** | Check-in thất bại với lỗi RPC | Payload truyền vào RPC `check_in_guest` thiếu cấu trúc lồng `primary: { full_name, phone, ... }` và truyền trực tiếp mã code kênh thay vì UUID. Đã bóc tách cấu trúc object và tự động phân giải `source_channels` UUID. | `src/features/check-in/actions.ts` |
| **QA-02** | Nhân viên Sales & Kỹ thuật truy cập được màn hình Check-in | Thiếu kiểm tra quyền ở cấp độ Route. Đã cấu hình xác thực tại Proxy/Middleware và gọi `requirePermission('stay.create')` trực tiếp trên trang `/check-in`. | `src/proxy.ts`<br>`src/app/(app)/check-in/page.tsx` |
| **QA-03** | Quản lý có thể sửa thông tin Chủ chuỗi và tự nâng quyền | Thiếu cơ chế kiểm soát vai trò mục tiêu. Đã chặn người dùng không phải Owner gán vai trò Owner, chặn sửa tài khoản Owner, và khóa cứng ma trận phân quyền hệ thống. | `src/features/admin/actions.ts` |
| **QA-04** | Lộ số điện thoại và CCCD của khách hàng khi hiển thị và xuất file | Dữ liệu nhạy cảm hiển thị dạng rõ. Đã áp dụng mặt nạ (masking `090****123`, `090******789`), chỉ cho phép xem/xuất dữ liệu rõ khi có quyền `guest.export_full`. Ẩn nút xuất với Sales. | `src/features/guests/actions.ts`<br>`src/features/guests/components/guest-list-table.tsx` |
| **QA-05** | Mật khẩu tài khoản thử nghiệm bị lộ trong JS client bundle | Mảng `DEV_ACCOUNTS` chứa trường `password` dạng plain-text trên form đăng nhập. Đã gỡ bỏ toàn bộ mật khẩu khỏi code, các nút gợi ý chỉ tự động điền Email trong môi trường dev. | `src/features/auth/components/login-form.tsx` |

---

### Nhóm P1: Sai lệch dữ liệu & Thiếu chức năng nghiệp vụ
| Mã QA | Vấn đề | Nguyên nhân & Giải pháp | File xử lý chính |
| :--- | :--- | :--- | :--- |
| **QA-06** | Màn hình Khách Đang Ở bị crash | Query SQL gọi cột không tồn tại `source_channel`. Đã sửa quan hệ join PostgREST thành `source_channel_id, source_channels(name)`. | `src/features/stays/data/queries.ts` |
| **QA-07** | Tra cứu khách khi check-in bị lỗi tham số | Hàm RPC `lookup_for_checkin` yêu cầu đúng thứ tự `(p_branch, p_kind, p_value)`. Đã chuẩn hóa thứ tự gọi và xử lý dữ liệu trả về `match`. | `src/features/check-in/actions.ts` |
| **QA-08** | Danh sách Phiếu công việc CSVC trống trơn | Mặc định bộ lọc cơ sở chọn chi nhánh cụ thể thay vì toàn chuỗi. Đã chuyển bộ lọc mặc định sang `'all'`. | `src/features/facilities/components/work-orders-table.tsx` |
| **QA-09** | Khách bị cắm cờ Blacklist không có luồng gỡ cờ | Thiếu màn hình quản lý cờ vi phạm. Đã bổ sung tab "Cờ cảnh báo (Blacklist)" trong Trung tâm phê duyệt và modal gỡ cờ kèm lý do kiểm toán (`removeFlagAction`). | `src/features/approvals/components/active-flags-table.tsx`<br>`src/features/approvals/components/approvals-hub.tsx` |
| **QA-10** | Nút "Đăng xuất" không hoạt động | Menu không gọi endpoint hủy phiên làm việc. Đã xây dựng route `GET /logout` dọn sạch cookie xác thực và chuyển hướng về `/login`. | `src/app/logout/route.ts` |
| **QA-11** | Dropdown menu góc phải bị crash giao diện | Xung đột thư viện `@base-ui/react` do bọc `DropdownMenuLabel` không đúng vị trí. Đã thay thế bằng phần tử tử `div` tiêu chuẩn. | `src/components/layout/app-header.tsx` |
| **QA-12** | Danh mục khách sạn thiếu SĐT/Địa chỉ & không có nút Thêm mới | Bảng cơ sở không có form nhập. Đã bổ sung modal Thêm/Sửa cơ sở và cập nhật schema migration `20261101000022_update_branches_catalog.sql`. | `src/features/admin/components/branches-table.tsx` |
| **QA-13** | Không có trang chỉnh sửa hồ sơ khách hàng | Thiếu route `/guests/[id]/edit`. Đã xây dựng trang chỉnh sửa hồ sơ và tích hợp Server Action `updateGuestAction`. | `src/app/(app)/guests/[id]/edit/page.tsx`<br>`src/features/guests/components/edit-guest-form.tsx` |
| **QA-14** | Check-in lùi ngày và thông báo lỗi tiếng Việt | Hỗ trợ ghi nhận `check_in_at` và `checked_out_at` thực tế; ánh xạ các mã lỗi Postgres sang tiếng Việt thân thiện (`ROOM_OCCUPIED`, `DUPLICATE_PHONE`, `BLACKLIST_ACK_REQUIRED`). | `src/features/check-in/actions.ts` |
| **QA-15** | Báo cáo KPI không phản ánh đúng lượt ở thực tế | Báo cáo tính toán từ mock data. Đã chuyển sang gọi trực tiếp RPC `report_kpis` từ database theo chi nhánh được chọn. | `src/features/stays/data/queries.ts` |
| **QA-16** | Avatar & chức danh nhân viên hiển thị chưa chuẩn | Ký tự viết tắt vai trò (CC, QL, LT, KD, KT) được tính toán chính xác từ tài khoản đăng nhập; cơ sở đang chọn được lưu vào Cookie để duy trì trạng thái. | `src/components/layout/app-header.tsx`<br>`src/components/layout/branch-selector.tsx` |
| **QA-17** | Kỹ thuật viên không xem được danh sách phòng | Bảng `rooms` thiếu policy RLS cho quyền `facility.view` / `wo.create`. Đã tạo migration `20261101000021_rooms_facilities_rls.sql` cấp quyền đọc phòng cho đội CSVC. | `supabase/migrations/20261101000021_rooms_facilities_rls.sql` |
| **QA-18** | Đăng nhập xong tự động nhảy vào `/check-in` | Đã thay đổi logic redirect tại trang chủ (`/`) để điều hướng thông minh theo vai trò: Owner/Manager -> `/reports`, Kỹ thuật -> `/facilities/work-orders`, Sales -> `/guests`, Lễ tân -> `/check-in`. | `src/app/page.tsx` |

---

### Nhóm P2: Tối ưu UI/UX & Chuẩn hóa trải nghiệm người dùng
| Mã QA | Vấn đề | Giải pháp | File xử lý chính |
| :--- | :--- | :--- | :--- |
| **QA-19** | Loại phòng 201, 305, 402 hiển thị sai loại phòng chuẩn | Chuẩn hóa tên loại phòng: 201 Deluxe King, 305 Executive Suite, 402 Standard Twin. | `src/features/stays/data/queries.ts` |
| **QA-20** | Cập nhật đầy đủ thông tin 8 chi nhánh | Cập nhật số hotline CSKH và địa chỉ thực tế của toàn bộ 8 khách sạn trong chuỗi. | `supabase/migrations/20261101000022_update_branches_catalog.sql` |
| **QA-21** | Hoàn thiện Modal quản lý chi nhánh | Thêm tính năng cấu hình giờ chuyển đêm (`night_cutoff`) và giờ trả phòng mặc định (`default_checkout_time`). | `src/features/admin/components/branches-table.tsx` |
| **QA-22** | Thiếu tính năng tạo kế hoạch bảo dưỡng định kỳ | Bổ sung form tạo kế hoạch PM Plan và Server Action `createPmPlanAction`. | `src/features/facilities/components/maintenance-hub.tsx`<br>`src/features/facilities/actions.ts` |
| **QA-23** | Câu chữ "Xác thực 2 lớp (RPC)" gây hiểu nhầm | Đổi thành "Kiểm tra kép Server & RPC" để diễn đạt đúng cơ chế kiểm soát bảo mật. | `src/features/approvals/components/approvals-hub.tsx` |
| **QA-24** | Nút "Tạo lượt ở" vẫn hiện với nhân viên Sales | Ẩn nút trên màn hình hồ sơ khách nếu người dùng không sở hữu quyền `stay.create`. | `src/features/guests/components/guest-profile-view.tsx` |
| **QA-25** | Kiểm tra toàn diện hệ thống | Thực thi `pnpm typecheck`, `pnpm test`, `pnpm build` đạt chuẩn 100%. | Toàn bộ codebase |

---

## 3. Danh sách các tài khoản kiểm thử tiêu chuẩn (Test Accounts)

Tất cả tài khoản dùng chung mật khẩu thiết lập trong môi trường kiểm thử:

| STT | Vai trò | Email đăng nhập | Phạm vi | Quyền hạn chính |
| :---: | :--- | :--- | :--- | :--- |
| 1 | **Chủ chuỗi (Owner)** | `duy.duong@hotel.vn` / `owner@hotel.vn` | Toàn chuỗi (8 KS) | Toàn quyền quản trị, sửa ma trận vai trò, phê duyệt blacklist |
| 2 | **Quản lý Boutique** | `quanly.boutique@hotel.vn` | KS Boutique | Xem báo cáo doanh thu, duyệt chiết khấu, quản lý phòng/nhân viên |
| 3 | **Lễ tân Boutique** | `letan.boutique@hotel.vn` | KS Boutique | Check-in, check-out, tra cứu khách, quản lý lượt ở đang có |
| 4 | **Lễ tân Grand** | `letan.grand@hotel.vn` | KS Grand | Thao tác độc lập tại cơ sở Grand |
| 5 | **Kinh doanh (Sales)** | `sales@hotel.vn` | Toàn chuỗi | Xem khách hàng phụ trách, ghi chú sở thích, không được check-in |
| 6 | **Kỹ thuật CSVC** | `kythuat@hotel.vn` | Toàn chuỗi | Xử lý phiếu công việc, khóa phòng bảo trì (OOO), tạo PM Plan |

---

## 4. Hướng dẫn vận hành & Lệnh bảo trì

```bash
# 1. Khởi động môi trường phát triển cục bộ
pnpm dev

# 2. Kiểm tra lỗi kiểu dữ liệu TypeScript (Luôn đảm bảo 0 errors trước khi commit)
pnpm typecheck

# 3. Chạy toàn bộ Unit Tests với Vitest
pnpm test

# 4. Kiểm tra Build sản xuất
pnpm build

# 5. Triển khai Production lên Vercel
vercel --prod --yes
```

---

## 5. Nhật ký thực thi các Phase nâng cấp lớn (2026)

### Phase P0: Bảo mật toàn diện (Nhánh `phase/p0-security`) - ĐÃ HOÀN THÀNH
- **P0.1**: Loại bỏ toàn bộ tài khoản/mật khẩu thật khỏi file test E2E (`e2e/audit.spec.ts`), thiết lập `.env.e2e.example` và `docs/HUMAN_TODO.md`.
- **P0.2**: Loại bỏ email thật khỏi JS client bundle; tách `dev-account-picker.tsx` chỉ tải động trong `process.env.NODE_ENV === 'development'`.
- **P0.3**: Viết lại `src/proxy.ts` kiểm tra quyền theo `my_access()`, chặn truy cập theo whitelist route (deny by default).
- **P0.4**: Migration `20261101000023_secure_exports_and_admin_rpc.sql` (thu hồi quyền export của Lễ tân, tạo RPC `export_guests`, `save_branch`, chặn sửa Owner và ma trận vai trò, chuyển Server Actions qua RPC).
- **P0.5**: Migration `20261101000024_restrict_pii_direct_rls.sql` & `20261101000025_guests_list_rpc.sql` (thu hồi SELECT trực tiếp trên `guest_documents`, tạo view `guest_masked_documents` và RPC `get_guests_list` che mặt nạ PII).

### Phase P1: Sửa lỗi Nghiệp vụ & Trải nghiệm (Nhánh `phase/p1-fixes`) - ĐÃ HOÀN THÀNH
- **P1.1 (Check-in khách cũ)**: Xử lý triệt để lỗi "Dữ liệu không hợp lệ" do submit số CCCD masked (`*`). 
  - Giao diện `check-in-form.tsx` hiển thị badge "Đã lưu hồ sơ (bảo mật)" và chỉ submit số mới khi người dùng chủ động sửa.
  - `actions.ts` và `schemas.ts` tự động bỏ qua chuỗi mask để giữ nguyên dữ liệu gốc trong Postgres.
- **P1.2 (Trả phòng & Hủy phòng)**: 
  - Migration `20261101000026_checkout_stay_rpc.sql` tạo RPC `checkout_stay` với kiểm tra phân quyền hai lớp, tự động giải phóng phòng và ghi nhật ký kiểm toán `stay.checkout`.
  - Cập nhật `stays/actions.ts` ánh xạ mã lỗi chi tiết tiếng Việt (đã trả phòng, đã hủy phòng, không tìm thấy).
- **P1.3 (Chuẩn hóa Múi giờ Việt Nam)**:
  - Tạo module `src/shared/utils/date.ts` với các hàm `formatDateTimeVN`, `formatDateVN`, `toVnTimestamptz`. Đã có bộ test Vitest 100% bao quát khoảnh khắc giao thoa nửa đêm (23:59 và 00:01).
  - Áp dụng vào `in-house-table.tsx`, `audit-table.tsx`, `check-in/actions.ts`.
- **P1.4 (Chặn ngập Audit Log)**:
  - Đặt `prefetch={false}` cho các `<Link href={"/guests/[id]"}>` trong bảng danh sách khách hàng (`guest-list-table.tsx`). Chỉ kích hoạt RPC `get_guest_profile` và ghi audit `guest.view_full` khi người dùng chủ động bấm xem chi tiết.
- **P1.5 (PWA Icons & Service Worker)**:
  - Tự động sinh bộ icon PNG chuẩn PWA trong `public/icons/`: `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`.
  - Nâng cấp `public/sw.js` sử dụng `Promise.allSettled`, loại bỏ nguy cơ crash cài đặt Service Worker.
- **P1.6 (Thay thế Dialog chuẩn shadcn)**:
  - Loại bỏ hoàn toàn `window.confirm` và `window.prompt` trong `in-house-table.tsx`.
  - Thay bằng `Dialog` shadcn cho trả phòng và hủy phòng, có ô nhập lý do hủy bắt buộc (>= 5 ký tự) phục vụ kiểm toán.

---

## 6. Lưu ý cho người bảo trì tiếp theo (Caveats & Best Practices)

1. **Next.js 16 Proxy Convention:** Trong phiên bản này, Next.js sử dụng `src/proxy.ts` (thay thế cho `middleware.ts`). Không tạo đồng thời hai file này để tránh lỗi xung đột build Turbopack.
2. **PostgREST Query Typing:** Khi thực hiện `.insert()` hoặc `.update()` trên các bảng chưa sinh đủ type quan hệ hai chiều, hãy cast `(supabase.from('table_name') as any)` để tránh lỗi `SelectQueryError<"Invalid Relationships...">`.
3. **Audit Log:** Mọi hành vi xuất dữ liệu khách (`guest.export_excel`), gỡ cờ Blacklist (`flag.resolve`), trả phòng (`stay.checkout`), thay đổi quyền quản trị đều phải ghi nhận log vào bảng `audit_logs` thông qua RPC `log_event`.
4. **Múi giờ:** Mọi chuỗi ngày giờ từ client gửi lên DB phải chuẩn hóa qua `toVnTimestamptz()` để luôn mang múi giờ `+07:00`. Khi hiển thị luôn dùng `formatDateTimeVN()`.

