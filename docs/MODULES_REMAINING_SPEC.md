# ĐẶC TẢ CHỨC NĂNG CÁC MODULE CÒN LẠI — CRM CHUỖI KHÁCH SẠN

**Repo:** `dnduycnhue-netizen/CRM_Hotel` — commit `0a43c2f` (24/10/2026, QA round 9)
**Phạm vi:** các module có trong màn hình **Cài đặt → Bật/tắt module** (`/settings/modules`) nhưng chưa xây hoặc mới xây một phần.
**Người thực thi:** dev / AI agent (Antigravity). Bắt buộc tuân thủ `AGENTS.md` (route mỏng, feature độc lập, quyền 2 lớp, ghi qua Server Action + RPC, bảng mới bật RLS trong cùng migration, permission key khai báo 2 nơi).
**Bản 2 (24/10/2026):** đã cập nhật theo quyết định của CĐT — xem §19. Module `asm_export` **bỏ khỏi phạm vi**.

> Cách đọc: mỗi module có 5 phần — **Hiện trạng / DB / RPC / UI / Nghiệm thu**. Tên migration đề xuất bắt đầu từ `20261101000035_…`. Chữ ký RPC có sẵn đã kiểm tra trong migration; RPC "mới" là phải viết.

---

## 0. Bảng hiện trạng (đối chiếu code thực tế, không theo HANDOVER_NOTES)

| Module key (DB) | Tên | `is_available` | Hiện trạng thực tế | Ưu tiên |
|---|---|---|---|---|
| — | **Trang bật/tắt module** | — | **Giả: nút Lưu chỉ hiện toast, không gọi RPC** | **P0** |
| `companions` | Người đi cùng | true | Có tab xem trong hồ sơ; check-in gửi `companions: []` cứng; không có action thêm | P1 |
| `international` | Khách quốc tế | true | Check-in nhận diện passport, có `nationality`, `phone_intl`; chỉ còn bổ sung nhẹ (hạn passport, combobox quốc tịch) | P3 |
| `merge` | Gộp hồ sơ | true | Xong | — |
| `blacklist` | Blacklist | true | Xong | — |
| `loyalty` | Hạng thành viên | true | DB + tính hạng xong; **không có UI cấu hình; chưa hỗ trợ chính sách theo mùa/năm** (RPC `set_loyalty_rules`, `set_guest_tier_override` có nhưng không gọi) | P1 |
| `consent` | Đồng ý nhận tin | true | Bật/tắt từng kênh trong hồ sơ; check-in chưa ghi nhận; chưa có danh sách lọc/xuất | P2 |
| `birthday` | Sinh nhật | false | Chưa xây | P2 |
| `vouchers` | Voucher | false | Chưa xây | P3 |
| `qr_cccd` | Quét QR CCCD | **true (sai)** | Chưa có dòng code nào — đang cho bật dù chưa xây | P1 |
| `partners` + `partner_contracts` + `group_bookings` + `commissions` | Đối tác mở rộng | false | Chỉ có danh mục đối tác cơ bản ở `/settings/sources` | P3 |
| `facilities` | Tài sản & vị trí | true | Thêm tài sản + đổi trạng thái; **thiếu CRUD vị trí, nhà cung cấp, sửa tài sản, in tem QR** | P2 |
| `work_orders` | Sự cố & sửa chữa | true | Xong | — |
| `preventive` | Bảo trì định kỳ | true | Tạo kế hoạch; **không sửa/tắt; không tự sinh phiếu khi đến hạn** | P1 |
| `inspections` | Kiểm tra phòng/khu vực | true | Chỉ đọc danh sách; **không có UI thực hiện kiểm tra, không quản lý mẫu checklist** (RPC `submit_inspection` có sẵn) | P1 |
| `compliance` | Hồ sơ pháp lý | true | Chỉ có trang cảnh báo đọc; **không thêm/sửa hồ sơ, không upload file** | P1 |
| `reports` | Báo cáo | true | Xong | — |
| `revenue_input` | Nhập doanh thu tháng | true | Trang `/reports/monthly` chỉ đọc; **không có form nhập `branch_monthly_figures`** | P1 |
| `feedback` | Phản hồi & sự cố khách | false | Chưa xây | P2 |
| `asm_export` | Xuất khai báo lưu trú | false | Chưa xây — **CĐT quyết định bỏ, giữ `is_available=false`** | Bỏ |

Lưu ý thêm: bảng `calendar_events` (ngày lễ/sự kiện cho báo cáo cùng kỳ) có trong DB nhưng không có UI — xử lý chung trong mục `reports` (§16).

---

## 1. [P0] Trang Bật/tắt module — làm thật

### Hiện trạng
- `module-matrix-table.tsx` → `handleSave()` chỉ `toast.success(...)`; trạng thái ban đầu lấy từ `defaultState`, **không đọc `branch_modules`**.
- `admin/data/modules.ts` có mảng fallback `SYSTEM_MODULES_CATALOG` dùng **key lệch với DB** (`companion`/`companions`, `voucher`/`vouchers`, `partner`/`partners`, `facility`/`facilities`, `wo`/`work_orders`, `pm`/`preventive`, `inspection`/`inspections`, `revenue`/`revenue_input`, `asm`/`asm_export`), tên module cũng khác seed.
- Sidebar ẩn menu theo permission → đúng hướng, vì `private.rebuild_*` đã cắt permission khi module `off` / chỉ giữ `view` khi `readonly`. Nhưng vì trang module không lưu, cơ chế này chưa bao giờ được dùng thật.

### Việc cần làm
1. **Xóa** `SYSTEM_MODULES_CATALOG` fallback. Nếu query `modules` lỗi → ném lỗi, để `error.tsx` xử lý. Một nguồn sự thật duy nhất là bảng `modules`.
2. Data mới `getBranchModuleMatrix()` (feature `admin`): trả `{ modules[], branches[], states: Record<moduleKey, Record<branchId, 'on'|'readonly'|'off'>> }` — state tính bằng `coalesce(branch_modules.state, modules.default_state)`, core luôn `on`. Có thể đọc qua `my_access()` hoặc query trực tiếp 2 bảng (đã có policy `read_all`).
3. Server Action `setBranchModulesAction(changes: {branchId, moduleKey, state}[])`:
   - `requirePermission('settings.modules')`.
   - Gọi tuần tự RPC có sẵn `set_branch_module(p_branch_id, p_module_key, p_state, p_config)` cho từng thay đổi (RPC đã tự: chặn module `is_available=false`, kiểm tra `depends_on` khi bật, tắt dây chuyền module con khi tắt).
   - Trả `ActionResult<{ applied: number; cascaded: string[] }>`; gom lỗi P0422/P0409 thành câu tiếng Việt (vd. "Phải bật *Đồng ý nhận tin* trước khi bật *Voucher*").
