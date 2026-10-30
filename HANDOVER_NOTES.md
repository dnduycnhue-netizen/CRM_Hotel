# TÀI LIỆU KẾ THỪA VÀ BÀN GIAO HỆ THỐNG (HANDOVER & CHANGELOG)
**Dự án:** CRM Chuỗi Khách Sạn (CRM Hotel Multi-Branch)  
**Ngày cập nhật:** 29/10/2026 (Go-Live Release & 5 Core Tasks Hoàn thiện)  
**Môi trường:** Production (`https://crm-hotel-five.vercel.app`)  
**Nhánh Git:** `main` (Commit `7bcf961` - Fix QA Vòng 19 & Triển khai Production chính thức)  
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

| STT | Vai trò | Email đăng nhập | Mật khẩu | Phạm vi | Quyền hạn chính |
| :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | **Chủ chuỗi (Owner)** | `dnduycnhue@gmail.com` | `Cy3ZcjXWBf-Qem.` | Toàn chuỗi (8 KS) | Toàn quyền quản trị, sửa ma trận vai trò, duyệt blacklist, xem toàn bộ báo cáo |
| 2 | **Quản lý Boutique** | `quanly.boutique@khachsan.vn` | `Hotel@2026!` | KS Boutique | Xem báo cáo cơ sở, duyệt cờ/gộp hồ sơ, quản lý phòng & tài sản, khóa phòng OOO |
| 3 | **Lễ tân Boutique** | `letan.boutique@khachsan.vn` | `Hotel@2026!` | KS Boutique | Check-in, check-out, tra cứu khách, quản lý khách đang ở In-House |
| 4 | **Lễ tân Grand** | `letan.grand@khachsan.vn` | `Hotel@2026!` | KS Grand | Thao tác độc lập tại cơ sở Grand (kiểm tra tính cách ly đa chi nhánh) |
| 5 | **Kinh doanh (Sales)** | `sales@khachsan.vn` | `Hotel@2026!` | Toàn chuỗi | Xem khách hàng phụ trách, ghi chú chăm sóc khách VIP, đề xuất gộp hồ sơ |
| 6 | **Kỹ thuật CSVC** | `kythuat@khachsan.vn` | `Hotel@2026!` | Toàn chuỗi | Xử lý phiếu sửa chữa, bảo dưỡng thiết bị, cập nhật chi phí, nghiệm thu mở phòng |

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

### Phase P2: Báo cáo Thống kê & Hoàn thiện Trải nghiệm (Nhánh `phase/p2-features`) - ĐÃ HOÀN THÀNH
- **P2.1 (Chuẩn hóa Báo cáo & Ngày kinh doanh)**:
  - Bổ sung `getVnDateString()`, `getVnDateRange()` vào `src/shared/utils/date.ts` đảm bảo tính toán ngày bắt đầu/kết thúc báo cáo cố định theo múi giờ Việt Nam (+07:00).
  - Tích hợp chuẩn hóa ngày giờ vào toàn bộ các queries báo cáo (`report_kpis`, `report_series`, `report_facilities`).
- **P2.2 (Bộ lọc Cơ sở & Khoảng ngày Báo cáo)**:
  - Thiết kế thanh **Filter Toolbar** trực quan trên Dashboard Báo cáo (`dashboard-overview.tsx`): hỗ trợ chọn nhanh 7 ngày qua, 30 ngày qua, Tháng này và chọn cơ sở (Toàn chuỗi hoặc từng khách sạn cụ thể).
  - Kết nối tham số `searchParams` (`branchId`, `from`, `to`, `preset`) với URL trên cả 2 trang `/reports` và `/reports/monthly`, dữ liệu tải lại tức thì kèm hiệu ứng loading mượt mà.
- **P2.3 (Quản trị Sales Phụ trách & Phân quyền)**:
  - Bổ sung toast feedback và xử lý trạng thái cho việc phân công/gỡ bỏ Sales phụ trách khách hàng trong `guest-profile-view.tsx`.
- **P2.4 (Tối ưu UI/UX & Loại bỏ hoàn toàn alert/confirm)**:
  - Thay thế toàn bộ hàm `alert(...)` và `confirm(...)` cũ khi xuất Excel (`guest-list-table.tsx`), thao tác ghi chú (`guest-profile-view.tsx`), và duyệt gộp hồ sơ (`merge-approval-card.tsx`).
- **P2.5 (Phê duyệt & Gỡ cờ Blacklist)**:
  - Khắc phục lỗi in `[object Object]` khi gỡ cờ Blacklist thất bại trong `active-flags-table.tsx` và `flags-approval-table.tsx`, ánh xạ `res.error.message` rõ ràng.

### Phase P3: Kiểm thử CSVC, Gộp hồ sơ & Báo cáo nâng cao (Nhánh `phase/p3-advanced`) - ĐÃ HOÀN THÀNH
- **P3.1 (Kiểm thử & Nâng cấp CSVC - Facilities)**:
  - Bổ sung `createAssetSchema`, `updateAssetStatusSchema` vào `src/features/facilities/schemas.ts` và bộ unit test Vitest (`schemas.test.ts`).
  - Viết Server Actions `createAssetAction`, `updateAssetStatusAction` hỗ trợ luân chuyển trạng thái tài sản (`in_use`, `under_repair`, `broken`, `in_storage`, `disposed`), tự động ghi nhận ngày thanh lý `disposed_on`.
  - Loại bỏ hoàn toàn `alert()` và `confirm()` native trong `work-orders-table.tsx` (nghiệm thu hoàn tất) và `room-blocks-table.tsx` (mở khóa buồng phòng OOO), thay bằng Dialog shadcn và Toast feedback Sonner.
  - Cập nhật `assets-table.tsx` với modal thay đổi trạng thái thiết bị trực tiếp và format ngày `formatDateVN`.
  - Khắc phục độ trễ múi giờ trong `src/features/facilities/data/alerts.ts` bằng `getVnDateString()`, tính toán hạn PCCC/ATTP chuẩn theo ngày kinh doanh Việt Nam.
- **P3.2 (Gộp hồ sơ khách hàng - Guest Merge)**:
  - Bổ sung `searchCandidateGuestsAction` và `proposeGuestMergeAction` trong `src/features/guests/actions.ts` kết nối an toàn với RPC `propose_merge`.
  - Tích hợp Modal "Đề xuất gộp hồ sơ" (`ProposeMergeModal`) vào `guest-profile-view.tsx` kèm nút kích hoạt bảo vệ theo quyền `merge.propose`, cho phép tìm kiếm hồ sơ trùng theo Tên/SĐT/Email và nhập lý do gộp.
  - Chuẩn hóa `merge-approval-card.tsx` với Toast thông báo, hiển thị ngày sinh `formatDateVN`, ngày tạo `formatDateTimeVN`, và xử lý thân thiện lỗi bảo mật MFA/AAL2 (`UNAUTHENTICATED`).
- **P3.3 (Báo cáo nâng cao CSVC & Kỹ thuật)**:
  - Xây dựng component `FacilitiesReportView` (`src/features/reports/components/facilities-report-view.tsx`) với 6 thẻ KPI (Sự cố phát sinh, Đúng hạn SLA %, MTTR thời gian khắc phục, Tổng chi phí bảo trì VNĐ, Hoàn thành định kỳ PM %, Đêm phòng OOO) và bảng phân tích cơ cấu chi phí kèm thanh tỷ trọng %.
  - Xây dựng route mỏng `src/app/(app)/reports/facilities/page.tsx` tuân thủ Luật 1 và Luật 2 của `AGENTS.md`, kết nối RPC `report_facilities` và bảo vệ phân quyền `facility.view` / `report.view_branch`.

### Phase P4: Cẩm nang Sử dụng & Bản vẽ Workflow Nghiệp vụ (SOP Hub) - ĐÃ HOÀN THÀNH
- **P4.1 (Feature Guide & Kiến trúc chuẩn AGENTS.md)**:
  - Khởi tạo `src/features/guide/` với Public API `index.ts`, types và bộ dữ liệu `guide-data.ts` chi tiết cho 5 vai trò, 4 quy trình nghiệp vụ cốt lõi, 6 modules hệ thống và FAQs.
  - Route mỏng `src/app/(app)/guide/page.tsx` kết nối giao diện trung tâm `GuideHub`.
- **P4.2 (Bản vẽ trực quan Workflow SOP)**:
  - Thành phần `WorkflowVisualizer` hiển thị sơ đồ tuần tự các bước (pipeline nodes) với nhãn chức danh thực hiện, nút mở trực tiếp màn hình nghiệp vụ tương ứng, số thứ tự bước, nội dung hành động, lưu ý bảo mật dữ liệu và khung hướng dẫn chi tiết từng bước khi tương tác.
  - Hỗ trợ 4 quy trình chuẩn khách sạn:
    1. `SOP-FO-01`: Đón tiếp, Check-in & Trả phòng In-House.
    2. `SOP-ENG-02`: Báo cáo sự cố CSVC, Sửa chữa & Khóa buồng phòng OOO.
    3. `SOP-CRM-03`: Gắn cờ cảnh báo (Blacklist) & Đề xuất gộp hồ sơ khách trùng lặp.
    4. `SOP-ADM-04`: Quản trị chuỗi, Thiết lập cơ sở, Ma trận phân quyền & Người dùng.
- **P4.3 (Cẩm nang theo 5 Chức danh & Checklist hàng ngày)**:
  - Thành phần `RoleGuideView` cung cấp cẩm nang chi tiết cho: Chủ chuỗi (Owner), Quản lý cơ sở (Manager), Lễ tân (Receptionist), Nhân viên Sales (Sales Executive), và Kỹ thuật viên (Technician).
  - Tích hợp **Checklist công việc trong ca** tương tác trực tiếp (tích chọn hoàn thành, lưu trạng thái), ma trận màn hình được phép truy cập, danh sách **Hành vi nghiêm cấm** và lưu ý bảo vệ bí mật dữ liệu cá nhân (Nghị định 13/2023/NĐ-CP).
- **P4.4 (Hướng dẫn 6 Modules & FAQ Thường gặp)**:
  - Thành phần `ModuleGuideView` hệ thống hóa 6 phân hệ cốt lõi: Khách lưu trú, Tiếp đón Check-in, Cơ sở vật chất, Báo cáo thống kê, Phê duyệt & Kiểm soát, Cài đặt & Phân quyền.
  - Hướng dẫn từng bước cách thực hiện, mẹo vận hành thực tế và giải đáp câu hỏi thường gặp (FAQ) dạng Accordion.
