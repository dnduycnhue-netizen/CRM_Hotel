export const messages = {
  errors: {
    UNAUTHENTICATED: "Phiên đăng nhập đã hết hạn hoặc cần xác thực 2 lớp",
    FORBIDDEN: "Bạn không có quyền thực hiện thao tác này",
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