4. UI:
   - Mỗi ô 3 trạng thái **Bật / Chỉ xem / Tắt**. Module `is_available=false` → khóa ô, badge "Sắp có".
   - Khi bật module có phụ thuộc chưa bật → dialog "Cần bật kèm: …" → đồng ý thì gửi cả cụm.
   - Khi tắt module cha → cảnh báo danh sách module con sẽ bị tắt theo.
   - Cột "Áp dụng cho tất cả cơ sở" ở đầu mỗi hàng.
   - Sau khi lưu: `router.refresh()` để sidebar và session nhận permission mới.
5. Sửa seed: `qr_cccd.is_available = false` cho tới khi §5 xong (migration `…035_module_availability.sql`). Mỗi module trong tài liệu này khi xong thì migration của nó tự `update modules set is_available = true`.
6. **Helper chặn module ở UI**: `session.moduleState(branchId, key)` (dữ liệu đã có trong `my_access().branches[].modules`). Dùng để ẩn tab/khối trong trang dùng chung (vd. tab "Người đi cùng" trong hồ sơ khi module `off`).

### Nghiệm thu
- Tắt `blacklist` ở cơ sở A → lễ tân cơ sở A không thấy menu Phê duyệt/tab cờ; RPC `propose_flag` ở A trả lỗi quyền. Cơ sở B không đổi.
- `readonly` → xem được, mọi nút ghi ẩn và RPC ghi bị chặn.
- Bật `vouchers` khi `consent` đang tắt → bị chặn với thông báo rõ ràng.
- Reload trang → trạng thái giữ nguyên. Audit log ghi từng thay đổi.
- Test pgTAP: `set_branch_module` với 3 trạng thái + cascade.

---

## 2. [P1] `companions` — Người đi cùng

### Hiện trạng
RPC `check_in_guest(p_payload)` **đã hỗ trợ** `companions: [{...guest}]` và gọi `private.assert_module(branch,'companions')`. `check-in/actions.ts` dòng ~165 gửi `companions: []` cứng. Hồ sơ có tab đọc.

### Việc cần làm
**Check-in form**
- Khối "Người đi cùng" (hiện khi module `on`): nút "+ Thêm người", mỗi dòng: ô tra cứu SĐT/CCCD/Passport (dùng lại `lookupGuestAction`) → nếu khớp thì gắn `guest_id`, không thì nhập mới: họ tên*, giới tính*, ngày sinh, quốc tịch, loại + số giấy tờ (trẻ em < 14 tuổi cho phép không có giấy tờ — cần ghi chú "trẻ em").
- Zod: tối đa 10 người/lượt; không trùng giấy tờ với khách chính hoặc nhau.
- Gửi vào `payload.companions`.

**Sau check-in (lượt đang ở)**
- RPC mới `add_stay_companion(p_stay_id, p_guest jsonb)` — `assert_perm_at('companion.manage', branch)` + `assert_module`; tạo/khớp guest, insert `stay_guests (is_primary=false)`; chặn khi lượt ở đã `checked_out`/`cancelled` quá 24h.
- RPC mới `remove_stay_companion(p_stay_id, p_guest_id)` — chỉ trong ngày check-in.
- `/stays` (bảng khách đang ở): nút "Người đi cùng (n)" mở dialog thêm/xóa.

**Hồ sơ khách**: tab hiện danh sách người từng đi cùng (gộp theo guest, số lần đi cùng, lần gần nhất), click sang hồ sơ người đó.

**Tính lượt ở cho hạng thành viên — nhân viên chọn từng người (quyết định CĐT)**
- Migration: `alter table stay_guests add column counts_for_loyalty boolean not null default true;` (khách chính luôn `true`, có `CHECK (is_primary = false or counts_for_loyalty)`).
- Mỗi dòng người đi cùng ở check-in / dialog `/stays` có checkbox **"Tính lượt cho hạng thành viên"**. Giá trị mặc định lấy từ chính sách hạng đang hiệu lực (`loyalty_policies.companions_count_default`, §3) — nhân viên bỏ tick hoặc tick tùy trường hợp.
- Đổi sau khi đã lưu: RPC mới `set_companion_loyalty(p_stay_id, p_guest_id, p_counts boolean)` — perm `companion.manage`, ghi audit, chỉ cho phép khi lượt ở chưa trả phòng quá 7 ngày (sau đó cần `loyalty.override`).
- **Sửa hàm tính `guest_stats` / `private.guest_tier()`**: chỉ đếm lượt ở/đêm từ `stay_guests` có `counts_for_loyalty = true`. Viết pgTAP cho cả 2 trường hợp.

### Nghiệm thu
- Check-in 1 khách chính + 2 người đi cùng → 3 dòng `stay_guests`, 1 `is_primary`.
- Người đi cùng A được tick, B bỏ tick → sau trả phòng chỉ A tăng 1 lượt trong `guest_stats`.
- Đổi tick sau khi trả phòng → hạng của người đó tính lại, có dòng `guest_tier_events`.
- Module `off` → khối ẩn, payload có companions thì RPC từ chối.

---

## 3. [P1] `loyalty` — Hạng thành viên & giảm giá

### Hiện trạng
Bảng `loyalty_tiers`, `guest_tier_events`, `app_settings['loyalty.rules']`, các cột `tier_override_*` trên `guests`; hàm `private.guest_tier()`. RPC `set_loyalty_rules(p_rules)` và `set_guest_tier_override(...)` có sẵn nhưng **không có UI gọi**. Trang `/settings/loyalty` chưa tồn tại. Hiện chỉ có **một bộ quy tắc + một bộ hạng dùng chung mọi thời điểm**.