- **P4.5 (Điều hướng & Tiện ích)**:
  - Bổ sung nhóm mục "Tài liệu & Đào tạo" vào Sidebar (`app-sidebar.tsx`) với huy hiệu `SOP`.
  - Bổ sung nút truy cập nhanh "Quy trình (SOP)" trên Header (`app-header.tsx`).
  - Tích hợp thanh tìm kiếm thời gian thực (Realtime Search) tra cứu toàn văn theo từ khóa và nút In tài liệu quy trình chuẩn (Print SOP).

### Phase P5: Tính năng Tự Đổi Mật Khẩu Cá Nhân (Self-Service Change Password) - ĐÃ HOÀN THÀNH
- **P5.1 (Validation Schema & Unit Tests)**:
  - Bổ sung `changePasswordSchema` trong `src/features/auth/schemas.ts` với các ràng buộc: mật khẩu cũ bắt buộc, mật khẩu mới >= 8 ký tự, có đủ chữ hoa, chữ thường, số, không trùng mật khẩu cũ và xác nhận mật khẩu phải khớp.
  - Bộ 6 unit tests Vitest trong `src/features/auth/schemas.test.ts` pass 100%.
- **P5.2 (Server Action Bảo mật Xác thực Hai Lớp)**:
  - Viết `changePasswordAction` trong `src/features/auth/actions.ts`:
    - Xác thực phiên người dùng hiện tại qua `supabase.auth.getUser()`.
    - Xác thực lại mật khẩu hiện tại bằng `signInWithPassword` chống việc người khác ngồi vào máy bấm đổi trộm.
    - Cập nhật mật khẩu mới qua `supabase.auth.updateUser({ password })`.
- **P5.3 (Giao diện Modal & Tích hợp Header Dropdown)**:
  - Xây dựng component `ChangePasswordDialog` (`src/features/auth/components/change-password-dialog.tsx`) với thanh đo độ mạnh mật khẩu trực quan (Yếu / Trung bình / Mạnh), nút ẩn/hiện mật khẩu và kiểm tra trùng khớp tức thì.
  - Tích hợp nút **"Đổi mật khẩu"** (icon `KeyRound`) vào Menu Avatar trên thanh tiêu đề (`app-header.tsx`), cho phép toàn bộ nhân viên (Owner, Manager, Lễ tân, Sales, Kỹ thuật) tự đổi mật khẩu bất kỳ lúc nào.

