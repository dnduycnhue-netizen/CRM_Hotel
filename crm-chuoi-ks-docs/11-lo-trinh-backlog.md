# 11 – Lộ trình và backlog

Ước tính cho **1 dev fullstack** quen Next.js + Supabase: khoảng 6 tuần tới go-live giai đoạn 1. Có 2 dev thì tách song song: một người làm DB/RPC/test, một người làm giao diện.

## 1. Sprint

Ước tính cho **1 dev fullstack** quen Next.js + Supabase: khoảng **9 tuần** tới go-live đủ phạm vi v2 (v1 là 6 tuần; CSVC + báo cáo thêm ~3 tuần). Có 2 dev: một người làm DB/RPC/test, một người làm giao diện → khoảng 5–6 tuần.

| Sprint | Thời lượng | Mục tiêu | Kết quả demo được |
| --- | --- | --- | --- |
| S0 – Nền móng | 3 ngày | Repo, CI, Supabase local/staging, migration 0001–0006, đăng nhập, khung app | Đăng nhập, thấy shell trống, CI xanh |
| S1 – Phân quyền + cài đặt | 1 tuần | Migration 0007–0010, `my_access`, session, `<Can>`, cài đặt cơ sở/phòng/người dùng/vai trò/module/nguồn khách/tham số | Chủ chuỗi tạo 8 cơ sở, phòng, 19 tài khoản; quản lý tick quyền, bật/tắt module |
| S2 – Check-in + lượt ở | 1 tuần | `lookup_for_checkin`, `find_similar_guests`, `check_in_guest` (nguồn khách, nhập bù), màn Check-in, Khách đang ở, sửa/gia hạn/đổi phòng/trả/hủy 6 giờ | Lễ tân check-in khách mới < 30 giây; quản lý nhập bù được |
| S3 – Tìm kiếm + hồ sơ + sales | 1 tuần | `search_guests`, command palette, `get_guest_profile`, `create_guest`, giao sales, ghi chú, tag, hạng 24 tháng | Sales thêm khách, chỉ thấy đầy đủ khách mình phụ trách |
| S4 – Blacklist + gộp + nhật ký + xuất | 1 tuần | Cờ + duyệt, gộp hồ sơ + job trùng, `/approvals`, `/audit`, `export_guests` + file xlsx | Quản lý duyệt; lễ tân xuất ≤ 500 dòng cơ sở mình |
| S5 – CSVC 1 | 1 tuần | Migration 0012: vị trí, tài sản (nhập Excel, tem QR), nhà cung cấp, phiếu sự cố + khóa phòng + vòng đời, cảnh báo | Báo sự cố từ điện thoại → khóa phòng → kỹ thuật xử lý → nghiệm thu → mở bán |
| S6 – CSVC 2 | 1 tuần | Bảo trì định kỳ + job, kiểm tra checklist, hồ sơ pháp lý + nhắc hạn | Phiếu định kỳ tự sinh; mục kiểm tra không đạt tự sinh phiếu |
| S7 – Báo cáo | 1 tuần | Migration 0013, `report_kpis`, `report_series`, `report_monthly`, `report_facilities`, biểu đồ, số liệu nền tháng, nhập doanh thu tháng, xuất Excel | Chủ chuỗi xem công suất, khách quay lại, nguồn khách, CSVC so với cùng kỳ |
| S8 – PWA + hoàn thiện + go-live | 1 tuần | Manifest, service worker, cài iOS/Android, tự khóa, header bảo mật, đo hiệu năng, UAT, đào tạo, nhập số liệu nền | 8 cơ sở dùng thật |

Có thể go-live sớm sau S4 (phần khách hàng) rồi bật dần CSVC và báo cáo bằng ma trận module; lễ tân được đào tạo sớm hơn và dữ liệu cho báo cáo bắt đầu tích lũy sớm hơn.

## 2. User story và tiêu chí nghiệm thu

### Check-in

**US-01** Là lễ tân, tôi gõ SĐT khách cũ và hệ thống điền sẵn thông tin để check-in nhanh.
- Gõ đủ 10 số SĐT đã có → trong ≤ 300 ms form được điền họ tên, giới tính, ngày sinh, địa chỉ; CCCD hiện dạng che.
- Thẻ bên phải hiện số lượt ở, cơ sở + ngày gần nhất, 5 ghi chú gần nhất.
- Lưu → số lượt ở tăng đúng 1 (kiểm tra lại trong hồ sơ).

