# NHỮNG VIỆC CẦN CON NGƯỜI THỰC HIỆN (HUMAN_TODO)
**Dự án:** CRM Chuỗi Khách Sạn (CRM Hotel Multi-Branch)  
**Cập nhật lần cuối:** 22/10/2026

Danh sách các công việc hành chính, bảo mật tài khoản thực tế và đàm phán bên ngoài mà AI Agent không thể và không được phép tự ý thực hiện thay con người:

---

### 🚨 1. Khẩn cấp về Bảo mật (Security & Credentials)
- [ ] **Đổi mật khẩu tài khoản Chủ chuỗi và Lễ tân ngay lập tức:**
  - Tài khoản Chủ chuỗi (`dnduycnhue@gmail.com`) từng xuất hiện trong lịch sử git và báo cáo cũ. Cần đăng nhập Supabase Auth Dashboard hoặc giao diện web để đổi mật khẩu quản trị sang mật khẩu mới an toàn.
  - Đổi mật khẩu tài khoản lễ tân kiểm thử (`letan.boutique@khachsan.vn`).
- [ ] **Làm sạch lịch sử Git (Git History Scrubbing):**
  - Cân nhắc sử dụng công cụ `git-filter-repo` hoặc BFG Repo-Cleaner để loại bỏ vĩnh viễn các commit cũ có chứa thông tin credential trong git tree trước khi public repo rộng rãi cho bên thứ ba.
- [ ] **Chính sách xác thực 2 lớp (MFA / TOTP):**
  - Quyết định nhóm nhân sự nào bắt buộc phải bật MFA (Supabase TOTP) — khuyến nghị: Chủ chuỗi và Giám đốc điều hành.

---

### 🏢 2. Tích hợp phần mềm PMS bên thứ ba (ezCloud) & Cổng khai báo
- [ ] **Làm việc với đại diện kỹ thuật ezCloud:**
  - Xác nhận ezCloud PMS có cung cấp API ghi dữ liệu (Lượt ở / Khách) hay chỉ cho phép đọc / webhook?
  - Xin tài liệu API, điều kiện cấp phép (API Key, giới hạn Rate Limit) và chi phí kết nối.
- [ ] **Cổng khai báo tạm trú (Công an / Bộ Công an):**
  - Tham khảo quy định địa phương về cổng xuất file hoặc API tự động đẩy thông tin khai báo tạm trú cho khách lưu trú.

---

### ⚖️ 3. Pháp lý & Thời hạn lưu trữ dữ liệu cá nhân (GDPR / Nghị định 13/2023)
- [ ] **Xác nhận với luật sư / chuyên viên pháp lý:**
  - Quy định thời hạn bắt buộc phải lưu sổ đăng ký lưu trú tại cơ sở kinh doanh khách sạn.
  - Thống nhất các mốc ẩn danh hóa và xóa dữ liệu (Đề xuất của hệ thống: Xóa ảnh CCCD sau 24 tháng; ẩn danh hóa thông tin liên hệ sau 36 tháng kể từ lần ở cuối cùng).

---

### 👥 4. Thống nhất nội bộ chuỗi với Chủ khách sạn
- [ ] **Chốt quy định phân quyền chéo chi nhánh:**
  - Lễ tân chi nhánh A có được xem số CCCD của khách từng ở chi nhánh B hay chỉ được xem tên, hạng thẻ và lịch sử số lần ở?
- [ ] **Dọn dẹp dữ liệu kiểm thử còn sót trên Production:**
  - Xóa hồ sơ khách kiểm thử "TEST CLAUDE REVIEW 01" (SĐT `0999999111`) và các lượt ở thử nghiệm nếu không còn nhu cầu đối soát.
