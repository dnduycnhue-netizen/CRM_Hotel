export const messages = {
  errors: {
    UNAUTHENTICATED: "Phiên đăng nhập đã hết hạn hoặc cần xác thực 2 lớp",
    FORBIDDEN: "Bạn không có quyền thực hiện thao tác này",
    PAGE_FORBIDDEN: "Bạn không có quyền truy cập trang này",
    NOT_FOUND: "Không tìm thấy dữ liệu",
    CONFLICT: "Dữ liệu đã bị người khác thay đổi, vui lòng tải lại",
    DUPLICATE_DOCUMENT: "Số giấy tờ này đã thuộc về khách khác",
    DUPLICATE_PHONE: "SĐT này đang thuộc về khách khác (có thể cần gộp hồ sơ)",
    ROOM_OCCUPIED:
      "Phòng đang có khách (hoặc trùng thời gian với lượt ở khác khi nhập bù)",
    ROOM_OUT_OF_ORDER: "Phòng đang khóa ngừng bán (sự cố, sửa chữa)",
    VALIDATION: "Dữ liệu không hợp lệ",
    MODULE_DISABLED: "Chức năng đang tắt ở cơ sở này",
    BLACKLIST_ACK_REQUIRED: "Khách có cảnh báo, cần xác nhận đã đọc",
    RATE_LIMITED: "Thao tác quá nhanh, thử lại sau ít giây",
    UNKNOWN: "Đã có lỗi xảy ra, vui lòng thử lại sau",
  },
  auth: {
    INVALID_CREDENTIALS:
      "Email hoặc mật khẩu không chính xác, vui lòng kiểm tra lại.",
    RATE_LIMITED:
      "Hệ thống đang nhận quá nhiều lượt đăng nhập. Vui lòng đợi vài phút rồi thử lại.",
    USER_BANNED: "Tài khoản đang bị khóa. Vui lòng liên hệ quản trị viên.",
    EMAIL_NOT_CONFIRMED:
      "Tài khoản chưa được xác nhận email. Vui lòng liên hệ quản trị viên.",
    SERVICE_UNAVAILABLE:
      "Không kết nối được dịch vụ đăng nhập. Vui lòng thử lại sau ít phút.",
  },
  prospects: {
    GENERIC: "Không thể xử lý yêu cầu, vui lòng thử lại sau ít phút.",
    NO_FILE: "Chưa chọn file để nhập.",
    FILE_TOO_LARGE: "File quá lớn (tối đa 2 MB).",
    FILE_TYPE: "Chỉ hỗ trợ file .xlsx hoặc .csv.",
    FILE_UNREADABLE:
      "Không đọc được file. Hãy dùng file mẫu và lưu dạng .xlsx hoặc .csv (UTF-8).",
    EMPTY_FILE: "File không có dòng dữ liệu.",
    MISSING_NAME_COLUMN:
      'Không tìm thấy cột tên công ty (ví dụ: "Tên công ty"). Hãy dùng file mẫu.',
    TOO_MANY_ROWS: "Mỗi lần nhập tối đa 500 dòng. Hãy chia nhỏ file.",
    DUP_PHONE: "Số điện thoại này đã có trong hệ thống",
    DUP_TAX: "Mã số thuế này đã có trong hệ thống",
  },
  common: {
    save: "Lưu",
    cancel: "Hủy",
    confirm: "Xác nhận",
    delete: "Xóa",
    edit: "Chỉnh sửa",
    search: "Tìm kiếm...",
    loading: "Đang tải...",
    noData: "Không có dữ liệu",
  },
} as const;