**US-02** Là lễ tân, tôi nhập khách mới và được báo lỗi ngay khi gõ sai.
- CCCD không đủ 12 số hoặc mã tỉnh sai → báo lỗi dưới ô, nút Lưu bị khóa.
- CCCD lệch giới tính/năm sinh → cảnh báo vàng, có nút "Vẫn lưu".
- SĐT `+84 905 123 456` được chuẩn hoá thành `0905123456`.

**US-03** Là lễ tân, tôi thêm người đi cùng chỉ bằng CCCD/Passport.
- Module `companions` tắt → không thấy phần người đi cùng; gọi RPC kèm người đi cùng bị từ chối `MODULE_DISABLED`.
- Người đi cùng không có giấy tờ → báo lỗi.

**US-04** Là lễ tân, khi khách có blacklist tôi phải thấy cảnh báo rõ ràng.
- Cờ đã duyệt → khung đỏ, lý do, cơ sở ghi nhận; Lưu chỉ hoạt động khi đã tick xác nhận.
- Lượt ở lưu `blacklist_ack_by`, `blacklist_ack_at`.

**US-05** Là lễ tân, tôi không thể check-in vào phòng đang có khách.
- Phòng có lượt `in_house` không xuất hiện trong danh sách; nếu hai người cùng bấm, người sau nhận `ROOM_OCCUPIED`.

### Lượt ở

**US-06** Sửa lượt ở không làm thay đổi số lượt ở; hai người sửa cùng lúc thì người sau nhận `CONFLICT`.
**US-07** Hủy trong 24h với quyền `stay.cancel`; sau 24h cần `stay.cancel_late`; lý do ≥ 5 ký tự; số lượt ở giảm 1.
**US-08** Nhận phòng lúc 02:00 ngày 15 → `business_date` = ngày 14 (giờ cắt đêm 06:00).

### Tìm kiếm và hồ sơ

**US-09** Là sales, tôi tìm được khách bằng: tên không dấu (`nguyen van a`), 4 số cuối SĐT, 6 số cuối CCCD, email, passport.
- Từ khoá không bao giờ xuất hiện trên URL.
- Gọi quá 60 lần/phút → `RATE_LIMITED`.

**US-10** Là sales có `guest.view_full`, tôi xem đủ CCCD, ngày sinh, địa chỉ; mỗi lần mở có một dòng `guest.view_full` trong nhật ký.
**US-11** Là lễ tân không có `guest.view_full`, tôi chỉ thấy CCCD che và năm sinh.

### Phân quyền

**US-12** Là chủ chuỗi, tôi tick/bỏ tick quyền của vai trò trong ma trận; người dùng thuộc vai trò đó thấy thay đổi ở lần tải trang kế tiếp.
**US-13** Là chủ chuỗi, tôi đặt "Cấm xuất Excel" cho một quản lý cụ thể; người đó mất nút xuất, gọi thẳng RPC bị `FORBIDDEN`.
**US-14** Quản lý có `settings.users` không thể cấp quyền mà chính mình không có, không thể sửa quyền của chính mình.
**US-15** Chuyển module `blacklist` sang Chỉ xem ở CS2 → vẫn xem cờ, không đề xuất/duyệt được ở CS2.

### Blacklist, gộp, nhật ký

**US-16** Đề xuất blacklist cần lý do ≥ 10 ký tự, ảnh ≤ 5 MB; quản lý cơ sở duyệt; cờ đỏ hiện ở mọi cơ sở.
**US-17** Job đêm tạo đề xuất gộp cho cặp cùng tên + ngày sinh; cặp đã từ chối không bị đề xuất lại.
**US-18** Gộp → lượt ở, ghi chú, giấy tờ dồn về hồ sơ giữ lại; tìm hồ sơ cũ bằng link → tự chuyển hướng sang hồ sơ giữ lại.
**US-19** Nhật ký lọc được theo người, cơ sở, đối tượng; xem diff trước/sau.

### Theo phản hồi CĐT (v2)

