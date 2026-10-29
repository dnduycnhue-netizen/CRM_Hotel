# CRM Chuỗi Khách Sạn (Hotel Chain CRM)

Hệ thống quản lý quan hệ khách hàng và vận hành dành riêng cho chuỗi khách sạn đa chi nhánh (8 cơ sở · 240 phòng).

- **Production App**: [https://crm-hotel-five.vercel.app](https://crm-hotel-five.vercel.app)
- **Tài liệu bàn giao & Kế thừa**: [HANDOVER_NOTES.md](file:///Users/duyduong/Documents/code/CRM_Hotel/HANDOVER_NOTES.md)
- **Quy chuẩn phát triển bắt buộc**: [AGENTS.md](file:///Users/duyduong/Documents/code/CRM_Hotel/AGENTS.md)
- **Trạng thái Go-Live**: ✅ Đã hoàn tất & Đã triển khai Production (Commit `7bcf961`, 29/10/2026).

---

## ✨ 5 Tính năng mới hoàn thiện trước Go-Live (29/10/2026)

1. **Báo phòng sạch nhanh cho Lễ tân (`confirm_room_cleaned`)**: Nút 1-chạm xác nhận buồng phòng dọn xong ngay trên form check-in để mở bán phòng ngay mà không phải chờ 6 giờ.
2. **Kênh đối tác khi Check-in**: Dropdown lọc thông minh theo loại đối tác (công ty lữ hành cho kênh `partner`, công ty hợp đồng cho kênh `corporate`), validate bắt buộc qua Zod.
3. **Quản lý danh mục phòng từng khách sạn (`/settings/rooms`)**: Quản lý chi nhánh thêm/sửa/ngừng kinh doanh phòng cơ sở mình; Chủ chuỗi quản lý toàn chuỗi và có quyền xóa vĩnh viễn các phòng trống chưa có lịch sử.
4. **Địa chỉ & 34 tỉnh/thành cư trú sau sáp nhập 2025**: Tích hợp danh mục 34 tỉnh/thành chuẩn Việt Nam 2025 vào bảng `admin_provinces`, đồng bộ form check-in, form tạo, form sửa và trang hồ sơ khách 360°.
5. **Cấp đủ 6 quyền B2B Leads cho Lễ tân**: Lễ tân được cấp đủ quyền xem số điện thoại rõ, tạo mới, sửa, import và convert khách tiềm năng thành khách hàng thực tế.

---

## 🚀 Bắt đầu nhanh

Cài đặt phụ thuộc và khởi chạy máy chủ phát triển cục bộ:

```bash
pnpm install
pnpm dev
```

Mở trình duyệt tại [http://localhost:3000](http://localhost:3000).

## 🧪 Kiểm thử & Xác thực chất lượng

Trước khi tạo pull request hoặc triển khai, luôn đảm bảo vượt qua toàn bộ các bước kiểm tra:

```bash
pnpm typecheck       # Kiểm tra kiểu TypeScript (0 errors)
pnpm test            # Chạy toàn bộ Vitest unit tests
pnpm build           # Kiểm tra Next.js Turbopack build
```

## 📚 Tài liệu chi tiết

Vui lòng xem file [HANDOVER_NOTES.md](file:///Users/duyduong/Documents/code/CRM_Hotel/HANDOVER_NOTES.md) để nắm rõ:
- Toàn bộ 25 mã lỗi QA (QA-01 → QA-25) đã được giải quyết và nguyên nhân gốc rễ.
- Danh sách 6 tài khoản kiểm thử tiêu chuẩn tương ứng với các vai trò trong chuỗi.
- Cấu trúc kiến trúc phân quyền hai lớp (Defense-in-depth) và cơ chế xử lý dữ liệu.
