import type { RuleGroup } from "../types";

// Bảng tra cứu nhanh các quy tắc "dễ vấp". Con số lấy từ cấu hình thật:
// stay.self_cancel_hours = 6, stay.backdate_after_hours = 12,
// wo.sla_hours (4 / 24 / 72 / 168 giờ), export.max_rows (500 / 5.000).

export const RULE_GROUPS: RuleGroup[] = [
  {
    id: "rules-access",
    title: "Quyền xem & dữ liệu cá nhân",
    iconName: "ShieldCheck",
    rules: [
      {
        rule: "Chọn đúng cơ sở làm việc",
        detail:
          "Tài khoản nhiều cơ sở chọn cơ sở ở góc trên bên trái; tài khoản một cơ sở hiển thị '(Cố định)'. Mọi số liệu và thao tác áp dụng cho cơ sở đang chọn.",
        where: "Thanh đầu trang",
      },
      {
        rule: "SĐT / CCCD bị che",
        detail:
          "Hiển thị dạng 090****232. Chỉ người phụ trách khách đó, quản lý (khách tiềm năng) hoặc chủ chuỗi xem đầy đủ. Số CCCD đã lưu của khách cũ không hiện lại ở check-in.",
        where: "/guests, /search, /prospects",
      },
      {
        rule: "Từ khóa tìm kiếm không nằm trên đường dẫn",
        detail:
          "SĐT / CCCD gõ ở ô tìm kiếm được gửi qua thao tác bảo mật, không ghi vào URL hay lịch sử trình duyệt.",
        where: "Ô tìm kiếm, /search",
      },
      {
        rule: "Không đủ quyền thì được đưa về trang làm việc",
        detail:
          "Mở màn hình không có quyền sẽ chuyển về trang chủ kèm thông báo 'Bạn không có quyền truy cập trang này'. Ẩn nút không phải là bảo vệ duy nhất: quyền còn được kiểm tra lại ở cơ sở dữ liệu.",
      },
      {
        rule: "Xuất Excel có giới hạn",
        detail:
          "Chỉ Quản lý và Chủ chuỗi. Tối đa 500 dòng mỗi lần với người chỉ có quyền ở một vài cơ sở, 5.000 dòng với Chủ chuỗi; CCCD luôn che trừ Chủ chuỗi.",
        where: "/guests",
      },
    ],
  },
  {
    id: "rules-time",
    title: "Thời hạn & điều kiện bắt buộc",
    iconName: "Clock",
    rules: [
      {
        rule: "Hủy lượt ở: 6 giờ",
        detail:
          "Lễ tân hủy được trong 6 giờ kể từ khi nhận phòng, lý do tối thiểu 5 ký tự. Quá 6 giờ chỉ Quản lý / Chủ chuỗi (hủy trễ).",
        where: "/stays",
      },
      {
        rule: "Nhập bù lượt ở: sau 12 giờ",
        detail:
          "Check-in với giờ vào sớm hơn hiện tại quá 12 giờ là nhập bù, chỉ người có quyền nhập bù (Quản lý, Chủ chuỗi) thực hiện.",
        where: "/check-in",
      },
      {
        rule: "SLA phiếu sự cố",
        detail:
          "Khẩn cấp 4 giờ · Ưu tiên cao 24 giờ · Bình thường 72 giờ · Ưu tiên thấp 7 ngày. Quá hạn hiển thị chữ đỏ.",
        where: "/facilities/work-orders",
      },
      {
        rule: "Độ dài lý do tối thiểu",
        detail:
          "Hủy lượt ở 5 ký tự · Đề xuất cờ 10 · Gỡ cờ 5 · Gán hạng thủ công 10 · Mở khóa sổ doanh thu 10 · Kết quả xử lý phiếu 3.",
      },
      {
        rule: "Nhắc chốt doanh thu",
        detail:
          "Từ ngày 5 hằng tháng, màn hình doanh thu hiển thị banner nhắc nhập và khóa sổ tháng trước.",
        where: "/reports/monthly",
      },
      {
        rule: "Cảnh báo hồ sơ pháp lý",
        detail:
          "Mỗi loại hồ sơ có mốc báo trước 30, 60 hoặc 90 ngày trước hạn.",
        where: "/facilities/compliance",
      },
    ],
  },
  {
    id: "rules-guest",
    title: "Hạng thành viên, voucher & Nghị định 13",
    iconName: "Award",
    rules: [
      {
        rule: "Hạng tính tự động, không nhập tay",
        detail:
          "Số lượt ở, số đêm và hạng đều tính từ các lượt ở thực tế. Lượt đã hủy và lượt đang ở không được tính. Mặc định: Đồng từ 2 đêm (-3%), Bạc từ 5 đêm (-5%), Vàng từ 10 đêm (-10%), cửa sổ 24 tháng.",
        where: "/settings/loyalty",
      },
      {
        rule: "Gán hạng thủ công phải có lý do",
        detail:
          "Quản lý / Chủ chuỗi; lý do tối thiểu 10 ký tự, ghi vào lịch sử hạng.",
        where: "Hồ sơ 360",
      },
      {
        rule: "Đồng ý nhận tin tiếp thị (NĐ 13/2023)",
        detail:
          "Tự nguyện, mặc định không tích. SMS / Zalo / Email chỉ gửi cho khách đã đồng ý; nếu chưa, các kênh này bị khóa và chỉ còn gọi điện, chúc trực tiếp hoặc gửi quà.",
        where: "Check-in, /rewards",
      },
      {
        rule: "Voucher sinh nhật",
        detail:
          "Riêng cho khách đó, mặc định giảm 15% (tối đa 500.000đ), hiệu lực 60 ngày, dùng một lần.",
        where: "/rewards",
      },
      {
        rule: "Cờ Blacklist cần Chủ chuỗi duyệt",
        detail:
          "Nhân viên chỉ đề xuất; cờ có hiệu lực toàn chuỗi sau khi duyệt và hiện cảnh báo đỏ ở check-in (phải tick xác nhận đã đọc).",
        where: "/approvals",
      },
    ],
  },
  {
    id: "rules-b2b",
    title: "Khách tiềm năng & đối tác (B2B)",
    iconName: "Handshake",
    rules: [
      {
        rule: "Chống trùng 3 lớp",
        detail:
          "SĐT, MST, tên, website được chuẩn hóa (+84 → 0, bỏ dấu, bỏ 'Công ty / TNHH…'). Trùng MST hoặc SĐT: chặn. Tên + tỉnh hoặc website trùng: cảnh báo, phải ghi lý do nếu vẫn tạo. SĐT trùng khách lẻ: chỉ nhắc nhẹ.",
        where: "/prospects",
      },
      {
        rule: "Một công ty, một sales phụ trách",
        detail:
          "Chỉ người phụ trách và quản lý được sửa, ghi nhật ký, chuyển đổi. Dòng chưa gán: sales bấm 'Nhận chăm sóc'; người nhận sau bị chặn.",
        where: "/prospects",
      },
      {
        rule: "Pipeline có ngày hẹn",
        detail:
          "'Đang chăm sóc' và 'Đang đàm phán' bắt buộc có ngày hẹn; quá ngày hẹn mà chưa liên hệ mới thì vào 'Quá hạn chăm sóc'.",
        where: "/prospects",
      },
      {
        rule: "Chuyển đổi một chiều",
        detail:
          "Khách tiềm năng → Đối tác, không cần duyệt, bấm lần hai không tạo thêm. Hồ sơ tiềm năng khóa sửa sau khi chuyển.",
        where: "/prospects",
      },
      {
        rule: "Hoa hồng tự sinh, quản lý duyệt",
        detail:
          "Đoàn có đối tác và dự toán > 0 tự sinh hoa hồng theo tỷ lệ hợp đồng (mặc định 10%). Quản lý / Chủ chuỗi duyệt rồi chi trả; Sales chỉ xem.",
        where: "/partners",
      },
      {
        rule: "Sales chỉ sửa đoàn của mình",
        detail:
          "Đoàn do người khác tạo chỉ mở xem 'Chi tiết'; Quản lý / Chủ chuỗi sửa được mọi đoàn.",
        where: "/partners",
      },
    ],
  },
];