**US-22** Nguồn khách bắt buộc; kênh đối tác/công ty bắt buộc chọn đối tác, thiếu → `VALIDATION`.
**US-23** Quản lý nhập bù lượt ở 30 ngày trước có giờ trả thực tế → lưu `checked_out`, `entry_mode = backdated`; lễ tân làm vậy → `FORBIDDEN`; trùng thời gian cùng phòng → `ROOM_OCCUPIED`.
**US-24** Lễ tân hủy lượt ở sau 6 giờ → `FORBIDDEN`; quản lý hủy được.
**US-25** Sales thêm khách với SĐT mới → tạo hồ sơ, sales là người phụ trách; SĐT đã có → báo đã tồn tại, hồ sơ cũ không đổi.
**US-26** Sales mở hồ sơ khách không phụ trách → CCCD che, không có ngày sinh; khách mình phụ trách → đầy đủ.
**US-27** Quản lý sửa quyền tài khoản Chủ chuỗi → `FORBIDDEN`.
**US-28** Hạng động: với cấu hình mẫu, khách đến lần 2 → sau khi lưu báo lên Đồng; lần 3 thẻ khách hiện Đồng, giảm 3%; lượt ở lưu `tier_id`, `discount_pct`. Đổi % giảm của Đồng → lượt cũ giữ nguyên 3%.
**US-28b** Quản lý đổi cách tính sang số đêm, thêm hạng Kim cương ≥ 30 → có hiệu lực ngay, không sửa code; trùng ngưỡng → báo lỗi.
**US-28c** Quản lý gán hạng Vàng thủ công 12 tháng cho khách VIP (bắt buộc lý do) → khách hiện Vàng dù chưa đủ ngưỡng; lễ tân không thấy nút gán.
**US-28d** Chủ chuỗi tạo nhân sự mới không chọn vai trò, tự tích 5 quyền → người đó chỉ có đúng 5 quyền; chọn vai trò mẫu Lễ tân rồi bỏ tích "Xuất Excel" → mất đúng quyền đó.

### Cơ sở vật chất và báo cáo

**US-29** Lễ tân báo sự cố kèm "Phòng ngừng bán" từ điện thoại → phòng không check-in được tới khi quản lý nghiệm thu đóng phiếu.
**US-30** Kỹ thuật chỉ thấy nút chuyển trạng thái hợp lệ cho phiếu được giao; hoàn thành bắt buộc ghi kết quả.
**US-31** Kế hoạch bảo trì 30 ngày, báo trước 7 ngày → phiếu tự sinh đúng ngày, không sinh trùng; đóng phiếu → hạn kế tiếp +30 ngày.
**US-32** Hồ sơ bảo hiểm cháy nổ còn 20 ngày hết hạn → hiện ở trang Cảnh báo.
**US-33** Báo cáo tháng 9/2026 so với cùng kỳ: thẻ công suất hiện chênh lệch theo "điểm"; tháng trước ngày chạy thật dùng số liệu nền, ghi rõ nguồn.
**US-34** Phòng khóa 5 đêm → báo cáo trừ 5 đêm khỏi đêm phòng khả dụng.

### PWA

**US-20** Trên Android cài được app từ nút "Cài ứng dụng"; trên iOS có hướng dẫn Thêm vào Màn hình chính; mở app vào thẳng màn Tìm kiếm.
**US-21** Mất mạng → thấy trang offline/banner, không mất dữ liệu đang nhập; đăng xuất → cache bị xoá.

## 3. Definition of Done

- [ ] Tiêu chí nghiệm thu của story đều đạt trên staging.
- [ ] Unit + pgTAP + E2E liên quan đã viết và pass trong CI.
- [ ] Không còn cảnh báo ERROR ở Supabase Security Advisor.
- [ ] Giao diện kiểm tra ở 1366×768 (máy quầy) và 390×844 (điện thoại).
- [ ] Câu chữ tiếng Việt có dấu, nằm trong `vi.ts`.
- [ ] Tài liệu trong thư mục này được cập nhật nếu đổi schema, quyền, module.

## 4. UAT trước go-live

1. Mỗi cơ sở 1 lễ tân check-in 10 khách giả (5 mới, 5 cũ, 1 có cờ, 1 khách quốc tế, 1 gia đình 3 người) trên staging.
2. Đo thời gian check-in trung bình; mục tiêu ≤ 30 giây khách mới.
3. Sales tìm 10 khách bằng các kiểu từ khoá khác nhau trên điện thoại đã cài PWA.
4. Chủ chuỗi đổi quyền một lễ tân và xác nhận hiệu lực ngay.
5. Diễn tập: khóa một tài khoản → không đăng nhập được, quyền rỗng.

