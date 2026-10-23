# TÀI LIỆU KẾ THỪA VÀ BÀN GIAO HỆ THỐNG (HANDOVER & CHANGELOG)
**Dự án:** CRM Chuỗi Khách Sạn (CRM Hotel Multi-Branch)  
**Ngày cập nhật:** 23/10/2026  
**Môi trường:** Production (`https://crm-hotel-five.vercel.app`)  
**Nhánh Git:** `main` (Commit `197903a` - Tích hợp toàn diện các Phase P0, P1, P2, P3, P4)  
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

---

## 6. Lưu ý cho người bảo trì tiếp theo (Caveats & Best Practices)

1. **Next.js 16 Proxy Convention:** Trong phiên bản này, Next.js sử dụng `src/proxy.ts` (thay thế cho `middleware.ts`). Không tạo đồng thời hai file này để tránh lỗi xung đột build Turbopack.
2. **PostgREST Query Typing:** Khi thực hiện `.insert()` hoặc `.update()` trên các bảng chưa sinh đủ type quan hệ hai chiều, hãy cast `(supabase.from('table_name') as any)` để tránh lỗi `SelectQueryError<"Invalid Relationships...">`.
3. **Audit Log:** Mọi hành vi xuất dữ liệu khách (`guest.export_excel`), gỡ cờ Blacklist (`flag.resolve`), trả phòng (`stay.checkout`), thay đổi quyền quản trị đều phải ghi nhận log vào bảng `audit_logs` thông qua RPC `log_event`.
4. **Múi giờ:** Mọi chuỗi ngày giờ từ client gửi lên DB phải chuẩn hóa qua `toVnTimestamptz()` để luôn mang múi giờ `+07:00`. Khi hiển thị luôn dùng `formatDateTimeVN()`.