### Quyết định CĐT
Ngưỡng hạng, % giảm, cửa sổ tính hạng **nhập tay trong trang cài đặt**, **thay đổi được theo mùa hoặc theo năm**. Không tự động sinh, không import.

### Thiết kế: "Chính sách hạng" có thời hạn hiệu lực
Mỗi mùa/năm là một **chính sách** gồm quy tắc + bộ hạng riêng. Tại một ngày bất kỳ chỉ có **đúng 1 chính sách hiệu lực**.

**DB (migration mới `…_loyalty_policies.sql`)**
- `loyalty_policies`: id, name (vd. "Năm 2027", "Mùa cao điểm hè 2027"), valid_from date, valid_to date null (null = đến khi có chính sách sau), basis (`stays`/`nights`), window_months (0 = trọn đời), count_current_stay bool, `companions_count_default` bool (mặc định tick ô "tính lượt" cho người đi cùng — §2), status (`draft`/`active`/`archived`), note, created_by, approved_by, approved_at.
  - Ràng buộc: các chính sách `active` **không chồng ngày** (`exclude using gist (daterange(valid_from, coalesce(valid_to,'infinity'),'[]') with &&) where status='active'` — cần extension `btree_gist`).
- `loyalty_tiers`: thêm `policy_id uuid not null references loyalty_policies(id)`; đổi unique `(min_value) where is_active` thành `(policy_id, min_value)`; `code` unique theo `(policy_id, code)`.
  - Giữ **`code` ổn định giữa các chính sách** (vd. `silver`, `gold`) để so sánh khách lên/xuống hạng qua các mùa.
- Migration dữ liệu: tạo 1 chính sách "Mặc định" từ `app_settings['loyalty.rules']` + các hạng hiện có, `valid_from = '2020-01-01'`, `status='active'`. Sau đó `app_settings['loyalty.rules']` chỉ còn để tương thích, đánh dấu deprecated.
- `guest_tier_events`: thêm `policy_id` để biết hạng được tính theo chính sách nào.
- Cột `stays.tier_id_at_checkin`, `stays.policy_id_at_checkin` — **chốt hạng lúc check-in**; đổi chính sách giữa chừng không làm đổi giảm giá của lượt đang ở.

**Hàm tính**
- `private.active_loyalty_policy(p_date date default current_date)` → policy đang hiệu lực.
- Sửa `private.guest_tier(p_guest_id, p_date default current_date)`: dùng quy tắc + hạng của chính sách hiệu lực ngày đó; đếm lượt/đêm trong `window_months` tính lùi từ `p_date`, chỉ đếm `stay_guests.counts_for_loyalty = true` (§2). Hạng gán tay (`tier_override_*`) vẫn là "sàn" như hiện tại, nhưng override trỏ theo **`code`** để không gãy khi sang chính sách mới (đổi `tier_override_id` → `tier_override_code text`).
- Cron hằng ngày 00:05 VN: nếu hôm nay là `valid_from` của chính sách mới → tính lại hạng toàn bộ khách có lượt ở trong cửa sổ, ghi `guest_tier_events` cho người đổi hạng.

**RPC (perm `loyalty.configure`, `assert_perm` cấp chuỗi)**
- `upsert_loyalty_policy(p jsonb)` — chỉ sửa được khi `draft`; chính sách `active` chỉ được sửa `name`, `note`, `valid_to` (rút ngắn, không lùi về quá khứ).
- `upsert_loyalty_tier(p jsonb)` / `delete_loyalty_tier(p_id)` — chỉ trong chính sách `draft`.
- `clone_loyalty_policy(p_from_id, p_name, p_valid_from)` — nhân bản sang bản nháp mới để sửa cho mùa sau (cách làm nhanh nhất cho người dùng).
- `preview_loyalty_policy(p_id)` — chỉ đọc: số khách mỗi hạng nếu áp chính sách này, số người lên/xuống hạng so với hiện tại.
- `activate_loyalty_policy(p_id)` — kiểm tra ≥1 hạng, ngưỡng tăng dần, không chồng ngày với chính sách active khác, `valid_from >= today` (không kích hoạt hồi tố); chuyển `active`; ghi audit. Nếu trùng `valid_from` hôm nay → tính lại hạng ngay.
- `archive_loyalty_policy(p_id)` — chỉ chính sách đã hết hạn.
- `set_guest_tier_override` giữ nguyên chữ ký, nhận thêm `p_tier_code`.

**UI `/settings/loyalty`** (thêm vào sidebar nhóm Cài đặt)
- Dòng thời gian các chính sách: quá khứ (xám) / đang hiệu lực (xanh) / sắp tới (xanh nhạt) / nháp (viền đứt).
- Màn chính sách: form quy tắc (cơ sở tính, cửa sổ tháng, tính lượt đang ở, mặc định tick người đi cùng, ngày hiệu lực) + bảng hạng nhập tay (tên, code, ngưỡng, % giảm, quyền lợi, màu, thứ tự). Mọi ô số là ô nhập tay, có validate (ngưỡng nguyên ≥ 0 và tăng dần; % giảm 0–100, tối đa 2 chữ số thập phân).
- Nút: **Nhân bản sang mùa mới** · **Xem trước ảnh hưởng** · **Kích hoạt** (dialog xác nhận nhắc lại ngày hiệu lực + số khách đổi hạng).
- Cảnh báo trên trang khi chính sách hiện hành có `valid_to` trong 30 ngày mà chưa có chính sách kế tiếp.

**Hồ sơ khách** (perm `loyalty.override`)
- Thẻ hạng: hạng hiện tại, chính sách đang áp, nguồn (tự tính / gán tay đến ngày …), tiến độ đến hạng kế ("còn 2 lượt").
- Nút "Gán hạng thủ công" (chọn hạng theo code, lý do* ≥ 10 ký tự, hạn tùy chọn) / "Bỏ gán tay".
- Tab "Lịch sử hạng" từ `guest_tier_events` (kèm tên chính sách).

**Check-in**: thẻ "Chính sách hạng" hiện hạng + % giảm theo chính sách hiệu lực ngày check-in; lưu vào `stays.tier_id_at_checkin`. Phần giảm giá thực áp dụng xem quy tắc không cộng dồn ở §7.