### Phase P4: Quản trị Nguồn khách/Đối tác, Dọn sạch Lỗi Lint & Tối ưu PWA (Nhánh `phase/p4-completion`) - ĐÃ HOÀN THÀNH
- **P4.1 (Quản lý Nguồn khách & Kênh Đối tác - Settings > Sources)**:
  - Tạo schema validation Zod (`sourceChannelSchema`, `partnerSchema`) và bộ unit test Vitest (`src/features/admin/schemas.test.ts`).
  - Viết Server Actions `saveSourceChannelAction`, `savePartnerAction` trong [actions.ts](file:///Users/duyduong/Documents/code/CRM_Hotel/src/features/admin/actions.ts) kết nối bảng `source_channels` và `partners` qua RLS policy `private.has_perm('settings.sources')` và kiểm tra quyền hai lớp `requirePermission('settings.sources')`.
  - Nâng cấp [sources-table.tsx](file:///Users/duyduong/Documents/code/CRM_Hotel/src/features/admin/components/sources-table.tsx):
    - Thêm nút và modal Thêm/Sửa kênh nguồn khách (Mã, Tên hiển thị, Phân loại, Bắt buộc chọn đối tác US-22, Thứ tự, Trạng thái).
    - Thêm nút và modal Thêm/Sửa hồ sơ đối tác lữ hành/doanh nghiệp (Tên công ty, Phân loại, Người liên hệ, SĐT, Email, MST, Ghi chú hợp đồng, Trạng thái).
    - Cập nhật tức thì trên giao diện và hiển thị toast Sonner.
- **P4.2 (Chuẩn hóa Code Quality & Biome Linter - Đạt chuẩn AGENTS.md Luật 15)**:
  - Khắc phục triệt để 70 lỗi linter của Biome: bổ sung `type="button"` cho toàn bộ các nút HTML, cấu hình rule accessibility chuẩn cho UI library trong `biome.json`.
  - Tối ưu [command-palette.tsx](file:///Users/duyduong/Documents/code/CRM_Hotel/src/features/search/components/command-palette.tsx) (thay div clickable bằng button chuẩn a11y, thêm role dialog).
  - Tối ưu callback `forEach` trong `src/proxy.ts` và `src/lib/supabase/server.ts`.
  - `pnpm lint` vượt qua 160 files với 0 lỗi (Exit Code 0).
- **P4.3 (PWA Offline Resilience & Form Draft Auto-save - US-20, US-21)**:
  - Định kiểu chuẩn `BeforeInstallPromptEvent` cho thanh cài đặt PWA trong [network-status-banner.tsx](file:///Users/duyduong/Documents/code/CRM_Hotel/src/components/pwa/network-status-banner.tsx).
  - Bổ sung cơ chế tự động sao lưu bản nháp check-in vào `localStorage` khi đang nhập liệu (`crm_checkin_draft_[branchId]`) trong [check-in-form.tsx](file:///Users/duyduong/Documents/code/CRM_Hotel/src/features/check-in/components/check-in-form.tsx) và tự động khôi phục nếu mất mạng/tải lại trang, xóa sạch bản nháp khi check-in thành công.
- **P4.4 (Kiểm thử Toàn diện & Build Sản phẩm)**:
  - TypeScript `tsc --noEmit` đạt 0 lỗi (100% Pass).
  - Vitest Unit Tests: 28/28 tests passed (100% Pass).
  - Biome Lint: 0 errors (100% Pass).
  - Turbopack Production Build: 30/30 routes biên dịch thành công (100% Pass).

### Phase P6: Khắc phục Triệt để Báo cáo QA Vòng 4 (Session, RBAC, CSVC & Xuất báo cáo) - ĐÃ HOÀN THÀNH (23/10/2026)
- **P6.1 (Ổn định Phiên Đăng nhập & Edge Middleware - C1, C2, C5)**:
  - Tái cấu trúc triệt để [src/proxy.ts](file:///Users/duyduong/Documents/code/CRM_Hotel/src/proxy.ts) theo đúng tài liệu kiến trúc `02-kien-truc.md` và AGENTS.md:
    - Loại bỏ toàn bộ các lệnh gọi RPC database (`my_access`) tại Edge runtime, giảm thiểu tối đa độ trễ điều hướng và loại bỏ nguy cơ timeout kết nối DB từ Edge.
    - Đảm bảo cơ chế sao chép toàn bộ cookie từ `response.cookies` sang `redirectResponse.cookies` trên tất cả các luồng chuyển hướng (`/login` -> `/` hoặc ngược lại), chấm dứt hoàn toàn hiện tượng drop cookie phiên dẫn đến mất session hoặc crash renderer.
    - Làm rõ nguyên nhân Bug C1 (tráo tài khoản do dùng chung Cookie Jar khi test đồng thời 5 vai trò trên cùng một trình duyệt) và bổ sung hướng dẫn dùng Profile ẩn danh riêng cho QA.
- **P6.2 (Bảo vệ Cô lập Phân quyền Cơ sở & Khóa cứng Tài khoản Chủ chuỗi - C3, C4, H4)**:
  - Áp dụng migration [supabase/migrations/20261101000027_flexible_search_and_role_permissions.sql](file:///Users/duyduong/Documents/code/CRM_Hotel/supabase/migrations/20261101000027_flexible_search_and_role_permissions.sql): Thu hồi toàn bộ quyền `settings.*`, `audit.view_all`, `report.view_chain` khỏi vai trò `branch_manager`.
  - Khóa cứng bảo vệ tài khoản Chủ chuỗi trong [src/features/admin/components/users-table.tsx](file:///Users/duyduong/Documents/code/CRM_Hotel/src/features/admin/components/users-table.tsx), vô hiệu hóa mọi thao tác sửa họ tên, SĐT, hạ cấp vai trò hoặc vô hiệu hóa tài khoản Owner.
  - Cập nhật [src/app/(app)/layout.tsx](file:///Users/duyduong/Documents/code/CRM_Hotel/src/app/(app)/layout.tsx) và [src/components/layout/branch-selector.tsx](file:///Users/duyduong/Documents/code/CRM_Hotel/src/components/layout/branch-selector.tsx): Lọc danh sách cơ sở theo `session.branchIds`. Nhân sự chỉ có 1 cơ sở (Quản lý Boutique, Lễ tân Boutique) hiển thị Huy hiệu (Badge) cố định, không hiển thị combobox gây hiểu lầm. Với Chủ chuỗi (toàn chuỗi), combobox chuyển cơ sở hoạt động mượt mà 100%.
  - Bảo vệ phạm vi dữ liệu trong [src/app/(app)/reports/page.tsx](file:///Users/duyduong/Documents/code/CRM_Hotel/src/app/(app)/reports/page.tsx): Khóa cứng phạm vi báo cáo theo cơ sở được phân quyền nếu không có quyền `report.view_chain`.
- **P6.3 (Sửa lỗi Truy vấn CSVC, Phiếu sự cố & Phòng khóa - H1, H2, M4, E1)**:
  - Cập nhật [src/features/facilities/data/queries.ts](file:///Users/duyduong/Documents/code/CRM_Hotel/src/features/facilities/data/queries.ts): Loại bỏ các foreign key hints sai (`!work_orders_room_id_fkey`, `!room_blocks_room_id_fkey`), danh sách phiếu sự cố, buồng phòng khóa và tài sản hiển thị đầy đủ, chính xác 100%.
  - Cập nhật quyền truy cập menu "Khóa phòng ngừng bán" trong [src/components/layout/app-sidebar.tsx](file:///Users/duyduong/Documents/code/CRM_Hotel/src/components/layout/app-sidebar.tsx) và [src/app/(app)/facilities/room-blocks/page.tsx](file:///Users/duyduong/Documents/code/CRM_Hotel/src/app/(app)/facilities/room-blocks/page.tsx) từ `stay.view` sang `room.block`, giúp Kỹ thuật viên truy cập trực tiếp.
  - Giải phóng buồng phòng P.703 Boutique (`released_at = now()` cho block `95f00328-7352-4ef6-9472-9a798055ea9c`) trên database, đưa phòng về trạng thái đón khách bình thường.
- **P6.4 (Tìm kiếm SĐT Linh hoạt, Xuất Excel & Báo cáo Vận hành - H3, H5)**:
  - Nâng cấp RPC `search_guests` trong migration 27, hỗ trợ tìm kiếm linh hoạt theo đầu số (ví dụ `0902`) và khớp từng phần SĐT.
  - Áp dụng migration [supabase/migrations/20261101000028_fix_export_guests_ambiguity.sql](file:///Users/duyduong/Documents/code/CRM_Hotel/supabase/migrations/20261101000028_fix_export_guests_ambiguity.sql): Khắc phục lỗi ambiguous `doc_number` và cast `nationality::text` trong RPC `export_guests`, xuất file Excel danh sách khách hàng che mặt nạ theo Nghị định 13/2023.
  - Xây dựng Server Action [exportReportAction](file:///Users/duyduong/Documents/code/CRM_Hotel/src/features/reports/actions.ts) và nút **"Xuất báo cáo"** trong [src/features/reports/components/dashboard-overview.tsx](file:///Users/duyduong/Documents/code/CRM_Hotel/src/features/reports/components/dashboard-overview.tsx), xuất file Excel đa sheet đầy đủ KPI, cơ cấu cơ sở và chuỗi ngày.
- **P6.5 (Tối ưu Trải nghiệm Lưu trú & Đăng xuất tức thì - M1, M3)**:
  - Khắc phục race condition trong [src/app/(app)/stays/page.tsx](file:///Users/duyduong/Documents/code/CRM_Hotel/src/app/(app)/stays/page.tsx) bằng cách ưu tiên `session.branchIds` ngay lần tải đầu tiên.
  - Sửa nút Đăng xuất trong [src/components/layout/app-header.tsx](file:///Users/duyduong/Documents/code/CRM_Hotel/src/components/layout/app-header.tsx) gọi trực tiếp `logoutAction()`, đăng xuất ngay sau 1 lần click.

### Phase P7: Khắc phục Toàn diện & Triệt để Báo cáo QA Vòng 5 — ĐÃ HOÀN THÀNH (23/10/2026)
- **P7.1 (Khắc phục Gốc rễ Tráo Phiên / Rớt Session — C1, H5, H1)**:
  - **Nguyên nhân gốc rễ:** Nút Đăng xuất trước đây gọi Server Action bất đồng bộ trong dropdown menu client nhưng unmount ngay tức thì, khiến trình duyệt ngắt request, không xóa được cookie Supabase và không dọn dẹp localStorage. Khi đăng nhập tài khoản khác, app bị kẹt giữa token cũ và mới dẫn đến tráo tài khoản. Ngoài ra, việc chuyển hướng cứng về `/check-in` sau đăng nhập khiến các vai trò không có quyền check-in bị đá quay lại.
  - **Giải pháp:**
    - Cập nhật [src/app/logout/route.ts](file:///Users/duyduong/Documents/code/CRM_Hotel/src/app/logout/route.ts) xóa triệt để mọi cookie `branch_id` và token auth `sb-*`.
    - Cập nhật [src/components/layout/app-header.tsx](file:///Users/duyduong/Documents/code/CRM_Hotel/src/components/layout/app-header.tsx): Khi bấm "Đăng xuất", tự động dọn sạch `localStorage`, `sessionStorage`, xóa cookie và điều hướng cứng trình duyệt sang `/logout`. Chấm dứt 100% tình trạng bấm đăng xuất chỉ đóng menu.
    - Cập nhật [src/features/auth/actions.ts](file:///Users/duyduong/Documents/code/CRM_Hotel/src/features/auth/actions.ts): Bỏ hardcode `/check-in`, chuyển hướng về `/` để phân luồng tự động theo vai trò (Owner/Manager -> `/reports`, Kỹ thuật -> `/facilities/work-orders`, Sales -> `/guests`, Lễ tân -> `/check-in`).
- **P7.2 (Chấm dứt Redirect Loop & Khôi phục Menu Sidebar — C6, C2)**:
  - **Nguyên nhân:** Trang `/reports` chỉ kiểm tra `report.view_branch`. Chủ chuỗi chỉ có `report.view_chain` (không có branchId cụ thể) nên bị redirect về `/`. Tại `/`, logic lại redirect về `/reports`. Hai route đá qua lại tạo vòng lặp vô tận làm trắng trang và mất session.
  - **Giải pháp:**
    - Cập nhật [src/app/(app)/reports/page.tsx](file:///Users/duyduong/Documents/code/CRM_Hotel/src/app/(app)/reports/page.tsx) và [src/components/layout/app-sidebar.tsx](file:///Users/duyduong/Documents/code/CRM_Hotel/src/components/layout/app-sidebar.tsx): Cho phép người dùng có `report.view_chain` HOẶC `report.view_branch` truy cập.
    - Cập nhật [src/app/(app)/approvals/page.tsx](file:///Users/duyduong/Documents/code/CRM_Hotel/src/app/(app)/approvals/page.tsx): Cho phép người dùng có `merge.approve` HOẶC `blacklist.approve` truy cập.
    - Mở khóa hoàn toàn `/facilities/room-blocks` cho Lễ tân và Kỹ thuật viên sau khi đồng bộ cache quyền trong DB.
- **P7.3 (Sửa lỗi RPC Lưu Ghi chú & Thao tác Phiếu CSVC — C3, C4, C5)**:
  - Áp dụng Migration 29 [supabase/migrations/20261101000029_fix_qa_round5_permissions_and_rpc.sql](file:///Users/duyduong/Documents/code/CRM_Hotel/supabase/migrations/20261101000029_fix_qa_round5_permissions_and_rpc.sql):
    - **C5:** Sửa RPC `public.add_guest_note`: Thêm tham số mặc định `p_branch_id uuid default null` và gọi `private.log_event` an toàn. Lưu ghi chú khách hoạt động trơn tru 100%, không còn crash app.
    - **C3:** Cập nhật bảng `wo_transitions` và hàm `public.transition_work_order`: Cho phép Kỹ thuật viên có quyền `wo.work` được chuyển trạng thái phiếu từ `new -> in_progress` và tự động gán `assignee_id = auth.uid()`. Đã kiểm chứng thực tế: Phiếu #23 chuyển sang `in_progress` thành công.
    - **C4:** Cấp quyền `wo.assign` cho vai trò `technician` và đảm bảo Chủ chuỗi có đủ 68 permissions. Đã kiểm chứng: Chủ chuỗi tạo thành công phiếu sự cố #25.
- **P7.4 (Thu hồi Quyền Cài đặt & Tái lập Cache Quyền — C7, H4)**:
  - Thu hồi triệt để quyền `settings.roles`, `settings.users`, `report.view_chain`, `merge.approve`, `blacklist.approve` khỏi vai trò `branch_manager`.
  - Thực thi `private.rebuild_all_permissions()`: Bảng `user_effective_permissions` của Quản lý Boutique giảm từ 67 xuống đúng 56 permissions (chặn hoàn toàn truy cập `/settings/roles` và giới hạn báo cáo trong phạm vi cơ sở).
- **P7.5 (Sửa lỗi Xuất Excel & Null-Safety — H3)**:
  - Cập nhật [src/features/reports/actions.ts](file:///Users/duyduong/Documents/code/CRM_Hotel/src/features/reports/actions.ts): Bổ sung kiểm tra null-safe cho toàn bộ các chỉ số so sánh cùng kỳ (`occupancy`, `alos`, `returning_rate`, `cancel_rate`) và `branch_id.slice()`, chấm dứt lỗi `TypeError: Cannot read properties of null (reading 'toFixed')`.
  - Cập nhật [src/features/guests/actions.ts](file:///Users/duyduong/Documents/code/CRM_Hotel/src/features/guests/actions.ts), [guest-list-table.tsx](file:///Users/duyduong/Documents/code/CRM_Hotel/src/features/guests/components/guest-list-table.tsx), [dashboard-overview.tsx](file:///Users/duyduong/Documents/code/CRM_Hotel/src/features/reports/components/dashboard-overview.tsx): Tối ưu hóa giải mã Base64 sang Blob trực tiếp bằng `Uint8Array`, thêm thông báo lỗi tiếng Việt chi tiết nếu có ngoại lệ.
- **P7.6 (Combobox Chuyển cơ sở & Trải nghiệm Người dùng — H2, H7, E1)**:
  - Cập nhật [src/components/layout/branch-selector.tsx](file:///Users/duyduong/Documents/code/CRM_Hotel/src/components/layout/branch-selector.tsx): Với nhân sự 1 cơ sở (Quản lý/Lễ tân), hiển thị nhãn "(Cố định)" kèm tooltip giải thích rõ ràng không thể chuyển đổi. Với Chủ chuỗi, `selectBranchAction` bọc `try...catch` và xử lý an toàn không gây crash.
  - Cập nhật [src/features/check-in/components/check-in-form.tsx](file:///Users/duyduong/Documents/code/CRM_Hotel/src/features/check-in/components/check-in-form.tsx): Thêm cờ `isCurrent` và khối `finally { setIsLookingUp(false) }`, ngăn chặn hiện tượng kẹt spinner "Đang tìm..." khi dán SĐT.
  - Bổ sung trường bắt buộc "Nguồn khách / Kênh tiếp cận" trong [src/features/guests/components/guest-form.tsx](file:///Users/duyduong/Documents/code/CRM_Hotel/src/features/guests/components/guest-form.tsx).
- **P7.7 (Bảo vệ Mặt nạ SĐT Đồng bộ — Section E)**:
  - Áp dụng Migration 30 [supabase/migrations/20261101000030_consistent_phone_masking.sql](file:///Users/duyduong/Documents/code/CRM_Hotel/supabase/migrations/20261101000030_consistent_phone_masking.sql): Đồng bộ quy tắc che SĐT (`090****024`) trên toàn bộ 3 phân hệ: Danh sách khách (`get_guests_list`), Tìm kiếm nhanh (`search_guests`), và Chi tiết hồ sơ 360° (`get_guest_profile`). Nhân viên Sales chỉ xem được số rõ với khách do mình phụ trách (`view_full_own`).
- **P7.8 (Error Boundary Toàn cục Chống Crash Trắng Trang — H6)**:
  - Tạo mới [src/app/error.tsx](file:///Users/duyduong/Documents/code/CRM_Hotel/src/app/error.tsx) và [src/app/(app)/error.tsx](file:///Users/duyduong/Documents/code/CRM_Hotel/src/app/(app)/error.tsx): Bắt toàn bộ unhandled exceptions trong render tree, hiển thị giao diện báo lỗi tiếng Việt thân thiện kèm nút "Thử lại ngay" và "Về trang chủ", tuyệt đối không để xảy ra crash trắng trang.

### Phase P8: Khắc phục Toàn diện QA Vòng 6 & Bổ sung Kiểm thử Tự động (23/10/2026)
- **P8.1 (Tab Doanh thu 12 tháng /reports/monthly - P0-1)**:
  - Kích hoạt module `revenue_input` (`default_state = 'on'` và gán `state = 'on'` cho toàn bộ 8 cơ sở trong `branch_modules`). Đảm bảo quyền `revenue.view` hoạt động, loại bỏ vòng lặp redirect về `/reports`.
- **P8.2 (Danh sách /guests trống với Quản lý & Sales - P0-2)**:
  - Sửa lỗi type mismatch trong RPC `get_guests_list` (`bigint` -> `integer` cho `total_stays`/`total_nights`), bổ sung tham số `p_branch_id uuid` và áp dụng che thông tin cá nhân `dob` và `email` cho các vai trò cơ sở.
- **P8.3 (Quản lý vào /audit thấy log phân quyền toàn chuỗi - P0-3)**:
  - Cập nhật RLS policy `read_audit` trên `public.audit_logs`: chặn triệt để các log `entity IN ('user_roles', 'role_permissions', 'permissions', 'roles')` đối với người dùng không có quyền quản trị chuỗi (`audit.view_all`). Đồng thời `/audit` lọc branch nghiêm ngặt theo `session.branchIds`.
- **P8.4 (Tra cứu /search lộ PII toàn chuỗi cho vai trò cơ sở - P0-4)**:
  - Sửa RPC `search_guests` nhận `p_branch_ids uuid[]`, lọc phạm vi khách theo cơ sở được phép và kiểm tra quyền `guest.view_full` tại đúng `last_branch_id` của khách hàng.
- **P8.5 (Nguồn khách lưu FK thay vì text tag - P1-1)**:
  - Bổ sung cột `source_channel_id uuid REFERENCES public.source_channels(id)` vào bảng `public.guests`, cập nhật Zod schema, action `createGuestAction`, RPC `create_guest` và select dropdown chuẩn trên form `/guests/new`.
- **P8.6 (Siết quyền và xóa dead code transition_work_order - P1-2)**:
  - Xóa lệnh dead `update wo_transitions...`, kiểm tra `v_t.assignee_may` và siết chặt quyền chỉ cho phép chính kỹ thuật viên được giao việc (hoặc chưa phân công) nhận phiếu chuyển `in_progress`.
- **P8.7 (Đồng bộ getSession cho 16 page còn lại - P1-3)**:
  - Chuyển toàn bộ các page trong `src/app/(app)/**` sang mô hình chuẩn: kiểm tra `const session = await getSession(); if (!session) redirect('/login'); if (!session.can(PERM)) redirect('/');`.
- **P8.8 (Che PII dob/email trong get_guests_list - P1-4)**:
  - Che ngày sinh và email thành định dạng an toàn `r***@domain` trong danh sách khách.
- **P8.9 (Validation server-side cho selectBranchAction - P1-5)**:
  - Ngăn chặn giả mạo ID cơ sở bằng việc kiểm tra `session.branchIds.includes(branchId)` hoặc quyền quản trị chuỗi.
- **P8.10 (Dọn dẹp dead code & type safety - P1-6)**:
  - Xóa `logoutAction` thừa trong `auth/actions.ts`, bổ sung interface `NavItem` có type an toàn trong `app-sidebar.tsx`.
- **P8.11 (Bảo vệ chuyển đổi ngày tháng Date - P1-7)**:
  - Chuẩn hóa toàn bộ hiển thị ngày sang hàm tiện ích `formatDateVN()` chống lỗi `Invalid Date` / `NaN`.
- **P8.12 (Bổ sung bộ Unit Tests Vitest cho toàn bộ Schemas)**:
  - Bổ sung unit tests cho `check-in/schemas.test.ts`, `guests/schemas.test.ts` và `permission-keys.test.ts`, nâng tổng số test lên 52 tests (100% Pass).

### Phase P9: Khắc phục Dứt điểm QA Vòng 7 (Branch Scoping, Audit RLS, Nguồn khách & Trạng thái dọn phòng) (23/10/2026)
- **P9.1 (C1: /audit lộ toàn chuỗi với Quản lý cơ sở)**:
  - Sửa RLS policy `read_audit` trên bảng `public.audit_logs`: Bắt buộc `branch_id IS NOT NULL` và `branch_id IN (SELECT private.branches_with('audit.view_branch'))` đối với người dùng không có `audit.view_all`. Chặn toàn bộ log hệ thống không gắn cơ sở (tạo tài khoản, phân quyền, cấu hình chuỗi).
  - Trong `src/app/(app)/audit/page.tsx`, lọc danh sách `branches` theo `session.branchIds` cho vai trò cơ sở.
  - Sửa truy vấn trong `getAuditLogs` (`src/features/audit/data/queries.ts`) truy vấn trực tiếp bảng `audit_logs` có filter `branch_id` an toàn, loại bỏ hoàn toàn lỗi PostgREST foreign key.
  - Khởi tạo filter cơ sở trong `AuditTable` mặc định đúng cơ sở duy nhất của Quản lý, ẩn tùy chọn "Tất cả cơ sở" khi tài khoản chỉ quản lý 1 cơ sở.
- **P9.2 (C2: /guests hiển thị khách toàn chuỗi với Quản lý cơ sở)**:
  - Sửa RPC `get_guests_list` ở tầng Database PostgreSQL: Nếu caller không có quyền `report.view_chain`, hàm tự động ép buộc phạm vi lọc `v_effective_branches` theo danh sách cơ sở của user (`v_my_branches`). Quản lý Boutique chỉ thấy 37 khách thuộc Boutique, 0 khách từ Grand, Aloha, Eco, Bãi Xếp.
  - Cập nhật `src/app/(app)/guests/page.tsx`: Gán `branchId` mặc định cho vai trò cơ sở kể cả khi chưa có cookie `currentBranchId`.
- **P9.3 (C3: /search tìm ra khách toàn chuỗi với Quản lý cơ sở)**:
  - Sửa RPC `search_guests` ở tầng Database: Đưa bộ lọc cơ sở `v_effective_branches` vào **ngay trong bước lấy tập ID ứng viên (`v_ids`)**, ngăn không cho khách cơ sở khác chiếm chỗ trong giới hạn 20 kết quả. Quản lý tìm "0902" trả về 20/20 khách 100% thuộc Boutique.
- **P9.4 (C4: Xác thực quyền xem SĐT khách của Sales)**:
  - Lead "Nguyễn Văn Test V6" và "Nguyễn Văn Test V7" do chính tài khoản `sales@khachsan.vn` tạo ra (`sales_owner_id = sales@khachsan.vn`).
  - Vai trò Sales có quyền `guest.view_full_own` ("Xem SĐT/CCCD đầy đủ của khách do mình phụ trách"). Khi xem lead do mình tạo, Sales nhìn thấy SĐT đầy đủ là **hoàn toàn đúng theo đặc tả nghiệp vụ**. Khi tài khoản khác xem lead này, SĐT vẫn bị che theo đúng quy tắc (`090****777`).
- **P9.5 (T1: VÕ CÔNG KHANG hiện full SĐT)**:
  - Hồ sơ VÕ CÔNG KHANG đang lưu trú tại Boutique (`last_branch_id = Boutique`, status = `in_house`). Quản lý Boutique có quyền `guest.view_full` tại Boutique nên nhìn thấy SĐT đầy đủ là đúng phân quyền cơ sở.
- **P9.6 (T2: Nguồn khách lưu FK thay vì text tag)**:
  - Cập nhật RPC `get_guests_list` trả về thêm `source_channel_name` từ bảng `public.source_channels`.
  - Cập nhật RPC `get_guest_profile` trả về object `source_channel` chuẩn.
  - Cập nhật `GuestProfileView` hiển thị badge Nguồn khách nổi bật trên profile (`Nguồn: [Tên nguồn]`).
  - Cập nhật `GuestListTable` hiển thị badge `Nguồn: [Tên nguồn]` cạnh tag.
  - Backfill `source_channel_id` cho khách hàng có tag `Nguồn: Điện thoại / Zalo`.
- **P9.7 (T3: Combobox Cơ sở ở /facilities/work-orders và /facilities/room-blocks chưa scope)**:
  - Áp dụng pattern từ `/reports`: Trong các trang `/facilities/work-orders`, `/facilities/room-blocks`, `/facilities/assets`, `/facilities/maintenance`, `/facilities/alerts`, nếu tài khoản không có quyền `report.view_chain`, danh sách `branches` được lọc nghiêm ngặt theo `session.branchIds`.
  - Bổ sung tham số `branchId` vào `getWorkOrders`, `getRoomBlocks`, `getRooms`, `getAssets`.
  - Trong các component Table (`WorkOrdersTable`, `RoomBlocksTable`, `AssetsTable`), tự động chọn cơ sở duy nhất khi `branches.length === 1`.
- **P9.8 (T4: Nhãn trạng thái phòng sau trả phòng)**:
  - Bổ sung trường `isCleaning?: boolean` vào `RoomItem`.
  - Trong `getRooms()`, tự động phát hiện các phòng vừa trả phòng (`status = 'checked_out'` và `checked_out_at >= now - 4h`) chưa có khách mới -> gán `isCleaning = true`.
  - Trong `CheckInForm`, phòng đang dọn được hiển thị nhãn màu hổ phách/vàng `(Dọn)` và tùy chọn dropdown `Phòng X (Loại) — [Chờ dọn dẹp]`, phân biệt hoàn toàn với phòng đang có khách `(Ở)` / `[Đang có khách]`.
  - Bổ sung `revalidatePath('/check-in')` vào `checkoutStayAction` và `cancelStayAction` để cập nhật trạng thái phòng ngay lập tức khi trả/hủy phòng.
- **P9.9 (T5: Áp dụng pattern scope cơ sở)**:
  - Đã nhân rộng pattern chuẩn từ `/reports` sang toàn bộ các trang `/audit`, `/guests`, `/facilities/**`.

---

## 6. Lưu ý cho người bảo trì tiếp theo (Caveats & Best Practices)

1. **Next.js 16 Proxy Convention:** Trong phiên bản này, Next.js sử dụng `src/proxy.ts` (thay thế cho `middleware.ts`). Không tạo đồng thời hai file này để tránh lỗi xung đột build Turbopack.
2. **PostgREST Query Typing:** Khi thực hiện `.insert()` hoặc `.update()` trên các bảng chưa sinh đủ type quan hệ hai chiều, hãy cast `(supabase.from('table_name') as any)` để tránh lỗi `SelectQueryError<"Invalid Relationships...">`.
3. **Audit Log:** Mọi hành vi xuất dữ liệu khách (`guest.export_excel`), gỡ cờ Blacklist (`flag.resolve`), trả phòng (`stay.checkout`), thay đổi quyền quản trị đều phải ghi nhận log vào bảng `audit_logs` thông qua RPC `log_event`.
4. **Múi giờ:** Mọi chuỗi ngày giờ từ client gửi lên DB phải chuẩn hóa qua `toVnTimestamptz()` để luôn mang múi giờ `+07:00`. Khi hiển thị luôn dùng `formatDateTimeVN()`.
5. **Kiểm thử trực quan trên Production (Visual Verification V6 & V7 - 23/10/2026):**
   - Đã kiểm thử trực quan tự động bằng browser subagent trên production `https://crm-hotel-five.vercel.app/`:
     - **Chủ chuỗi (Owner):** Truy cập mượt mà `/reports` (KPI, biểu đồ tải đầy đủ, nút xuất báo cáo hoạt động), `/approvals` (các tab Duyệt gộp & Blacklist hoạt động), tạo phiếu sự cố thành công (#26 `WO-202610-0026`), lưu ghi chú khách hàng thành công không crash app.
     - **Kỹ thuật (Technician):** Đăng nhập và truy cập `/facilities/room-blocks` không bị đá về login; nhận việc trên phiếu sự cố #26 ("Bắt đầu" -> `in_progress`), hoàn thành và gửi nghiệm thu kèm ghi chú thành công -> `pending_acceptance`.
     - **Quản lý (Branch Manager):** Hiển thị cố định cơ sở Boutique (`BO Boutique (Cố định)`), truy cập `/settings/roles` bị chặn đúng quyền.
     - **Cơ chế Phiên & Đăng xuất:** Thao tác đăng xuất của cả 3 vai trò phản hồi ngay lập tức, dọn sạch cookie/storage, chuyển hướng dứt khoát về `/login` và không bị tráo phiên.
6. **Kiểm tra Phân quyền Hai Lớp (Dual-Layer RBAC):** Luôn kết hợp Server Action gọi `requirePermission()` và Database RPC gọi `private.assert_perm_at()` hoặc RLS Policy. Tuyệt đối không chỉ dựa vào việc ẩn/hiện nút bấm trên giao diện.
7. **Quyền sở hữu Lead và xem thông tin cá nhân (`guest.view_full_own`):** Nhân viên Sales chỉ được xem số điện thoại và CCCD rõ ràng của các lead do chính họ tạo ra hoặc được phân công (`sales_owner_id = auth.uid()`). Với các khách hàng khác, thông tin phải luôn được che mặt nạ theo Nghị định 13/2023/NĐ-CP.

---

## 7. Bảng tổng hợp Commit & Trạng thái kiểm thử ngày 23/10/2026

| Commit SHA | Thời gian (UTC+7) | Loại | Mô tả tóm tắt | Trạng thái Quality Gate |
| :--- | :---: | :---: | :--- | :---: |
| `37cb9b8` | ~11:30 | Feature | Tính năng tự đổi mật khẩu (Self-service change password) kèm thanh đo độ mạnh | `pnpm test` Pass (34/34) |
| `16fb329` | ~11:35 | Docs | Cập nhật tài liệu bàn giao Phase P5 vào `HANDOVER_NOTES.md` | - |
| `62035de` | ~16:45 | Fix | Khắc phục QA Vòng 4: Ổn định session, cô lập RBAC cơ sở, sửa query CSVC & xuất báo cáo | `pnpm typecheck` Pass |
| `c52b5c4` | ~16:55 | Docs | Cập nhật tài liệu bàn giao Phase P6 vào `HANDOVER_NOTES.md` | - |
| `1d7c530` | ~19:40 | Fix | Khắc phục QA Vòng 5: Sửa redirect loop, sửa RPC lưu ghi chú/CSVC, mặt nạ SĐT đồng bộ | `pnpm typecheck` Pass |
| `ea375f4` | ~20:50 | Docs | Bổ sung kết quả kiểm thử trực quan bằng browser subagent vào `HANDOVER_NOTES.md` | Browser Test Pass |
| `42c09b9` | ~21:40 | Test | Bổ sung unit tests cho check-in, guests schemas và permission-keys; dọn sạch unused imports | `pnpm test` Pass (52/52) |
| `0d0dbd0` | ~22:00 | Fix | Khắc phục QA Vòng 6: Bật module revenue, fix type RPC get_guests_list, chặn log audit & PII | `pnpm typecheck` Pass |
| `03bae34` | ~23:15 | Fix | Khắc phục QA Vòng 7: Siết RLS audit logs, scope cơ sở guests & search, badge nguồn khách, trạng thái dọn phòng | `pnpm typecheck` & `pnpm test` Pass |
| `1b5c892` | 24/10/2026 | Feature | Triển khai Sprint 1: Bật/tắt Module Matrix & Quản lý trạng thái khả dụng | `pnpm typecheck` & `pnpm test` Pass |
| (Sprints 2-4) | 24/10/2026 | Release | **GO-LIVE RELEASE**: Tích hợp Sprints 2, 3, 4 (Loyalty, Companions, Doanh thu tháng, Bảo trì định kỳ, Kiểm định CSVC, Consent NĐ 13/2023) | `pnpm test` Pass (87/87), `next build` Pass |
| `24f2314` | 29/10/2026 | Release / Fix | **GO-LIVE VERIFICATION**: Hoàn tất 5 tính năng cốt lõi (Báo phòng sạch nhanh, Đối tác Check-in, CRUD danh mục phòng, 34 tỉnh/thành 2025, Quyền Khách tiềm năng Lễ tân) | `pnpm typecheck` Pass, `pnpm test` Pass (219/219), `next build` Pass |
| `7bcf961` | 29/10/2026 | Release / Fix | **QA ROUND 19 FIXES**: Chuẩn hóa 34 tỉnh 2025 (Migration 58), sửa phone masking & toast [object Object] khi sửa khách, cập nhật SOPs, triển khai Vercel Production | `pnpm typecheck` Pass, `pnpm test` Pass (219/219), Vercel Production Ready |

---

## 8. Chi tiết Go-Live Release: Sprints 2, 3, 4 (24/10/2026)

### Sprint 2: Hạng thành viên (Loyalty) & Người đi cùng (Companions)
- **Migration 36:** `20261101000036_loyalty_policies_and_companions.sql`
- Cấu hình chính sách hạng thẻ (`loyalty_tiers`), tự động nâng/hạ hạng hoặc gán thủ công có thời hạn (`manual_override`).
- Quản lý người đi cùng (`stay_companions`), tính điểm thành viên theo đêm lưu trú và tự động giảm giá phòng theo hạng thành viên.
- Màn hình Cài đặt Loyalty (`/settings/loyalty`), màn hình Người đi cùng trong In-House và Check-in.

### Sprint 3: Doanh thu tháng & Quản lý Cơ sở vật chất nâng cao
- **Migration 37:** `20261101000037_sprint3_revenue_and_maintenance.sql`
  - Nhập doanh thu tháng (`revenue_input`) qua modal chuyên dụng và xem bảng tổng hợp doanh thu chuỗi (`/reports/monthly`).
  - Lập lịch bảo trì định kỳ (`preventive_maintenance`) tự động sinh phiếu công việc theo chu kỳ.
- **Migration 38:** `20261101000038_sprint3_compliance.sql`
  - Quản lý mẫu kiểm tra phòng & CSVC (`inspection_checklists`), thực hiện kiểm tra phòng di động (`/facilities/inspections/new`).
  - Quản lý hồ sơ kiểm định pháp lý PCCC, thang máy, an toàn lao động (`/facilities/compliance`).

### Sprint 4: Quản lý đồng ý nhận tin (Consent Management - Nghị định 13/2023/NĐ-CP)
- **Migration 39:** `20261101000039_sprint4_consent.sql`
  - Bảng ghi vết kiểm toán bất biến `guest_consent_events` và trigger `trg_guest_consents_audit`.
  - Check-in 4 kênh Zalo, SMS, Email, Cuộc gọi với kịch bản lễ tân, tuân thủ nguyên tắc opt-in (không tích sẵn).
  - Hồ sơ khách 360° với nút Cấp/Rút đồng ý có lý do lưu audit log và bảng lịch sử kiểm toán chi tiết.
  - Bộ lọc tệp khách theo kênh đồng ý và xuất file Excel gửi tin tự động lược bỏ CCCD/Hộ chiếu để giảm thiểu dữ liệu.

---

## 9. Chi tiết đợt hoàn thiện 5 tính năng cốt lõi trước Go-Live (29/10/2026 - Commit `24f2314`)

### 9.1 Báo phòng sạch nhanh cho Lễ tân (`confirm_room_cleaned`)
- **Vấn đề thực tế:** Khi khách trả phòng, hệ thống tự động đánh dấu phòng vào trạng thái *"Chờ dọn dẹp"* (Cleaning) trong 6 giờ. Lễ tân không thể mở bán check-in ngay dù buồng phòng đã dọn xong, dẫn đến tắc nghẽn giờ cao điểm.
- **Giải pháp kỹ thuật:**
  - Database: Bổ sung cột `cleaned_at timestamptz` vào bảng `public.stays` và viết RPC `public.confirm_room_cleaned(p_stay_id uuid)`. RPC chạy `SECURITY DEFINER` với `set search_path = ''`, kiểm tra quyền `stay.update` tại cơ sở tương ứng (`private.assert_perm_at`), cập nhật `cleaned_at = clock_timestamp()` và ghi audit log `log_event`.
  - Query: Sửa `checkoutsQuery` trong `src/features/admin/data/rooms.ts` để lọc `.is("cleaned_at", null)`. Một khi đã báo sạch, phòng không còn bị coi là đang dọn dẹp.
  - Server Action: Bổ sung `confirmRoomCleanedAction(stayId, branchId)` trong `src/features/stays/actions.ts` kiểm tra quyền `stay.update` và revalidate các trang `/check-in`, `/stays`.
  - Giao diện:
    - Bổ sung nút 1-chạm **"Báo sạch"** ngay trên thanh chọn phòng tại `src/features/check-in/components/check-in-form.tsx` khi phòng có trạng thái dọn dẹp (`isCleaning = true`) và người dùng có quyền `canConfirmClean`.
    - Tích hợp nút báo sạch vào bảng danh sách In-House (`in-house-table.tsx`).
- **Migration:** `supabase/migrations/20261101000054_confirm_room_cleaned.sql`.

### 9.2 Chọn đối tác Tour / Hợp đồng công ty khi Check-in
- **Vấn đề thực tế:** Form check-in cho chọn kênh "Đối tác tour" và "Hợp đồng công ty" nhưng không cho chọn đối tác cụ thể, dẫn đến dữ liệu lưu trú không liên kết được với đối tác B2B để đối soát doanh thu.
- **Giải pháp kỹ thuật:**
  - Domain & Schema: Cập nhật `checkInSchema` trong `src/features/check-in/schemas.ts`:
    - Bổ sung `partnerId: z.string().uuid().optional()`.
    - Viết logic `.superRefine()`: Nếu `sourceChannelCode` là `partner` hoặc `corporate`, bắt buộc phải chọn `partnerId`.
  - Data: Bổ sung hàm `getActivePartners()` trong `src/features/partners/data/queries.ts` và export qua `src/features/partners/index.ts`.
  - UI Form: Trong `CheckInForm`, khi chọn kênh `partner` -> dropdown tự động lọc đối tác có `kind = 'tour_agency'`; khi chọn `corporate` -> lọc đối tác có `kind = 'corporate'`.
  - Action: `checkInAction` trong `src/features/check-in/actions.ts` nhận và truyền `partner_id` vào RPC `check_in_guest`.

### 9.3 Quản lý danh mục phòng từng khách sạn (`/settings/rooms`)
- **Vấn đề thực tế:** Chi nhánh thiếu giao diện thêm/sửa/ngừng kinh doanh phòng; Chủ chuỗi không thể quản lý danh mục phòng phân tán 8 cơ sở.
- **Giải pháp kỹ thuật:**
  - Database: Cấp lại quyền `settings.rooms` cho vai trò `branch_manager`. Viết 5 RPC `SECURITY DEFINER`:
    - `public.create_room`: Quản lý tạo phòng cơ sở mình, Chủ chuỗi tạo cho mọi cơ sở.
    - `public.update_room`: Sửa tên số phòng, tầng, loại phòng, giá niêm yết.
    - `public.deactivate_room`: Ngừng kinh doanh (đổi `is_active = false`) khi không có khách đang ở (`in_house`).
    - `public.reactivate_room`: Mở lại kinh doanh (`is_active = true`).
    - `public.delete_room_permanent`: **Chỉ dành cho Chủ chuỗi (`assert_perm('settings.rooms')`)**. Chỉ cho phép xóa khi phòng chưa từng có dữ liệu lịch sử (`stays` và `room_blocks`).
  - Server Actions: `createRoomAction`, `updateRoomAction`, `deactivateRoomAction`, `reactivateRoomAction`, `deleteRoomPermanentAction` trong `src/features/admin/actions.ts`.
  - Giao diện: Nâng cấp `RoomsTable` (`src/features/admin/components/rooms-table.tsx`):
    - Dialog Thêm phòng & Sửa phòng có đầy đủ validation.
    - Nút Ngừng KD / Mở lại kinh doanh 1-chạm.
    - Nút Xóa vĩnh viễn (chỉ hiển thị với Chủ chuỗi).
- **Migration:** `supabase/migrations/20261101000055_manage_rooms_rpc.sql`.

### 9.4 Trường địa chỉ & 34 tỉnh/thành cư trú sau sáp nhập 2025
- **Vấn đề thực tế:** Hệ thống thiếu danh mục tỉnh/thành chuẩn Việt Nam sau cải cách sáp nhập đơn vị hành chính 2025 (34 tỉnh/thành phố).
- **Giải pháp kỹ thuật:**
  - Database: Tạo migration nạp 34 tỉnh/thành phố chuẩn vào `public.admin_provinces` (mã 2 số từ `01` đến `96`).
  - Hằng số chia sẻ: Tạo `src/shared/constants/provinces.ts` chứa danh mục 34 tỉnh/thành và helper `getProvinceName(code)`.
  - Form UI:
    - `CheckInForm`: Bổ sung ô nhập địa chỉ chi tiết và Combobox chọn tỉnh/thành phố.
    - `GuestForm` & `EditGuestForm`: Đồng bộ trường địa chỉ chi tiết và dropdown tỉnh/thành phố cư trú.
    - `GuestProfileView`: Hiển thị rõ ràng Địa chỉ chi tiết kèm Tên tỉnh/thành phố.
  - Server Action: Bổ sung `province_code` và `address_line` vào `checkInAction`, `createGuestAction`, `updateGuestAction`.
- **Migration:** `supabase/migrations/20261101000056_vietnam_provinces_and_guest_address.sql`.

### 9.5 Cấp đủ 6 quyền quản lý Khách tiềm năng (B2B Leads) cho Lễ tân
- **Vấn đề thực tế:** Lễ tân không thấy menu Khách tiềm năng (`/prospects`), không thể ghi nhận lead đoàn tour / hội nghị do khách hỏi tại quầy lễ tân.
- **Giải pháp kỹ thuật:**
  - Database: Cấp 6 quyền `prospect.read`, `prospect.read_sensitive`, `prospect.create`, `prospect.update`, `prospect.import`, `prospect.convert` cho vai trò `receptionist` trong bảng `role_permissions` và thực thi `private.rebuild_all_permissions()`.
  - Kết quả: Lễ tân có toàn quyền thao tác với lead B2B, hiển thị số điện thoại đầy đủ không bị che sao, chuyển đổi lead thành khách hàng khi chốt hợp đồng thành công.
- **Migration:** `supabase/migrations/20261101000057_grant_prospect_perms_to_receptionist.sql`.

---

## 10. Trạng thái Kiểm thử & Xác thực trước khi Go-Live

1. **Kiểm tra kiểu dữ liệu TypeScript:** `pnpm typecheck` -> **PASS (0 errors)**.
2. **Kiểm tra Unit Tests:** `pnpm test` -> **PASS 19/19 test files (219/219 tests pass 100%)**.
3. **Kiểm tra Build Turbopack:** `pnpm build` -> **PASS (38 routes được tối ưu hóa thành công)**.
4. **Kiểm thử Database pgTAP:** Đã tạo test suite `supabase/tests/database/sprint_fixes.test.sql` với 25 bài test bao phủ đầy đủ các RPCs và chính sách phân quyền mới.
5. **Môi trường Production:** Đã deploy thành công lên Vercel (`https://crm-hotel-five.vercel.app/`), kết nối đồng bộ tới Supabase `ckjafhzeeckrusqpppka`.

---

## 11. Bàn giao QA Vòng 19 & Triển khai Production chính thức (29/10/2026 - Commit `7bcf961`)

- **Thời gian triển khai:** 21:41 ngày 29/10/2026 (UTC+7).
- **Vercel Deployment ID:** `dpl_7TRW2mF6VCmDmjpvmeGaXhUYDciM` -> URL: `https://crm-hotel-five.vercel.app`.
- **Git Commit:** `7bcf961` (`fix(qa-v19): address QA round 19 feedback (provinces 2025, phone masking in edit, error toasts, SOPs)`).
- **Chi tiết các mục xử lý theo báo cáo QA Vòng 19:**
  - **F0 (Xác nhận Production Deploy):** Triển khai trực tiếp qua `vercel --prod --yes` thay vì dựa vào webhook git. Đã xác minh URL `https://crm-hotel-five.vercel.app` nạp bản build mới nhất `READY`.
  - **F1 (Danh mục 34 tỉnh/thành phố chuẩn 2025 theo QĐ 19/2025/QĐ-TTg):**
    - Migration: `20261101000058_fix_vietnam_provinces_2025.sql`.
    - Chuẩn hóa danh mục 34 tỉnh/thành: Hà Nội 01, Cao Bằng 04, Tuyên Quang 08, Điện Biên 11, Lai Châu 12, Sơn La 14, Lào Cai 15, Thái Nguyên 19, Lạng Sơn 20, Quảng Ninh 22, Bắc Ninh 24, Phú Thọ 25, Hải Phòng 31, Hưng Yên 33, Ninh Bình 37, Thanh Hóa 38, Nghệ An 40, Hà Tĩnh 42, Quảng Trị 44, Huế 46, Đà Nẵng 48, Quảng Ngãi 51, Gia Lai 52, Khánh Hòa 56, Đắk Lắk 66, Lâm Đồng 68, Đồng Nai 75, TP.HCM 79, Tây Ninh 80, Đồng Tháp 82, Vĩnh Long 86, An Giang 91, Cần Thơ 92, Cà Mau 96.
    - Đã nạp thành công lên remote database Supabase và cập nhật `src/shared/constants/provinces.ts`.
  - **F2 (Lỗi SĐT che mặt nạ khi lưu form sửa khách):**
    - Server Action: Bổ sung logic tự động bỏ qua `patch.phone` nếu chuỗi chứa ký tự `*` (mặt nạ bảo mật), tránh gửi dữ liệu che vi phạm constraint Regex của Postgres.
    - Database RPC: Sửa hàm `update_guest` để nếu `p_patch ->> 'phone'` chứa `*` thì tự động giữ nguyên SĐT hiện có của khách.
    - RPC `guest_profile`: Sửa logic `v_full` với trường hợp khách mới chưa phát sinh lượt ở (`v_branch_id is null`) thì kiểm tra `exists (select 1 from private.branches_with('guest.view_full'))` để lễ tân/quản lý vẫn xem được đầy đủ dữ liệu khi sửa khách.
    - Form UI: Thêm ghi chú hướng dẫn và huy hiệu nhận biết SĐT đang được bảo vệ.
  - **F3 (Toast lỗi "[object Object]"):**
    - Sửa toàn bộ các vị trí gọi `toast.error` trong `edit-guest-form.tsx`, `branches-table.tsx`, `maintenance-hub.tsx` để hiển thị `res.error.message || res.error.code`, chấm dứt hoàn toàn lỗi serialize object ra toast.
  - **F4 (Lint Biome format):**
    - Định dạng chuẩn cho `provinces.ts` qua `biome format --write`, `pnpm exec biome check` PASS 100%.
  - **F5 (Cập nhật SOP-ADM-04 & SOP-FO-01):**
    - Cập nhật tài liệu quy trình `src/features/guide/data/workflows.ts`:
      - `SOP-ADM-04` (Bước 2): Cập nhật quyền quản lý danh mục phòng cho Quản lý cơ sở (thêm, sửa, ngừng/mở lại kinh doanh cơ sở mình) và Chủ chuỗi (xóa vĩnh viễn phòng trống).
      - `SOP-FO-01` (Bước 3 & 7): Cập nhật vị trí nút "Báo sạch" tại lưới chọn phòng `/check-in` và bảng Khách đang ở `/stays`.
  - **F6 (Nút Export tại /prospects):**
    - Xác nhận: Hệ thống đã đăng ký quyền `prospect.export` ở tầng Database RBAC và permission keys, tuy nhiên giao diện `/prospects` hiện tại chỉ triển khai nút "Nhập Excel/CSV" (`canImport`) và "Thêm khách tiềm năng" (`canManage`), chưa có nút xuất file ra Excel. Đã ghi nhận để phát triển trong đợt tiếp theo.

---

## 12. Tính năng bổ sung: Xoá khách hàng khi dữ liệu không đạt (Migration 59)

- **Mục tiêu:** Cung cấp tính năng xóa cứng an toàn các hồ sơ khách hàng tạo nhầm, dữ liệu test, rác khi chưa từng phát sinh giao dịch.
- **Phân quyền:** Cấp quyền mới `guest.delete` cho các vai trò: `sales`, `branch_manager`, `receptionist`, `owner`. Khai báo đồng bộ tại `src/shared/auth/permission-keys.ts` và bảng `public.permissions`.
- **Cơ chế an toàn (Chặn xóa):**
  - Chặn tuyệt đối nếu khách đã có bất kỳ lượt lưu trú nào trong `stays` (`P0422`: "Khách đã có lịch sử lưu trú, không thể xoá. Dùng gộp hồ sơ hoặc blacklist.").
  - Chặn tuyệt đối nếu khách đang nằm trong danh sách đen (`guest_flags` status `approved`).
  - Chặn nếu khách đã đổi voucher hoặc là đích của hồ sơ gộp.
- **Server Action & RPC:**
  - `delete_guest(p_guest_id)`: RPC `SECURITY DEFINER`, `set search_path = ''`, assert `guest.delete`, dọn sạch các bảng liên quan (cascade) và ghi vết kiểm toán `log_event`.
  - `deleteGuestAction`: Server Action trong `src/features/guests/actions.ts` kiểm tra quyền `guest.delete`, gọi RPC và revalidate `/guests`.
- **Giao diện:**
  - Khu vực Danger Zone ở cuối trang hồ sơ khách (`/guests/[id]`), chỉ hiển thị với người dùng có quyền `guest.delete`.
  - Dialog xác nhận trong trang (sử dụng `@/shared/ui` Dialog) với cảnh báo rõ ràng điều kiện xóa và tên khách hàng, không sử dụng `window.confirm()`.
- **Migration:** `supabase/migrations/20261101000059_delete_guest.sql`.



## 13. Tính năng bổ sung: Xoá khách hàng tiềm năng B2B (Migration 61 & 62)

- **Mục tiêu:** Cho phép xóa bỏ khách tiềm năng rác hoặc tạo nhầm nếu chưa phát sinh chuyển đổi sang hợp đồng đối tác.
- **Phân quyền (Quy định tại Migration 62 theo spec chuẩn):**
  - Chỉ cấp quyền `prospect.delete` cho các vai trò quản trị: **`branch_manager`** và **`owner`**.
  - **Thu hồi** quyền `prospect.delete` từ vai trò `sales` và `receptionist` để tránh nhân viên bán hàng/lễ tân tùy tiện xóa thông tin lead B2B mà không thông qua cấp quản lý.
  - Cấp bổ sung quyền `prospect.export` cho vai trò `sales` để phục vụ trích xuất danh sách khách hàng doanh nghiệp.
- **Ràng buộc an toàn:**
  - Chặn tuyệt đối nếu khách tiềm năng đã được chuyển đổi thành công (`status = 'converted'` hoặc `converted_partner_id is not null`).
  - Ghi nhận đầy đủ vết kiểm toán `log_event` với hành động `prospect.delete`.
- **Giao diện:**
  - Nút "Xoá" và Dialog xác nhận chi tiết tên công ty, người liên hệ và cảnh báo không thể hoàn tác, chỉ hiển thị với vai trò quản lý/chủ chuỗi có quyền `prospect.delete`.

---

## 14. Xử lý Báo cáo QA Vòng 20 & Cải tiến Menu Sidebar (Commit bbfe8fc)

- **Thời gian:** Ngày 30/10/2026.
- **Nội dung xử lý chi tiết:**
  1. **Bug 1 [CAO] - Ngừng kinh doanh phòng thất bại (`rooms_check`):**
     - Sửa constraint check trong bảng `rooms`: Đổi từ `closed_on > opened_on` thành `closed_on >= opened_on` (Migration 62), cho phép đóng phòng mở trong cùng ngày.
     - Bổ sung Dialog xác nhận "Ngừng kinh doanh phòng" trong giao diện `rooms-table.tsx` thay vì thực thi ngay lập tức.
     - Cải thiện thông điệp lỗi tiếng Việt trong Server Action `deactivateRoomAction` / `reactivateRoomAction` nếu vi phạm constraint.
  2. **Bug 2 [CAO] - Điều chỉnh phạm vi quyền xóa khách tiềm năng:**
     - Thu hồi quyền `prospect.delete` từ nhân viên kinh doanh (`sales`) và lễ tân (`receptionist`), đảm bảo chỉ cấp quản lý (`branch_manager`, `owner`) mới có quyền xóa lead.
     - Cập nhật test pgTAP `delete_prospect.test.sql` để xác minh ma trận quyền chuẩn xác.
  3. **Bug 3 [TRUNG BÌNH] - Tạo phiếu sự cố liên chi nhánh thất bại âm thầm:**
     - Tại `src/app/(app)/facilities/report/page.tsx`: Lọc dropdown cơ sở theo quyền thực tế `session.can("wo.create", b.id)` thay vì chỉ dựa vào `report.view_chain`.
     - Tại `report-issue-form.tsx`: Thêm thông báo `toast.success` khi tạo phiếu thành công (hiển thị kèm mã phiếu) và `toast.error` kèm message lỗi cụ thể từ Server Action.
  4. **Bug 4 & 5 [TRUNG BÌNH] - Hiển thị tên đối tác trên `/stays` & Cấp quyền Export cho Sales:**
     - Cấp quyền `prospect.export` cho vai trò `sales` trong Migration 62.
     - Bổ sung trường `partnerName` vào kiểu `InHouseStay` và câu truy vấn `getInHouseStays` (`stays.partner_id -> partners.name`).
     - Hiển thị nhãn tên đối tác (công ty/lữ hành) có biểu tượng tòa nhà ngay cạnh/dưới kênh nguồn khách tại bảng Khách đang ở `/stays`.
  5. **Yêu cầu Sidebar - Bổ sung các nút chức năng theo nhóm:**
     - **Lễ tân & Vận hành:** Giữ nguyên các thao tác cốt lõi.
     - **Khách hàng & Sales:** Thêm liên kết trực tiếp "Thêm hồ sơ khách" (`/guests/new`, icon `UserPlus`, quyền `guest.create`).
     - **Cơ sở vật chất & CSVC:** Thêm liên kết "Tạo phiếu kiểm tra" (`/facilities/inspections/new`, icon `CheckSquare`, quyền `inspection.perform`).
     - **Báo cáo & Doanh thu:** Thêm liên kết "Báo cáo CSVC & Bảo trì" (`/reports/facilities`, icon `Wrench`, quyền `report.view_branch` / `report.view_chain` / `facility.view`).
     - **Hệ thống & Cài đặt:** Tách bạch "Quản lý cơ sở" (`/settings/branches`, quyền `settings.branches` của Owner) và "Danh mục phòng" (`/settings/rooms`, icon `DoorClosed`, quyền `settings.rooms` của Quản lý chi nhánh & Owner).


## 15. Xử lý Báo cáo QA Vòng 21: Xóa mềm Prospect (Thùng rác & Khôi phục), Khóa chi nhánh sự cố, Multi-chunk Excel Export & Cảnh báo xóa khách (Migration 63)

- **Thời gian:** Sáng 30/10/2026.
- **Nội dung xử lý chi tiết theo quyết định User & QA:**
  1. **Xóa mềm Prospect (Soft delete, Thùng rác, Khôi phục, Xóa cứng có kiểm soát) — Migration 63:**
     - Thêm cột `deleted_at timestamptz default null` và `deleted_by uuid` vào `public.tour_prospects`.
     - Unique index trên `tax_code_norm` và `phone_norm` chỉ áp dụng với `deleted_at is null` để các bản ghi trong thùng rác không làm tắc việc tạo mới.
     - Hàm kiểm tra trùng `private.find_prospect_duplicates` tự động bỏ qua các bản ghi có `deleted_at is not null`.
     - **Cấp lại quyền `prospect.delete` cho `sales`** (xóa mềm 1-click trực tiếp vào thùng rác không cần phê duyệt). Lễ tân tiếp tục không có quyền này; quản lý và chủ chuỗi có quyền.
     - **Tạo quyền mới `prospect.purge`** ('Xóa vĩnh viễn khách tiềm năng trong thùng rác') chỉ cấp cho `branch_manager` và `owner`. Khai báo đồng bộ tại `src/shared/auth/permission-keys.ts` và bảng `public.permissions`.
     - **RPC `delete_prospect(uuid)`:** Chuyển sang xóa mềm (`deleted_at = now(), deleted_by = auth.uid()`), ghi nhận tương tác hệ thống `prospect_interactions` và audit event `prospect.delete_soft`.
     - **RPC `restore_prospect(uuid)`:** Khôi phục bản ghi từ thùng rác (`deleted_at = null, deleted_by = null`), ghi nhận tương tác hệ thống và audit event `prospect.restore`.
     - **RPC `purge_prospect(uuid)`:** Chỉ được phép thực hiện từ trong thùng rác (`deleted_at is not null`) và **chặn tuyệt đối** nếu prospect đã chuyển đổi thành đối tác (`status = 'converted'` hoặc `converted_partner_id is not null`).
     - **Giao diện `ProspectsHub`:**
       - Thêm nút chuyển đổi "Thùng rác (X)" trên thanh công cụ.
       - Khi xem danh sách chính: Nút xóa đổi thành "Chuyển vào thùng rác", Dialog xác nhận ghi rõ "Hồ sơ sẽ tạm thời ẩn khỏi danh sách theo dõi nhưng toàn bộ lịch sử chăm sóc và tương tác vẫn được bảo toàn và có thể khôi phục bất kỳ lúc nào".
       - Khi xem danh sách Thùng rác: Hiện banner thông tin rõ ràng; mỗi dòng có nút "Khôi phục" (`RotateCcw`, dành cho sales/quản lý) và nút "Xóa vĩnh viễn" (`Trash2`, dành cho quản lý/chủ chuỗi).
       - Dialog chi tiết prospect (`ProspectDetailDialog`): Nút "Chuyển vào thùng rác" đồng bộ thông điệp.
  2. **Khóa chi nhánh sự cố tại `/facilities/report` về đúng cơ sở phụ trách:**
     - Sửa logic lọc dropdown `branches` ở `src/app/(app)/facilities/report/page.tsx`:
       Đối với nhân viên/kỹ thuật/lễ tân, khóa danh sách cơ sở về đúng `session.branchIds` cố định của tài khoản (kỹ thuật viên Ngô Mây chỉ thấy cơ sở Ngô Mây), tránh tạo nhầm phiếu sang chi nhánh khác mà bản thân không có quyền xem lại. Chủ chuỗi (`isOwner`) vẫn được chọn toàn chuỗi.
  3. **Xuất Excel danh sách Prospect không giới hạn 1000 dòng (Tự động tách nhiều file):**
     - Tại Server Action `exportProspectsAction`: Lấy toàn bộ bản ghi theo bộ lọc (`p_limit: 50000`).
     - Tự động chia nhỏ thành các file $\le 1000$ dòng/file (ví dụ 2347 dòng $\rightarrow$ 3 file: 1000 / 1000 / 347 dòng). Tên file thể hiện rõ phần: `..._phan_1_tren_3.xlsx`, `..._phan_2_tren_3.xlsx`, `..._phan_3_tren_3.xlsx`.
     - Giao diện tải lần lượt các file (có độ trễ tránh browser chặn popup), toast ghi rõ tổng số khách và số file: "Đã xuất 2347 khách hàng tiềm năng B2B, chia làm 3 file Excel".
  4. **Cảnh báo trước khi xóa khách hàng (Guest delete):**
     - Tại `GuestProfileView`: Kiểm tra trước `profile.stays.length > 0` và trạng thái Blacklist (`flags.status === 'approved'`).
     - Nếu khách đã có lượt ở: Hiển thị callout cảnh báo màu đỏ "Không thể xóa: Khách đã có X lượt lưu trú. Hệ thống bảo vệ toàn vẹn lịch sử lưu trú và doanh thu. Nếu hồ sơ bị trùng lặp, vui lòng sử dụng chức năng Đề xuất gộp hồ sơ" và **vô hiệu hóa** nút "Xác nhận xóa vĩnh viễn".
     - Nếu khách đang trong Blacklist: Hiển thị callout cảnh báo màu đỏ và vô hiệu hóa nút xóa.


---

### 16. Bàn giao sau QA Vòng 22 (Trưa 30/10/2026) — Sửa triệt để khóa chi nhánh báo sự cố, tối ưu Export Excel & đồng bộ chi tiết Prospect

- **Ngữ cảnh:** QA Vòng 22 xác nhận 3/4 mục đã PASS hoàn toàn (Xóa mềm prospect + Thùng rác, Export tách file, Cảnh báo xóa khách có lượt ở). Phát hiện 1 mục FAIL (Khóa chi nhánh sự cố vẫn ra 8 cơ sở với tech do dùng sai `session.branchIds` thay vì chi nhánh cố định) và 2 nits hiển thị.
- **Các giải pháp kỹ thuật đã triển khai:**
  1. **Khóa chi nhánh cố định tại `/facilities/report` (Sửa tận gốc):**
     - **Database (Migration 64):** Cập nhật `default_branch_id` trong `public.profiles` cho tài khoản kỹ thuật CSVC (`kythuat@khachsan.vn`) thành cơ sở Ngô Mây (`NGOMAY`), và các tài khoản cơ sở khác (`alohaquynhon@gmail.com` $\rightarrow$ `ALOHA`, `mirasunhotelquynhon@gmail.com` $\rightarrow$ `SUN`, `miraecoquynhon@gmail.com` $\rightarrow$ `ECO`).
     - **Session (`src/shared/auth/session.ts`):** Truy vấn thêm cột `default_branch_id` từ `public.profiles` và trả về `defaultBranchId: string | null` trong `Session`.
     - **Page (`src/app/(app)/facilities/report/page.tsx`):**
       - Xác định `isOwner = session.can("settings.branches")` (loại bỏ hoàn toàn điều kiện `session.branchIds.length >= allBranches.length` vốn bị bypass bởi vai trò technician cấp chain-wide).
       - Đối với non-owner: Lọc theo `session.defaultBranchId` cố định của hồ sơ tài khoản (`allBranches.filter(b => b.id === session.defaultBranchId)`). Khi `branches.length === 1`, giao diện hiển thị badge cố định cơ sở Ngô Mây, triệt tiêu dropdown 8 chi nhánh.
  2. **Tối ưu Export Excel Prospect (`actions.ts` & `prospects-hub.tsx`):**
     - Chuyển `ExcelJS` sang static import ở đầu file `src/features/prospects/actions.ts` thay vì dynamic import trong handler, loại bỏ độ trễ cold-start.
     - Tại `prospects-hub.tsx`: Thêm `toast.loading("Đang chuẩn bị và kết xuất dữ liệu Excel...", { id: "export-prospects" })` phản hồi ngay lập tức lúc bấm nút, hiển thị trạng thái "Đang xuất file..." kèm biểu tượng spinner xoay tròn trên nút và disabled nút trong lúc xuất dữ liệu.
  3. **Đồng bộ hiển thị nút Chuyển vào thùng rác cho prospect đã `converted` (`prospect-detail.tsx`):**
     - Tại `ProspectDetail`: Bỏ điều kiện ẩn nút theo `status !== 'converted'`, cho phép hiển thị nút "Chuyển vào thùng rác" (`canDelete && !p.deleted_at`) cho mọi trạng thái kể cả đã chuyển đổi.
     - Khi mở xem prospect trong Thùng rác (`p.deleted_at`): Hiển thị banner thông tin màu hổ phách, nút "Khôi phục" (`RotateCcw`, canDelete) và nút "Xóa vĩnh viễn" (`Trash2`, canPurge khi chưa converted).
  4. **Nạp dữ liệu mẫu kiểm thử Blacklist xóa khách hàng:**
     - Migration 64 đã nạp sẵn khách hàng `[SEED QA] Khách Blacklist Test Xóa` (SĐT `0988887766`, 0 lượt ở, cờ cảnh báo approved) để QA kiểm thử trực quan cảnh báo đỏ và nút xóa bị disabled trên UI.


---

### 17. Bàn giao sau QA (Chiều 30/10/2026) — Fix upload Hồ sơ pháp lý cho Kỹ thuật, Toast lỗi chuỗi & Chọn ngày tùy chỉnh Báo cáo

- **Ngữ cảnh:** QA phát hiện lỗi upload hồ sơ pháp lý với tài khoản kỹ thuật CSVC (do cổng server action và RPC chỉ check `compliance.manage` trong khi kỹ thuật chỉ có `facility.manage`), toast lỗi hiển thị `[object Object]`, và yêu cầu bổ sung chọn khoảng ngày tùy chỉnh ("Từ ngày" - "Đến ngày") cho 2 trang Báo cáo.
- **Các giải pháp kỹ thuật đã triển khai:**
  1. **Upload Hồ sơ pháp lý & Phân quyền Kỹ thuật (Chọn Phương án b):**
     - **Quyền (`src/shared/auth/require-permission.ts`):** Thêm hàm `requireAnyPermission(perms: Permission[], branchId?: string | null)` cho phép kiểm tra nếu người dùng sở hữu ít nhất 1 trong danh sách quyền.
     - **Server Actions (`src/features/facilities/actions.ts`):**
       - `createComplianceUploadSignedUrlAction`: Gọi `requireAnyPermission(["compliance.manage", "facility.manage"], branchId)`
       - `upsertComplianceDocAction`: Gọi `requireAnyPermission(["compliance.manage", "facility.manage"], parsed.data.branch_id)`
     - **Database (Migration 65):** Cập nhật RPC `public.upsert_compliance_doc` chấp nhận `compliance.manage` HOẶC `facility.manage` tại cơ sở `v_branch_id`.
     - **Khóa phạm vi chi nhánh (`/facilities/compliance`):** Khóa danh sách chi nhánh và targetBranchId theo `session.defaultBranchId` đối với non-chain admin (kỹ thuật viên Ngô Mây chỉ quản lý hồ sơ cơ sở Ngô Mây; chủ chuỗi quản lý toàn chuỗi).
     - **Dọn file mồ côi:** Đã xóa file rác `c7b341a4-d67c-482c-a54f-74290548d403/1793349746933_test-upload.pdf` khỏi bucket storage `compliance`.
  2. **Khắc phục triệt để Toast lỗi `[object Object]`:**
     - Thay thế toàn bộ pattern nội suy chuỗi lỗi `${res.error}` thành `res.error.message || res.error.code` tại tất cả các component:
       - `compliance-manager.tsx` (tải file, mở file, lưu hồ sơ)
       - `maintenance-hub.tsx` (cập nhật kế hoạch, đổi trạng thái, xóa kế hoạch, kích hoạt phiếu)
       - `checklists-manager.tsx` (lưu mẫu kiểm tra)
       - `inspection-runner.tsx` (lưu biên bản kiểm tra)
  3. **Thêm chọn khoảng ngày tùy chỉnh cho Báo cáo CSVC (`/reports/facilities`) và Tổng quan KPI (`/reports`):**
     - Bổ sung 2 input date "Từ ngày" + "Đến ngày" kèm nút "Áp dụng" trên toolbar của cả 2 trang.
     - Hỗ trợ chọn nhanh preset ("7 ngày qua", "30 ngày qua", "Tháng này") tự động điền ngày vào 2 ô nhập; khi khoảng ngày không thuộc preset hoặc URL mang `preset=custom` thì hiển thị chỉ báo "Tùy chỉnh".
     - **Validate client chặt chẽ:** Kiểm tra đủ từ ngày và đến ngày; chặn ngày bắt đầu > ngày kết thúc; giới hạn `max={todayVN}` và chặn ngày kết thúc vượt quá ngày hiện tại.
     - **Đổi cơ sở:** Tự động giữ nguyên khoảng ngày tùy chỉnh (`from`, `to`, `preset`).
