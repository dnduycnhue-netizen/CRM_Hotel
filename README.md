# CRM Chuỗi Khách Sạn (Hotel Chain CRM)

Hệ thống quản lý quan hệ khách hàng và vận hành dành riêng cho chuỗi khách sạn đa chi nhánh.

- **Production App**: [https://crm-hotel-five.vercel.app](https://crm-hotel-five.vercel.app)
- **Tài liệu bàn giao & Kế thừa**: [HANDOVER_NOTES.md](file:///Users/duyduong/Documents/code/CRM_Hotel/HANDOVER_NOTES.md)
- **Quy chuẩn phát triển bắt buộc**: [AGENTS.md](file:///Users/duyduong/Documents/code/CRM_Hotel/AGENTS.md)

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