### Nghiệm thu
- Tạo chính sách "Năm 2027" từ bản nhân bản, đổi ngưỡng Gold 5→6, kích hoạt từ 01/01/2027 → đến ngày đó khách có 5 lượt rớt Silver, có `guest_tier_events`.
- Không kích hoạt được 2 chính sách chồng ngày; không sửa được ngưỡng của chính sách đang active.
- Khách đang ở qua thời điểm đổi chính sách vẫn giữ % giảm lúc check-in.
- Gán tay Gold đến 31/12 → sang chính sách mới vẫn giữ Gold (theo code) tới hạn, sau đó về hạng tự tính.
- Lễ tân không có `loyalty.configure` → không thấy trang, RPC trả lỗi quyền.

---

## 4. [P2] `consent` — Đồng ý nhận tin

### Hiện trạng
Bảng `guest_consents (guest_id, channel ∈ zalo/sms/email/phone, granted, recorded_at, recorded_by, source)`; RPC `set_guest_consent`; tab trong hồ sơ. `check_in_guest` đã nhận `consents: {"zalo": true, …}` nhưng form không gửi.

### Việc cần làm
- **Check-in**: khối 4 checkbox kênh (mặc định **không tick** — Nghị định 13/2023 yêu cầu đồng ý chủ động), câu nhắc lễ tân đọc cho khách. Gửi `payload.consents`; `source='front_desk'`.
- **Lịch sử đồng ý**: hiện tại bảng có PK `(guest_id, channel)` nên ghi đè, mất bằng chứng. Migration: thêm bảng `guest_consent_events` (append-only: guest_id, channel, granted, source, recorded_by, recorded_at, note) + trigger từ `guest_consents`. Tab hồ sơ hiện lịch sử.
- **Rút đồng ý**: khách yêu cầu → bỏ tick → ghi event `granted=false`. Không xóa.
- **Danh sách khách đồng ý** `/guests?consent=zalo` (lọc trong `get_guests_list` — thêm tham số `p_consent_channel`). Xuất Excel danh sách đồng ý theo kênh qua `export_guests` (chỉ SĐT/Zalo/email + tên + hạng; không CCCD). Đây là đầu vào cho §5–6.

### Nghiệm thu
- Check-in tick Zalo → `guest_consents` + 1 event.
- Xuất danh sách Zalo chỉ gồm khách `granted=true` mới nhất.

---

## 5. [P1] `qr_cccd` — Quét QR CCCD

### Mục tiêu
Lễ tân dùng camera điện thoại/máy tính (PWA) quét mã QR mặt trước CCCD gắn chip để điền tự động, giảm gõ sai.

### Đặc tả
- Định dạng QR CCCD: chuỗi phân cách `|`: `số CCCD|số CMND cũ|Họ tên|ngày sinh ddmmyyyy|Giới tính|Địa chỉ thường trú|ngày cấp ddmmyyyy` (một số thẻ thiếu trường CMND cũ → xử lý theo số lượng phần tử).
- Domain thuần `features/check-in/domain/cccd-qr.ts`: `parseCccdQr(raw): Result<{cccd, oldId?, fullName, dob, gender, address, issuedOn}>`; validate 12 số, ngày hợp lệ, chuẩn hóa họ tên (đã có `normalize.ts`). Vitest với 5+ mẫu (thẻ có/không CMND cũ, ký tự lạ, chuỗi rác).
- Component `CccdQrScanner` (client): ưu tiên `BarcodeDetector` API; fallback thư viện `@zxing/browser` (lazy import). Nút "Quét CCCD" trên ô tra cứu ở check-in, form tạo khách, form người đi cùng (§2).
- Luồng: quét → parse → gọi `lookupGuestAction('cccd', số)` → khớp thì mở hồ sơ cũ (đối chiếu, gợi ý cập nhật địa chỉ nếu khác) / không khớp thì điền sẵn form khách mới.
- Địa chỉ trên QR là dạng chuỗi cũ (trước sáp nhập tỉnh 2025) → chỉ điền `address_line`, **không tự map** `province_code/ward_code`; lễ tân chọn lại.
- **Bảo mật**: không lưu ảnh, không gửi chuỗi QR thô lên server, không log; chỉ gửi trường đã parse qua Server Action. Camera chỉ bật khi bấm nút, tắt khi đóng dialog.
- Khi module `off` → ẩn nút quét.
- Migration: `update modules set is_available = true where key='qr_cccd'` khi xong.

### Nghiệm thu
- iPhone Safari + Android Chrome (PWA đã cài) quét được trong < 3 giây ở ánh sáng thường.
- Từ chối quyền camera → thông báo và quay về nhập tay.

---

## 6. [P2] `birthday` — Sinh nhật (phụ thuộc `consent`)

### Đặc tả
- Trang `/guests/birthdays` (perm `birthday.view`): tab **Hôm nay / 7 ngày tới / Tháng này / Tháng sau**; cột: tên, ngày sinh (dd/mm, ẩn năm), tuổi tròn (nếu tròn chục), hạng, lần ở gần nhất + cơ sở, các kênh đã đồng ý, sales phụ trách, trạng thái "đã chúc".
- Lọc theo cơ sở từng ở, hạng, chỉ khách có đồng ý.
- RPC mới `list_birthdays(p_from date, p_to date, p_branch uuid null)` — xử lý vắt năm (12→1) và 29/02 (năm thường → 28/02). Chỉ trả khách `merged_into is null` và không bị blacklist.
- Ghi nhận chúc: bảng mới `guest_greetings (id, guest_id, kind='birthday', year, channel, sent_by, sent_at, voucher_id null)` unique `(guest_id, kind, year)`. RPC `mark_birthday_greeted`.
- Nút "Sao chép lời chúc" theo mẫu (thiết lập trong `app_settings['birthday.template']`, hỗ trợ `{ten}`, `{hang}`); nút mở Zalo `https://zalo.me/{sdt}` (chỉ khi đã đồng ý kênh Zalo). **Phase này không tự gửi tin** (chưa có Zalo OA/ZNS).
- Widget dashboard: "n khách sinh nhật hôm nay".
- Tùy chọn khi module `vouchers` bật: nút "Chúc + phát voucher" (§7).

### Nghiệm thu
- Khách sinh 31/12, xem "7 ngày tới" ngày 28/12 → có mặt. Không hiện khách chưa đồng ý khi bật lọc.

---

## 7. [P3] `vouchers` — Voucher (phụ thuộc `consent`)