## 5. Quyết định đã chốt với CĐT (21/10/2026)

| Câu hỏi | Quyết định |
| --- | --- |
| Lễ tân xem hồ sơ đầy đủ khách không ở cơ sở mình? | Có |
| Sales sửa thông tin khách? | Không; được thêm mới và ghi chú |
| Ngưỡng hạng | Theo số đêm, 24 tháng; Bạc 5 đêm, Vàng 20 đêm |
| Thời hạn lễ tân tự hủy | 6 giờ |
| Nguồn khách ngay GĐ1? | Có |
| Tài khoản ban đầu | 1 chủ chuỗi, 2 quản lý, 16 lễ tân |
| Dữ liệu khách cũ | Không nhập; quản lý được nhập bù lượt ở quá khứ |
| Người duyệt gộp hồ sơ, blacklist cấp chuỗi | Quản lý |

## 5b. Câu hỏi còn mở

- [x] **Danh sách 8 cơ sở và số phòng**: đã nhận 21/10/2026: 8 cơ sở, 240 phòng, nạp bằng `seed/branches_rooms.sql`. Còn chờ CĐT xác nhận 13 ô nhập sai đã sửa theo tầng (1 ô ở Eco, 12 ô ở Bãi Xếp), Eco không có tầng 7, tên đầy đủ, địa chỉ từng cơ sở.
- [ ] 2 quản lý phụ trách toàn chuỗi hay chia mỗi người 4 cơ sở? (tài liệu đang giả định toàn chuỗi)
- [ ] Xác nhận lại rủi ro: 16 lễ tân xem CCCD/ngày sinh/địa chỉ khách toàn chuỗi và xuất Excel. Đề xuất giữ giới hạn 500 dòng, chỉ khách cơ sở mình, CCCD che, báo cáo tuần các lần xuất.
- [ ] Lễ tân, sales có xem báo cáo không? (mặc định không)
- [ ] Có nhập số liệu nền 12–24 tháng từ ezCloud để so sánh cùng kỳ ngay năm đầu không? Ai nhập?
- [ ] Có bật nhập doanh thu tháng để xem ADR, RevPAR không?
- [ ] Bao nhiêu tài khoản Kỹ thuật? Có thuê ngoài bảo trì (thang máy, PCCC, điều hòa) theo hợp đồng không?
- [ ] Mỗi cơ sở thuộc Phụ lục I hay II (cơ sở có nguy hiểm cháy nổ) để đặt chu kỳ tự kiểm tra PCCC định kỳ 1 năm hay 6 tháng.
- [ ] **Hạng thành viên**: chốt tính theo số lần hay số đêm, ngưỡng Đồng/Bạc/Vàng, % giảm giá từng hạng, cửa sổ 24 tháng hay trọn đời, lượt đạt ngưỡng được giảm ngay hay từ lần sau. Hệ thống đang dùng giá trị mẫu: theo số lần, Đồng ≥ 2 (3%), Bạc ≥ 5 (5%), Vàng ≥ 10 (10%), 24 tháng, áp từ lần sau.
- [ ] Chính sách lưu giữ dữ liệu khách; nội dung thông báo xử lý dữ liệu cá nhân tại quầy (cần luật sư xem).

## 6. Giai đoạn sau (không làm ở giai đoạn 1)

| Hạng mục | Ghi chú kiến trúc |
| --- | --- |
| Đồng bộ ezCloud (API hoặc import Excel hằng ngày) | `features/integrations/ezcloud`, `stays.source = 'ezcloud_import'`, `stays.external_ref` đã có sẵn |
| Zalo ZNS: cảm ơn + link review Google theo cơ sở, sinh nhật | Bảng `outbox_messages` + Edge Function; chỉ gửi cho khách có consent |
| Đối tác tour, hợp đồng, khách đoàn, hoa hồng | Module đã đăng ký sẵn (`is_available = false`) |
| Check-in offline | Cần quyết định nghiệp vụ trước (rủi ro trùng phòng) |
| Quét QR CCCD | Module `qr_cccd`; đầu đọc 2D dạng bàn phím hoặc camera (`BarcodeDetector`) |