### Quyết định CĐT
Voucher là **chương trình khuyến mãi riêng**, độc lập với hạng thành viên. Khi một lượt ở có cả giảm giá hạng và voucher: **chỉ áp dụng mức giảm cao nhất, không cộng dồn**. Mỗi lượt ở tối đa **1 voucher**.

### DB (migration mới)
- `voucher_campaigns`: id, name, kind (`birthday`/`return`/`manual`/`partner`), discount_type (`pct`/`amount`/`free_night`/`upgrade`), discount_value, max_discount_amount null (trần cho loại %), min_nights, valid_days (hạn tính từ ngày phát), valid_from/valid_to, branch_ids uuid[] (rỗng = toàn chuỗi), max_issues, max_per_guest, is_active, terms text.
- `vouchers`: id, code unique (8 ký tự, bỏ O/0/I/1), campaign_id, guest_id, issued_by, issued_at, expires_at, status (`issued`/`reserved`/`redeemed`/`expired`/`void`), redeemed_stay_id, redeemed_branch_id, redeemed_by, redeemed_at, void_reason.
- Thêm vào `stays` (ghi lại **mức giảm thực áp dụng**): `room_rate numeric null` (giá phòng/đêm lễ tân nhập — tùy chọn), `discount_source` (`none`/`tier`/`voucher`), `discount_pct`, `discount_amount`, `voucher_id`, `discount_decided_by`. `CHECK (discount_source <> 'voucher' or voucher_id is not null)`.
- RLS: đọc theo quyền module; ghi chỉ qua RPC.

### Quy tắc chọn mức giảm (domain thuần `features/vouchers/domain/best-discount.ts`, có Vitest)
Đầu vào: % giảm hạng (từ `stays.tier_id_at_checkin`), voucher (loại + giá trị + trần), số đêm, giá phòng/đêm nếu có.
1. Quy đổi cả hai về **số tiền giảm** khi có `room_rate`:
   - hạng: `rate × nights × pct`; voucher `pct`: `min(rate × nights × pct, max_discount_amount)`; `amount`: giá trị; `free_night`: `rate × số đêm miễn phí`.
   - Chọn số tiền lớn hơn; bằng nhau → ưu tiên **hạng** (giữ voucher cho khách dùng lần sau).
2. Không có `room_rate`:
   - cả hai đều `%` (không trần) → so %;
   - khác loại (vd. hạng 10% vs voucher 300.000đ / free night / upgrade) → **không tự quyết**: hiện 2 lựa chọn cạnh nhau, lễ tân bấm chọn 1, lưu `discount_decided_by`.
3. Kết quả luôn chỉ 1 nguồn giảm. Nếu chọn hạng → voucher **không bị tiêu**, trả về trạng thái `issued`.

### RPC
- `upsert_voucher_campaign` — perm mới `voucher.configure` (thêm vào `permissions` + `permission-keys.ts`, gán quản lý + chủ chuỗi).
- `issue_voucher(p_campaign_id, p_guest_id)` — `voucher.issue`; khách phải có đồng ý ≥1 kênh, chưa vượt `max_issues`/`max_per_guest`, voucher sinh nhật tối đa 1/năm.
- `validate_voucher(p_code, p_branch, p_guest_ids uuid[], p_nights)` — chỉ đọc, trả hợp lệ/lý do + giá trị.
- `apply_stay_discount(p_stay_id, p_source, p_voucher_code null, p_room_rate null)` — `voucher.redeem` (nếu dùng voucher) hoặc `stay.update`; tính lại theo quy tắc trên **ở server** (không tin client), khóa voucher `for update`, đổi `issued → redeemed`. Lượt ở đã có voucher → phải gỡ trước.
- `remove_stay_discount(p_stay_id)` — trả voucher về `issued` nếu chưa trả phòng.
- `cancel_stay` / hủy lượt ở: tự trả voucher về `issued`.
- `void_voucher(p_id, p_reason)`; cron hằng ngày `issued` quá hạn → `expired`.

### UI
- `/settings/vouchers`: chiến dịch.
- Hồ sơ khách: tab Voucher (đang có / đã dùng / hết hạn), nút "Phát voucher".
- Check-in + `/stays`: khối **"Giảm giá"**: dòng hạng (tự hiện) + ô "Mã voucher" + ô giá phòng/đêm (tùy chọn). Hiện kết quả: **"Áp dụng: Voucher SUMMER27 – giảm 500.000đ (cao hơn giảm hạng Gold 10% = 360.000đ). Không cộng dồn."** Trường hợp không so được → 2 thẻ để chọn.
- Báo cáo: số phát / số đổi / tỉ lệ đổi theo chiến dịch; số lượt ở giảm theo hạng vs voucher.

### Nghiệm thu
- Gold 10%, voucher 15% → áp voucher; voucher 5% → áp hạng, voucher vẫn `issued`.
- Không có giá phòng, hạng 10% vs voucher 300.000đ → bắt buộc lễ tân chọn; không lưu được cả hai.
- Một mã chỉ đổi được 1 lần dù 2 lễ tân bấm đồng thời. Hủy lượt ở → voucher dùng lại được.
- Mã của cơ sở A không dùng ở B nếu chiến dịch giới hạn.

---

## 8. [P3] `international` — Khách quốc tế (bổ sung nhẹ)

### Hiện trạng
Có passport trong `guest_documents`, `nationality`, `phone_intl`. Vì **bỏ module khai báo lưu trú** (§12), không cần thu thông tin thị thực/nhập cảnh chi tiết.

### Việc cần làm (nhỏ)
- Thêm `passport_expires_on` vào `guest_documents`; cảnh báo ở check-in khi passport hết hạn < 6 tháng hoặc đã hết hạn.
- Combobox quốc tịch ISO-3166 có tên tiếng Việt + tiếng Anh, tìm được bằng cả hai; ghim 10 quốc tịch hay gặp lên đầu (cấu hình `app_settings['intl.pinned_countries']`).
- Ngôn ngữ ưu tiên của khách (`guests.preferred_language`) — phục vụ lời chúc sinh nhật/voucher (§6–7).
- Báo cáo: số khách theo quốc tịch (thêm chiều `nationality` vào `report_kpis`/`report_series`).

---

## 9. [P2] `facilities` — Tài sản & vị trí (bổ sung)

### Hiện trạng
`createAssetAction`, `updateAssetStatusAction`. Bảng `facility_locations`, `vendors`, `asset_categories` không có UI ghi.

### Việc cần làm
- `/facilities/locations`: cây vị trí theo cơ sở (Tòa → Tầng → Khu vực/Phòng); thêm/sửa/ngưng. Phòng lấy từ `rooms`, không nhân bản.
- `/facilities/vendors`: nhà cung cấp/thợ ngoài (tên, dịch vụ, SĐT, email, MST, ghi chú, đánh giá 1–5).
- `/facilities/assets/[id]`: chi tiết + sửa tài sản; lịch sử phiếu sự cố, bảo trì, hồ sơ kiểm định (§11) của tài sản; tổng chi phí sửa chữa.
- **In tem QR**: chọn nhiều tài sản → trang in khổ A4 lưới tem (mã tài sản + tên + QR trỏ `/{app}/a/{asset_code}`). Route `/a/[code]` (cần đăng nhập) → mở tài sản + nút "Báo sự cố cho thiết bị này" điền sẵn form `wo.create`.
- Danh mục loại tài sản ở `/settings` (perm `facility.manage`).

---

## 10. [P1] `preventive` + `inspections` — Bảo trì định kỳ & Kiểm tra

### 10a. Bảo trì định kỳ
**Hiện trạng**: `createPmPlanAction`; `pm_plans` có `interval_days`, `lead_days`, `next_due_date`, `default_assignee_id`, `vendor_id`; không có cron sinh phiếu.

- Sửa/tạm dừng/kích hoạt kế hoạch (RPC `update_pm_plan`, perm `pm.manage`).
- **Tự sinh phiếu**: hàm `private.generate_pm_work_orders()` chạy cron `0 23 * * *` (06:00 VN): với kế hoạch `is_active` và `next_due_date - lead_days <= today` mà chưa có phiếu mở cho chu kỳ đó → tạo `work_orders` (type `preventive`, gán `default_assignee_id`, checklist copy vào mô tả/thuộc tính, liên kết `pm_plan_id` — thêm cột nếu chưa có).
- Khi phiếu PM đóng (`wo.close`) → `last_done_date = ngày đóng`, `next_due_date = ngày đóng + interval_days` (trigger trên `wo_transitions`).
- UI `/facilities/maintenance`: lịch tháng (quá hạn đỏ / sắp đến hạn vàng), danh sách kế hoạch, nút "Tạo phiếu ngay".

### 10b. Kiểm tra phòng / khu vực / PCCC
**Hiện trạng**: `checklist_templates`, `inspections`, RPC `submit_inspection(p)` đã có — tự sinh phiếu sửa chữa cho mỗi mục `fail`. UI chỉ đọc.

- `/settings/checklists` (perm `inspection.manage`): CRUD mẫu: tên, phạm vi (`room`/`area`/`fire_safety`/`other`), danh sách mục `{key, label, critical, hint}`, sắp xếp kéo thả. RPC mới `upsert_checklist_template`. Sửa mẫu đã dùng → tạo phiên bản mới (giữ mẫu cũ `is_active=false`) để kết quả cũ không lệch.
- `/facilities/inspections/new` (perm `inspection.perform`), **tối ưu điện thoại**: chọn cơ sở → mẫu → phòng/vị trí → mỗi mục 3 nút lớn **Đạt / Không đạt / Không áp dụng**, `Không đạt` bắt buộc ghi chú, cho chụp ảnh (Supabase Storage bucket `inspections`, private, đường dẫn lưu trong `results[].photos`). Gửi `submit_inspection`. Màn kết quả hiện điểm và danh sách phiếu đã sinh.
- Lịch sử: lọc theo cơ sở/phòng/mẫu/khoảng ngày; xu hướng điểm theo phòng.
- Kế hoạch kiểm tra định kỳ: dùng lại `pm_plans` với cột mới `template_id` → cron sinh "nhiệm vụ kiểm tra" thay vì phiếu sửa.

---

## 11. [P1] `compliance` — Hồ sơ pháp lý, kiểm định

### Hiện trạng
`compliance_doc_types`, `compliance_docs` (có `expires_on`, `file_paths`, `is_current`), RPC `facility_alerts`. UI chỉ có trang cảnh báo.

### Việc cần làm
- `/facilities/compliance` (perm `compliance.view`): ma trận **cơ sở × loại hồ sơ** — ô xanh (còn hạn), vàng (≤ `remind_days`), đỏ (hết hạn), xám (chưa có).
- Thêm/gia hạn hồ sơ (perm `compliance.manage`): loại, số, cơ quan cấp, ngày cấp, ngày hết hạn, tài sản (nếu `applies_to='asset'`, vd. kiểm định thang máy, bình áp lực), file PDF/ảnh (Storage bucket private `compliance`, đọc qua signed URL 5 phút), ghi chú. Gia hạn = tạo bản mới, bản cũ `is_current=false` (giữ lịch sử).
- RPC mới `upsert_compliance_doc`; policy Storage chỉ cho người có quyền tại cơ sở đó.
- Danh mục loại hồ sơ ở settings (seed gợi ý: GPKD, Giấy chứng nhận đủ điều kiện ANTT, nghiệm thu/kiểm tra PCCC, kiểm định thang máy, ATTP, giấy phép môi trường, hợp đồng bảo hiểm cháy nổ, xếp hạng sao).
- Thông báo: badge trên sidebar số hồ sơ sắp hết hạn; email tuần cho chủ chuỗi (Supabase Edge Function + cron) — tùy chọn, bật qua `branch_modules.config`.

---

## 12. ~~`asm_export` — Xuất khai báo lưu trú~~ — BỎ

CĐT quyết định không làm. Giữ dòng module trong bảng `modules` với `is_available = false` (không xóa để không gãy khóa ngoại `permissions.asm.export`). Ẩn hẳn khỏi trang bật/tắt module: thêm cột `modules.is_hidden boolean default false`, set `true` cho `asm_export`. Xóa mục "Cổng khai báo tạm trú" khỏi `docs/HUMAN_TODO.md`.

---

## 13. [P2] `feedback` — Phản hồi & sự cố khách

### DB
`guest_feedback`: id, branch_id, guest_id null, stay_id null, channel (`front_desk`/`phone`/`zalo`/`google_review`/`booking`/`agoda`/`tripadvisor`/`other`), kind (`complaint`/`compliment`/`suggestion`/`incident`), category (phòng, vệ sinh, tiếng ồn, nhân viên, đồ ăn, wifi, giá, khác), rating 1–5 null, content, severity (`low`/`medium`/`high`), status (`open`/`in_progress`/`resolved`/`closed`), assignee_id, resolution, compensation (text + giá trị), work_order_id null, created_by/at, resolved_at.

### Chức năng
- Ghi nhận nhanh từ hồ sơ khách, từ `/stays` (lượt đang ở) hoặc trang `/feedback/new` (khách vãng lai không có hồ sơ).
- Phản hồi liên quan cơ sở vật chất → nút "Tạo phiếu sửa chữa" (liên kết `work_orders`).
- Hàng đợi `/feedback`: lọc trạng thái/mức độ/cơ sở; SLA: `high` phải có phản hồi trong 2 giờ (tô đỏ khi quá).
- Hồ sơ khách: tab Phản hồi; cảnh báo ở check-in nếu khách có khiếu nại chưa đóng hoặc khiếu nại `high` ở lần trước ("Lần trước phàn nàn tiếng ồn — xếp phòng yên tĩnh").
- Báo cáo: số phản hồi theo loại/danh mục/cơ sở, điểm trung bình, thời gian xử lý trung bình.
- Quyền: dùng `feedback.manage` có sẵn; thêm `feedback.view` và `feedback.close` (quản lý).
- **Khảo sát NPS sau trả phòng: để phase sau** (cần kênh gửi tự động).

---

## 14. [P1] `revenue_input` — Nhập doanh thu tháng

### Hiện trạng
Bảng `branch_monthly_figures` (arrivals, guests, room_nights, available_room_nights, room_revenue, other_revenue, note) + policy insert/update theo cơ sở + audit trigger; `report_monthly` đã join. **Không có form nhập.**

### Quyết định CĐT
**Chưa có kế hoạch tích hợp ezCloud** → nhập tay là cách làm **lâu dài**, không phải tạm thời. Thiết kế form cho người nhập hằng tháng phải nhanh và khó sai.

### Việc cần làm
- Trong `/reports/monthly`: nút "Nhập số liệu tháng" (perm `revenue.input`) → màn nhập dạng **bảng 1 tháng × các cơ sở được quyền** (mỗi hàng 1 cơ sở) để kế toán/quản lý nhập một lần cả chuỗi; hoặc 1 cơ sở × 12 tháng.
- Trường:
  - **Doanh thu phòng, doanh thu khác** (VND, định dạng 1.234.567): nhập tay từ báo cáo ezCloud.
  - **Đêm phòng bán, lượt đến, số khách**: nhập tay theo số ezCloud (vì ezCloud là sổ thật, CRM có thể thiếu khách walk-in không qua CRM). Cạnh mỗi ô hiện **số CRM tự đếm từ `stays`** + chênh lệch %; chênh > 10% tô vàng để người nhập kiểm lại. Ghi chú: đây là ngoại lệ có chủ đích của AGENTS.md luật 12 — số CRM vẫn tính tự động và báo cáo hiện cả hai cột "Theo ezCloud (nhập)" và "Theo CRM".
  - `available_room_nights`: gợi ý = số phòng đang bán × số ngày trong tháng − đêm phòng khóa (`room_blocks`), cho sửa.
- Server Action `saveMonthlyFiguresAction` → RPC mới `upsert_monthly_figures(p_rows jsonb)` (validate, audit thống nhất; không ghi thẳng bảng).
- **Khóa sổ**: cột `locked_at`, `locked_by`; quản lý khóa tháng; mở khóa cần chủ chuỗi + lý do.
- Chỉ số: ADR = room_revenue / room_nights; OCC = room_nights / available_room_nights; RevPAR = room_revenue / available_room_nights; so cùng kỳ năm trước.
- Nhắc việc: ngày 5 hằng tháng, badge "Chưa nhập doanh thu tháng trước: n cơ sở" cho người có `revenue.input`.
- Nhập hàng loạt từ Excel: tải mẫu → upload → xem trước → xác nhận (`exceljs` đã có).

---

## 15. [P3] Nhóm Đối tác: `partners`, `partner_contracts`, `group_bookings`, `commissions`

Thứ tự bắt buộc theo `depends_on`: `partners` → 3 module con.

### 15a. `partners` — Hồ sơ đối tác mở rộng
- Bảng `partners` có sẵn. Thêm: `bank_account_name`, `bank_name`, `bank_account_no` (chỉ hiện cho `commission.manage`), `default_commission_pct`, `owner_id` (sales phụ trách), `rating`.
- `/partners`: danh sách + `/partners/[id]` 360°: thông tin, người liên hệ (bảng mới `partner_contacts`), lượt ở mang về (join `stays.source_channel/partner_id` — kiểm tra cột hiện có), doanh thu ước tính, hợp đồng, công nợ hoa hồng.
- `/settings/sources` giữ danh mục rút gọn; trang mới là bản đầy đủ.

### 15b. `partner_contracts` — Hợp đồng giá
- `partner_contracts`: partner_id, code, valid_from/to, branch_ids, status (`draft`/`active`/`expired`/`terminated`), file_path, note.
- `partner_contract_rates`: contract_id, branch_id, room_type, season (`low`/`high`/`peak` + khoảng ngày), net_rate, allotment/ngày, release_days.
- Check-in: khi chọn đối tác → gợi ý giá hợp đồng còn hiệu lực cho cơ sở + loại phòng. Cảnh báo hợp đồng hết hạn trong 30 ngày.

### 15c. `group_bookings` — Khách đoàn
- `group_bookings`: code, partner_id null, branch_id, leader_guest_id, name, arrival, departure, expected_rooms, expected_pax, status, note.
- Check-in theo đoàn: chọn đoàn → check-in nhiều phòng liên tiếp (mỗi phòng 1 lượt ở, cột mới `stays.group_booking_id`); import danh sách khách đoàn từ Excel (họ tên, giấy tờ, quốc tịch) → khớp/tạo hồ sơ → phân phòng.
- Trả phòng cả đoàn một lần.
- Xuất danh sách đoàn ra Excel (họ tên, giấy tờ, phòng) để lễ tân tự xử lý thủ tục ngoài hệ thống.

### 15d. `commissions` — Hoa hồng

**Quyết định CĐT**: tỷ lệ và cách tính **do sales tự điền, linh hoạt theo từng đối tác**. Hệ thống không áp tỷ lệ mặc định theo loại đối tác.

- Thêm vào `partners` (sales điền ở hồ sơ đối tác, perm `partner.manage`): `commission_type` (`pct`/`fixed_per_room_night`/`fixed_per_booking`/`none`), `commission_value`, `commission_base` (`net` = giá net/giá hợp đồng; `gross` = giá bán cho khách), `commission_note`. Để trống = chưa thỏa thuận → không tự sinh hoa hồng, chỉ cảnh báo.
- Hợp đồng giá (§15b) được ghi đè các trường trên trong thời gian hiệu lực của hợp đồng. Thứ tự ưu tiên: **hợp đồng đang hiệu lực → hồ sơ đối tác → không tính**.
- Mỗi thay đổi tỷ lệ ghi audit (ai đổi, giá trị cũ/mới) — hoa hồng là tiền nên cần vết.
- `commission_entries`: partner_id, stay_id hoặc group_booking_id, **snapshot** `commission_type/value/base` tại thời điểm tạo (đổi tỷ lệ sau không ảnh hưởng bút toán cũ), base_amount, amount, status (`pending`/`approved`/`paid`/`void`), approved_by, paid_at, payment_ref.
- Tự tạo `pending` khi lượt ở có đối tác được trả phòng. Vì CRM không có tiền phòng thật và **không có kế hoạch tích hợp ezCloud**, `base_amount` do sales/kế toán **nhập tay khi duyệt** (gợi ý từ `stays.room_rate × nights` nếu lễ tân đã nhập giá ở §7).
- Màn đối soát theo tháng/đối tác: sửa base_amount → duyệt (`commission.manage`) → đánh dấu đã trả; xuất bảng kê Excel gửi đối tác.

---

## 16. Bổ sung chung cho `reports`
- UI CRUD `calendar_events` (lễ, festival, sự kiện địa phương — vd. Đêm rằm phố cổ Hội An) ở `/settings/calendar`; biểu đồ báo cáo hiển thị vùng tô sự kiện để giải thích biến động cùng kỳ.

---

## 17. Thứ tự triển khai đề xuất

| Sprint | Nội dung | Lý do |
|---|---|---|
| 1 | §1 Trang module thật + sửa catalog + `qr_cccd` về `false` + ẩn `asm_export` | Mọi module khác phụ thuộc cơ chế bật/tắt chạy thật |
| 2 | §3 Chính sách hạng theo mùa/năm, §2 Người đi cùng (có tick tính lượt) | §2 phụ thuộc `companions_count_default` và hàm tính hạng mới của §3 → làm §3 trước |
| 3 | §14 Nhập doanh thu, §10 Bảo trì + kiểm tra, §11 Pháp lý | Hoàn thiện các module đang "bật" nhưng rỗng |
| 4 | §5 QR CCCD, §4 Consent, §8 Quốc tế (nhẹ) | Chuỗi dữ liệu khách |
| 5 | §6 Sinh nhật, §13 Phản hồi, §9 Tài sản bổ sung | Chăm sóc khách |
| 6 | §7 Voucher (không cộng dồn), §15 Đối tác + hoa hồng | Phức tạp nhất; §7 cần `stays.tier_id_at_checkin` từ §3 |

## 18. Checklist bắt buộc cho mỗi module (Definition of Done)
1. Migration: bảng mới bật RLS + policy; hàm `SECURITY DEFINER` có `set search_path = ''`; cuối migration `update public.modules set is_available = true where key = '…'`.
2. Permission mới khai báo ở cả bảng `permissions` và `src/shared/auth/permission-keys.ts`; gán cho role trong seed; test so khớp pass.
3. Mọi RPC ghi: dòng đầu `private.assert_perm_at(...)` (hoặc `assert_perm`) + `private.assert_module(branch, key)`.
4. Server Action: `requirePermission()` → Zod (dùng chung với form) → RPC → `ActionResult<T>`; câu chữ trong `src/shared/i18n/vi.ts`.
5. UI ẩn theo cả **permission** lẫn **trạng thái module** của cơ sở đang chọn; `readonly` ẩn mọi nút ghi.
6. Sidebar + `/guide` (`guide-data.ts`) cập nhật mục hướng dẫn module.
7. pgTAP cho quyền + RLS; Vitest cho domain thuần; 1 kịch bản Playwright cho luồng chính.
8. Không đưa PII vào URL/log/cache SW; file upload dùng bucket private + signed URL.

## 19. Quyết định của CĐT (chốt 24/10/2026)

| # | Câu hỏi | Quyết định | Áp dụng tại |
|---|---|---|---|
| 1 | Người đi cùng có tính lượt ở cho hạng không? | Có option, **nhân viên tick chọn từng người**; mặc định theo chính sách hạng | §2, §3 |
| 2 | Ngưỡng hạng, % giảm, cửa sổ tính hạng | **Trang cài đặt nhập tay**, thay đổi được **theo mùa hoặc theo năm** (chính sách có ngày hiệu lực) | §3 |
| 3 | Mẫu khai báo lưu trú | **Bỏ chức năng** | §12, §8 |
| 4 | Chính sách voucher | Chương trình KM riêng; **chỉ áp mức giảm cao nhất, không cộng dồn** với giảm giá hạng | §7 |
| 5 | Tỷ lệ hoa hồng | **Sales tự điền, theo từng đối tác**; chọn tính trên giá net hoặc giá bán | §15d |
| 6 | Doanh thu tháng từ ezCloud | **Chưa có kế hoạch tích hợp** → nhập tay lâu dài | §14, §15d |

### Còn mở (không chặn sprint 1–3)
- Chiến dịch voucher: ai được tạo/phát (đề xuất: quản lý tạo chiến dịch, sales + lễ tân phát/đổi).
- Có bắt lễ tân nhập giá phòng/đêm ở check-in không (giúp so voucher vs hạng tự động và gợi ý hoa hồng) — đề xuất: **tùy chọn**.
