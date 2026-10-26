import type { ModuleGuide, RoleGuide, WorkflowDiagram } from "../types";

export const ROLE_GUIDES: RoleGuide[] = [
  {
    key: "owner",
    title: "Chủ chuỗi (Owner / Tổng giám đốc)",
    badge: "Toàn quyền hệ thống",
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    iconName: "Crown",
    description:
      "Chịu trách nhiệm chiến lược toàn chuỗi: phê duyệt chính sách phân quyền, quản trị danh mục chi nhánh, phê duyệt các yêu cầu hợp nhất hồ sơ khách hàng nhạy cảm và đối soát báo cáo tài chính cấp tập đoàn.",
    keyResponsibilities: [
      "Quản lý danh sách các khách sạn thành viên trong chuỗi (/settings/branches).",
      "Tạo và phân bổ tài khoản người dùng, gán vai trò theo từng cơ sở (/settings/users).",
      "Khóa / Mở các module chức năng chuyên sâu cho từng chi nhánh (/settings/modules).",
      "Phê duyệt hợp nhất hồ sơ khách hàng trùng lặp trên toàn chuỗi (/approvals).",
      "Đối soát nhật ký kiểm toán hệ thống (Audit Logs) để chống thất thoát dữ liệu (/audit).",
      "Theo dõi KPI doanh thu ròng, RevPAR, ADR, tỷ lệ lấp đầy theo thời gian thực (/reports).",
    ],
    allowedRoutes: [
      {
        path: "/reports",
        label: "Báo cáo Doanh thu chuỗi",
        desc: "Tổng quan doanh thu, so sánh kỳ trước & cùng kỳ năm ngoái.",
      },
      {
        path: "/settings/users",
        label: "Quản trị Tài khoản",
        desc: "Thêm/sửa nhân sự, phân vai trò chi nhánh.",
      },
      {
        path: "/settings/roles",
        label: "Ma trận Phân quyền",
        desc: "Điều chỉnh quyền chi tiết cho từng vai trò.",
      },
      {
        path: "/approvals",
        label: "Trung tâm Phê duyệt",
        desc: "Duyệt gộp hồ sơ khách hàng & gỡ cờ Blacklist.",
      },
      {
        path: "/audit",
        label: "Nhật ký Kiểm toán",
        desc: "Truy vết 100% thao tác nhạy cảm trên hệ thống.",
      },
    ],
    prohibitedActions: [
      "Không tự ý xóa tài khoản Chủ chuỗi cuối cùng (Hệ thống luôn khóa bắt buộc giữ tối thiểu 1 Owner).",
      "Không chia sẻ tài khoản quản trị cho nhân sự cấp dưới; mỗi nhân sự phải có tài khoản riêng.",
    ],
    dailyChecklist: [
      "08:30 — Kiểm tra Dashboard Báo cáo Doanh thu & Tỷ lệ lấp đầy ngày hôm trước.",
      "10:00 — Vào Trung tâm phê duyệt (/approvals) để xử lý các đề xuất gộp hồ sơ khách trùng.",
      "17:00 — Xem báo cáo Cơ sở vật chất (/reports/facilities) để nắm chi phí phát sinh bất thường.",
    ],
    securityNote:
      "Tài khoản Chủ chuỗi có thể xem toàn bộ CCCD/Hộ chiếu dạng rõ và xuất file Excel. Bắt buộc kích hoạt mật khẩu mạnh và không đăng nhập trên máy tính công cộng.",
  },
  {
    key: "branch_manager",
    title: "Quản lý cơ sở (Branch Manager)",
    badge: "Quản lý chi nhánh",
    badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    iconName: "Shield",
    description:
      "Điều hành trực tiếp mọi hoạt động đón tiếp, buồng phòng, bảo trì và nhân sự tại một cơ sở khách sạn cụ thể. Chịu trách nhiệm về chất lượng dịch vụ và doanh thu chi nhánh.",
    keyResponsibilities: [
      "Giám sát tình trạng khách đang lưu trú và công suất phòng tại cơ sở (/stays).",
      "Phê duyệt khóa buồng phòng ngừng kinh doanh (OOO) phục vụ sửa chữa lớn (/facilities/room-blocks).",
      "Phê duyệt cắm cờ Blacklist đối với khách vi phạm quy chế lưu trú (/approvals).",
      "Điều phối và nghiệm thu hoàn tất các phiếu công việc kỹ thuật (/facilities/work-orders).",
      "Xem và phân tích báo cáo doanh thu, nguồn khách của chi nhánh (/reports).",
    ],
    allowedRoutes: [
      {
        path: "/stays",
        label: "Khách đang ở",
        desc: "Theo dõi số lượng khách, số phòng đang sử dụng tại quầy.",
      },
      {
        path: "/facilities/work-orders",
        label: "Phiếu bảo trì CSVC",
        desc: "Điều phối kỹ thuật sửa chữa trang thiết bị.",
      },
      {
        path: "/facilities/room-blocks",
        label: "Khóa phòng OOO",
        desc: "Khóa/Mở buồng phòng phục vụ bảo dưỡng định kỳ.",
      },
      {
        path: "/approvals",
        label: "Phê duyệt vi phạm",
        desc: "Duyệt cờ cảnh báo khách hàng gian lận/hư hại tài sản.",
      },
      {
        path: "/reports",
        label: "Báo cáo chi nhánh",
        desc: "Số liệu kinh doanh thuộc phạm vi chi nhánh phụ trách.",
      },
    ],
    prohibitedActions: [
      "Không can thiệp vào dữ liệu buồng phòng hoặc hồ sơ khách riêng của chi nhánh khác.",
      "Không được quyền gán vai trò Chủ chuỗi hoặc sửa tài khoản của cấp trên.",
    ],
    dailyChecklist: [
      "07:30 — Giao ban đầu ca với Lễ tân: đối soát danh sách khách dự kiến Check-in / Check-out trong ngày.",
      "11:00 — Kiểm tra danh sách buồng phòng đang khóa OOO, hối thúc kỹ thuật bàn giao phòng kịp giờ đón khách.",
      "14:00 — Duyệt các phiếu đề xuất cắm cờ vi phạm hoặc gộp hồ sơ từ bộ phận Lễ tân.",
      "22:00 — Rà soát báo cáo doanh thu ca ngày và ký biên bản đóng ca.",
    ],
    securityNote:
      "Mọi quyết định khóa phòng hoặc duyệt cờ vi phạm đều ghi nhận Audit Log kèm lý do giải trình.",
  },
  {
    key: "receptionist",
    title: "Lễ tân (Receptionist / Front Desk)",
    badge: "Tác nghiệp quầy",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    iconName: "UserCheck",
    description:
      "Tuyến đầu tiếp đón khách hàng: thực hiện tra cứu thông tin khách cũ, tạo thủ tục Check-in phòng nhanh dưới 60 giây, kiểm soát danh sách khách đang ở, xử lý trả phòng (Check-out) và ghi nhận sự cố.",
    keyResponsibilities: [
      "Tra cứu nhanh khách qua Số điện thoại hoặc Số CCCD/Hộ chiếu (/check-in).",
      "Tiếp nhận thông tin khách mới, chuẩn hóa họ tên và ngày sinh theo chuẩn CCCD.",
      "Cảnh báo ngay nếu khách thuộc danh sách cờ đỏ (Blacklist) để có phương án xử lý.",
      "Check-in phòng, gán kênh nguồn (OTA, Direct, Doanh nghiệp) và đối tác lữ hành.",
      "Thực hiện thủ tục Check-out trả phòng hoặc hủy đặt phòng khi có yêu cầu (/stays).",
      "Báo nhanh sự cố kỹ thuật buồng phòng khi khách phản ánh (/facilities/report).",
    ],
    allowedRoutes: [
      {
        path: "/check-in",
        label: "Check-in đón khách",
        desc: "Quy trình tra cứu và check-in phòng nhanh tại quầy.",
      },
      {
        path: "/stays",
        label: "Khách đang ở",
        desc: "Quản lý buồng phòng đang có khách, trả phòng, hủy phòng.",
      },
      {
        path: "/search",
        label: "Tra cứu khách hàng",
        desc: "Tìm kiếm hồ sơ khách theo tên, điện thoại, giấy tờ.",
      },
      {
        path: "/facilities/report",
        label: "Báo sự cố nhanh",
        desc: "Tạo phiếu báo hỏng hóc điều hòa, khóa cửa, bóng đèn.",
      },
    ],
    prohibitedActions: [
      "Tuyệt đối không chụp ảnh CCCD của khách gửi qua mạng xã hội cá nhân (Zalo/Telegram cá nhân).",
      "Không được phép truy cập vào các trang Cài đặt hệ thống, Phân quyền hoặc Nhật ký kiểm toán.",
      "Không tự ý trả phòng khi khách chưa thanh toán đủ hoặc chưa kiểm tra buồng phòng.",
    ],
    dailyChecklist: [
      "Nhận bàn giao ca: kiểm tra số lượng chìa khóa phòng và danh sách khách đang lưu trú tại cơ sở.",
      "Kiểm tra kết nối mạng (Banner PWA hiển thị 'Đang hoạt động online').",
      "Thực hiện Check-in cho khách đến: luôn đối chiếu mặt và ảnh trên thẻ CCCD.",
      "Ghi nhận ngay ghi chú đặc biệt vào hồ sơ khách (dị ứng, thói quen phòng tầng cao).",
      "Bàn giao ca: in/đối soát danh sách khách Check-out và tiền cọc phòng.",
    ],
    securityNote:
      "Khi mất mạng Internet, hệ thống PWA sẽ tự động lưu bản nháp Check-in vào máy. Không tải lại trình duyệt, khi có mạng trở lại dữ liệu sẽ được khôi phục nguyên vẹn.",
  },
  {
    key: "sales",
    title: "Nhân viên Sales (Sales Executive)",
    badge: "Khách hàng & Doanh thu",
    badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    iconName: "TrendingUp",
    description:
      "Phát triển nguồn khách đoàn, khách công ty (Corporate) và đối tác lữ hành (OTA/TA). Chăm sóc khách hàng thân thiết, nâng hạng thẻ và tối ưu doanh thu hợp đồng.",
    keyResponsibilities: [
      "Quản lý hồ sơ khách hàng 360, lịch sử lưu trú và hạng thành viên (/guests).",
      "Gán Sales phụ trách cho từng khách hàng VIP để chăm sóc chuyên biệt.",
      "Tạo ghi chú chăm sóc khách hàng (nhu cầu đón tiễn, xuất hóa đơn VAT, thực đơn ăn sáng).",
      "Gắn thẻ phân nhóm khách (Khách VIP, Khách công tác, Khách trăng mật).",
      "Quản lý danh sách đối tác lữ hành, công ty và điều kiện hợp đồng (/settings/sources).",
    ],
    allowedRoutes: [
      {
        path: "/guests",
        label: "Hồ sơ Khách hàng",
        desc: "Xem danh sách khách hàng, hạng thẻ, lịch sử các lần ở.",
      },
      {
        path: "/search",
        label: "Tra cứu Khách hàng",
        desc: "Tra cứu thông tin khách theo phân khúc và nguồn kênh.",
      },
      {
        path: "/reports/monthly",
        label: "Báo cáo Doanh thu",
        desc: "Theo dõi xu hướng doanh thu theo tháng phục vụ chỉ tiêu KPI.",
      },
    ],
    prohibitedActions: [
      "Không được xem số điện thoại và CCCD dạng rõ của khách hàng (dữ liệu tự động che mặt nạ theo Nghị định 13).",
      "Không có quyền can thiệp vào quy trình check-in phòng hoặc tác nghiệp quầy lễ tân.",
      "Không được xuất danh sách khách hàng trái phép ra ngoài hệ thống.",
    ],
    dailyChecklist: [
      "Rà soát danh sách khách có sinh nhật trong tháng để gửi email/tin nhắn chúc mừng.",
      "Liên hệ các đối tác công ty sắp hết hạn hợp đồng hoặc có đoàn dự kiến đến.",
      "Ghi nhận phản hồi của khách đoàn sau kỳ lưu trú vào phần Ghi chú hồ sơ khách.",
    ],
    securityNote:
      "Dữ liệu số điện thoại và CCCD hiển thị cho Sales được mã hóa mặt nạ (ví dụ 090****123) để bảo vệ quyền riêng tư của khách hàng.",
  },
  {
    key: "technician",
    title: "Kỹ thuật & Bảo trì (Technician)",
    badge: "Cơ sở vật chất",
    badgeColor: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    iconName: "Wrench",
    description:
      "Đảm bảo cơ sở vật chất, hệ thống điện lạnh, cấp thoát nước và an toàn PCCC buồng phòng luôn trong tình trạng vận hành hoàn hảo, giảm thiểu thời gian phòng ngừng kinh doanh.",
    keyResponsibilities: [
      "Tiếp nhận và xử lý các phiếu báo sự cố từ Lễ tân hoặc Buồng phòng (/facilities/work-orders).",
      "Cập nhật trạng thái phiếu công việc: Đang tiếp nhận -> Đang sửa -> Chờ vật tư -> Hoàn tất.",
      "Ghi nhận chi phí linh kiện thay thế và giải trình kỹ thuật vào phiếu công việc.",
      "Theo dõi lịch kiểm định PCCC, an toàn thực phẩm, bảo dưỡng thang máy (/facilities/alerts).",
      "Quản lý danh mục thiết bị, điều hòa, máy nước nóng của từng phòng (/facilities/assets).",
    ],
    allowedRoutes: [
      {
        path: "/facilities/work-orders",
        label: "Phiếu sự cố & Bảo trì",
        desc: "Tiếp nhận và nghiệm thu các đầu việc sửa chữa kỹ thuật.",
      },
      {
        path: "/facilities/assets",
        label: "Danh mục Tài sản",
        desc: "Theo dõi thiết bị buồng phòng, tình trạng và lịch sử bảo hành.",
      },
      {
        path: "/facilities/alerts",
        label: "Cảnh báo Tuân thủ",
        desc: "Hạn kiểm định bình cứu hỏa PCCC, giấy phép ATTP.",
      },
      {
        path: "/facilities/room-blocks",
        label: "Lịch khóa phòng",
        desc: "Xem các buồng phòng đang tạm khóa phục vụ sơn sửa.",
      },
    ],
    prohibitedActions: [
      "Không tự ý nghiệm thu hoàn tất phiếu công việc khi thiết bị chưa chạy thử đạt chuẩn.",
      "Không có quyền xem thông tin cá nhân khách hàng hay số liệu doanh thu lưu trú.",
    ],
    dailyChecklist: [
      "08:00 — Mở bảng Phiếu sự cố (/facilities/work-orders), ưu tiên xử lý các phiếu 'Khẩn cấp'.",
      "11:30 — Bàn giao buồng phòng đã hoàn tất sửa chữa cho Lễ tân để mở khóa đón khách.",
      "15:00 — Kiểm tra nhật ký áp suất bình PCCC và hạn kiểm định các tủ kỹ thuật.",
      "17:00 — Nhập chi phí vật tư phát sinh trong ngày vào phiếu công việc để bộ phận Kế toán đối soát.",
    ],
    securityNote:
      "Tài khoản Kỹ thuật được phân quyền chuyên biệt cho khối CSVC, bị từ chối truy cập mọi dữ liệu cá nhân khách hàng.",
  },
];

export const WORKFLOW_DIAGRAMS: WorkflowDiagram[] = [
  {
    id: "wf-checkin-checkout",
    code: "SOP-FO-01",
    title: "Quy trình Đón tiếp & Check-in / Check-out Buồng phòng",
    description:
      "Quy trình tác nghiệp tiêu chuẩn từ lúc khách bước vào sảnh quầy lễ tân đến khi trả phòng hoàn tất, bao gồm nhận diện khách quen và kiểm soát vi phạm.",
    primaryRole: "Lễ tân (Receptionist) & Quản lý cơ sở",
    nodes: [
      {
        id: "step-1",
        stepNumber: 1,
        title: "Chào khách & Tra cứu thông tin",
        role: "Lễ tân",
        screen: "/check-in",
        action:
          "Hỏi Số điện thoại hoặc Số CCCD/Hộ chiếu của khách và nhập vào ô tra cứu nhanh.",
        details: [
          "Nếu khách ĐÃ TỪNG Ở: Hệ thống tự động điền Họ tên, Ngày sinh, Giới tính, Hạng thành viên.",
          "Nếu khách MỚI: Yêu cầu khách xuất trình thẻ CCCD/Hộ chiếu để nhập chính xác thông tin.",
        ],
        caution:
          "Luôn đối chiếu khuôn mặt khách với ảnh trên CCCD trước khi bấm tiếp tục.",
      },
      {
        id: "step-2",
        stepNumber: 2,
        title: "Kiểm tra Cảnh báo Vi phạm (Blacklist Check)",
        role: "Hệ thống tự động",
        screen: "/check-in",
        action:
          "Hệ thống tự động quét cờ cảnh báo trên cơ sở dữ liệu toàn chuỗi.",
        details: [
          "Nếu khách BỊ CẮM CỜ: Màn hình hiển thị hộp cảnh báo vi phạm màu đỏ kèm lý do (ví dụ: 'Hút thuốc trong phòng', 'Gây rối', 'Chưa thanh toán').",
          "Lễ tân khéo léo thông báo quy chế lưu trú hoặc mời Quản lý cơ sở ra hỗ trợ.",
        ],
      },
      {
        id: "step-3",
        stepNumber: 3,
        title: "Chọn Buồng phòng & Kênh nguồn",
        role: "Lễ tân",
        screen: "/check-in",
        action:
          "Chọn số phòng trống, ngày dự kiến trả phòng và kênh nguồn đặt.",
        details: [
          "Chọn cơ sở và phòng sẵn sàng (hệ thống chỉ hiển thị phòng sạch, không khóa OOO).",
          "Chọn kênh nguồn: Khách lẻ trực tiếp (Direct), OTA (Agoda/Booking), hoặc Khách công ty/Lữ hành.",
          "Nếu là kênh Đại lý/Công ty: bắt buộc chọn Đối tác liên kết (US-22).",
        ],
      },
      {
        id: "step-4",
        stepNumber: 4,
        title: "Xác nhận Check-in Thành Công",
        role: "Lễ tân & Hệ thống",
        screen: "/stays",
        action:
          "Bấm 'Xác nhận Check-in'. Hệ thống tự sinh lượt ở mới và chuyển sang bảng Khách đang ở.",
        details: [
          "Dữ liệu tự động cập nhật số lượt ở (Total Stays) của khách hàng.",
          "Nếu mất mạng, PWA tự lưu bản nháp và hiện thông báo 'Đã lưu bản nháp ngoại tuyến'.",
        ],
      },
      {
        id: "step-5",
        stepNumber: 5,
        title: "Lưu trú & Chăm sóc",
        role: "Lễ tân & Buồng phòng",
        screen: "/stays & /facilities/report",
        action: "Hỗ trợ khách trong suốt thời gian lưu trú tại khách sạn.",
        details: [
          "Ghi nhận ghi chú dịch vụ nếu khách yêu cầu thêm gối, dọn phòng, gọi xe.",
          "Nếu phòng phát sinh hỏng hóc: bấm nút 'Báo sự cố' ngay trên thanh công cụ.",
        ],
      },
      {
        id: "step-6",
        stepNumber: 6,
        title: "Trả phòng (Check-out) & Giải phóng phòng",
        role: "Lễ tân",
        screen: "/stays",
        action:
          "Khách trả phòng: Lễ tân bấm 'Trả phòng' trên bảng danh sách khách đang ở.",
        details: [
          "Hệ thống mở hộp thoại xác nhận thời gian trả phòng thực tế theo giờ Việt Nam.",
          "Sau khi xác nhận: buồng phòng được chuyển trạng thái chờ dọn dẹp, dữ liệu doanh thu được ghi nhận vào báo cáo KPI.",
        ],
        caution:
          "Nếu hủy phòng: Bắt buộc nhập lý do hủy tối thiểu 5 ký tự để lưu vết kiểm toán.",
      },
    ],
  },
  {
    id: "wf-facility-maintenance",
    code: "SOP-ENG-02",
    title: "Quy trình Xử lý Sự cố Kỹ thuật & Khóa phòng OOO",
    description:
      "Quy trình phối hợp giữa Lễ tân, Quản lý và Bộ phận Kỹ thuật khi trang thiết bị buồng phòng gặp sự cố hỏng hóc hoặc cần bảo trì định kỳ.",
    primaryRole: "Kỹ thuật (Technician) & Quản lý cơ sở",
    nodes: [
      {
        id: "fac-1",
        stepNumber: 1,
        title: "Phát hiện & Tạo Phiếu báo sự cố",
        role: "Lễ tân / Buồng phòng / Khách",
        screen: "/facilities/report",
        action: "Điền biểu mẫu báo cáo sự cố ngay khi tiếp nhận thông tin.",
        details: [
          "Chọn cơ sở và buồng phòng phát sinh sự cố.",
          "Tiêu đề sự cố (ví dụ: 'Điều hòa chảy nước', 'Khóa thẻ từ phòng 302 không nhận').",
          "Mức độ ưu tiên: Khẩn cấp (ảnh hưởng trực tiếp khách) | Cao | Bình thường | Thấp.",
        ],
      },
      {
        id: "fac-2",
        stepNumber: 2,
        title: "Đánh giá & Khóa phòng OOO (nếu cần)",
        role: "Quản lý cơ sở",
        screen: "/facilities/room-blocks",
        action:
          "Nếu sự cố nghiêm trọng không thể khắc phục ngay: Quản lý thực hiện Khóa phòng.",
        details: [
          "Chọn phòng cần khóa, ngày bắt đầu và ngày dự kiến mở lại.",
          "Nhập lý do khóa phòng OOO (Out of Order) tối thiểu 5 ký tự.",
          "Phòng bị khóa OOO sẽ tự động ẩn khỏi danh sách phòng trống của Lễ tân để tránh bán trùng.",
        ],
      },
      {
        id: "fac-3",
        stepNumber: 3,
        title: "Tiếp nhận & Sửa chữa kỹ thuật",
        role: "Kỹ thuật viên",
        screen: "/facilities/work-orders",
        action: "Kỹ thuật kiểm tra phiếu công việc và chuyển trạng thái xử lý.",
        details: [
          "Chuyển trạng thái sang 'Đang xử lý' khi mang dụng cụ đến hiện trường.",
          "Nếu thiếu linh kiện: chuyển trạng thái sang 'Chờ vật tư' và báo Quản lý duyệt mua sắm.",
        ],
      },
      {
        id: "fac-4",
        stepNumber: 4,
        title: "Nghiệm thu & Nhập chi phí vật tư",
        role: "Kỹ thuật & Quản lý",
        screen: "/facilities/work-orders",
        action: "Sửa chữa hoàn tất, kiểm tra chạy thử nghiệm và đóng phiếu.",
        details: [
          "Bấm 'Nghiệm thu hoàn tất'.",
          "Nhập chi phí vật tư thay thế (VNĐ) và giải trình khắc phục.",
          "Hệ thống tự động tích lũy chi phí vào Báo cáo CSVC (/reports/facilities).",
        ],
      },
      {
        id: "fac-5",
        stepNumber: 5,
        title: "Mở khóa buồng phòng đón khách",
        role: "Quản lý cơ sở",
        screen: "/facilities/room-blocks",
        action:
          "Quản lý bấm 'Mở khóa phòng' trên bảng danh sách phòng đang khóa OOO.",
        details: [
          "Hệ thống mở hộp thoại xác nhận mở khóa.",
          "Buồng phòng ngay lập tức xuất hiện trở lại trên màn hình Check-in sẵn sàng đón khách mới.",
        ],
      },
    ],
  },
  {
    id: "wf-blacklist-merge",
    code: "SOP-CRM-03",
    title: "Quy trình Cắm cờ Blacklist & Gộp Hồ sơ Khách Trùng",
    description:
      "Quy trình kiểm soát rủi ro vi phạm quy chế lưu trú và chuẩn hóa dữ liệu khách hàng sạch trên toàn hệ thống chuỗi.",
    primaryRole: "Lễ tân, Sales & Chủ chuỗi (Owner)",
    nodes: [
      {
        id: "bl-1",
        stepNumber: 1,
        title: "Phát hiện Vi phạm & Đề xuất Cắm cờ",
        role: "Lễ tân / Quản lý",
        screen: "/guests/[id]",
        action:
          "Khi khách có hành vi vi phạm nghiêm trọng (hư hại tài sản, quỵt tiền, gây rối).",
        details: [
          "Mở hồ sơ khách hàng -> Bấm nút 'Cắm cờ cảnh báo (Blacklist)'.",
          "Bắt buộc nhập lý do chi tiết tối thiểu 10 ký tự (US-16).",
          "Hồ sơ chuyển vào trạng thái 'Chờ phê duyệt' tại Trung tâm phê duyệt.",
        ],
      },
      {
        id: "bl-2",
        stepNumber: 2,
        title: "Phê duyệt Cờ Vi phạm",
        role: "Quản lý cơ sở / Chủ chuỗi",
        screen: "/approvals",
        action:
          "Quản lý kiểm tra bằng chứng và quyết định Phê duyệt / Từ chối.",
        details: [
          "Bấm 'Phê duyệt': Cờ chính thức có hiệu lực trên toàn chuỗi.",
          "Mọi chi nhánh khi tra cứu khách này đều nhận được cảnh báo đỏ khi check-in.",
        ],
      },
      {
        id: "bl-3",
        stepNumber: 3,
        title: "Phát hiện Hồ sơ Trùng lặp",
        role: "Lễ tân / Sales",
        screen: "/guests/[id]",
        action:
          "Khi khách hàng có nhiều hồ sơ do nhập sai ký tự hoặc đổi số điện thoại.",
        details: [
          "Trên trang chi tiết khách, bấm nút 'Đề xuất gộp hồ sơ'.",
          "Nhập tên/SĐT để tìm kiếm hồ sơ trùng.",
          "Chọn chính xác hồ sơ GIỮ LẠI (Master) và hồ sơ GỘP VÀO (Drop).",
          "Nhập lý do giải trình gộp hồ sơ.",
        ],
      },
      {
        id: "bl-4",
        stepNumber: 4,
        title: "Thẩm định & Thực hiện Hợp nhất",
        role: "Chủ chuỗi (Owner)",
        screen: "/approvals",
        action:
          "Chủ chuỗi xem thẻ đối soát hợp nhất hai hồ sơ và bấm 'Phê duyệt'.",
        details: [
          "Toàn bộ lịch sử lưu trú, đêm phòng, ghi chú của hồ sơ cũ tự động chuyển sang hồ sơ chính.",
          "Hồ sơ phụ được đánh dấu vô hiệu hóa.",
          "Hành động được ghi lại chi tiết trong Nhật ký kiểm toán (/audit).",
        ],
        caution:
          "Thao tác gộp hồ sơ là vĩnh viễn, không thể hoàn tác. Chỉ Chủ chuỗi mới có thẩm quyền phê duyệt.",
      },
    ],
  },
  {
    id: "wf-admin-governance",
    code: "SOP-ADM-04",
    title: "Quy trình Khởi tạo Cơ sở & Phân quyền Quản trị Chuỗi",
    description:
      "Quy trình thiết lập hệ thống chuẩn mực khi khai trương khách sạn mới hoặc tiếp nhận nhân sự mới vào chuỗi.",
    primaryRole: "Chủ chuỗi (Owner)",
    nodes: [
      {
        id: "adm-1",
        stepNumber: 1,
        title: "Khởi tạo Chi nhánh Khách sạn mới",
        role: "Chủ chuỗi",
        screen: "/settings/branches",
        action: "Tạo thông tin khách sạn thành viên mới.",
        details: [
          "Nhập Mã cơ sở (viết hoa không dấu, ví dụ: 'SAIGON_RIVER').",
          "Tên khách sạn, Địa chỉ, Tỉnh/Thành phố, Số điện thoại hotline.",
        ],
      },
      {
        id: "adm-2",
        stepNumber: 2,
        title: "Khai báo Danh mục Buồng phòng",
        role: "Chủ chuỗi / Quản lý",
        screen: "/settings/rooms",
        action: "Khai báo danh sách số phòng và loại phòng tại cơ sở mới.",
        details: [
          "Số phòng (101, 102, 201, Penthouse...).",
          "Loại phòng (Standard, Deluxe, Suite, Family).",
          "Giá niêm yết theo đêm phục vụ tính toán ADR và RevPAR.",
        ],
      },
      {
        id: "adm-3",
        stepNumber: 3,
        title: "Cấu hình Kênh nguồn & Đối tác (US-22)",
        role: "Chủ chuỗi / Quản lý",
        screen: "/settings/sources",
        action: "Thiết lập các kênh bán phòng và danh mục đối tác.",
        details: [
          "Thêm kênh nguồn: OTA, Lữ hành, Khách lẻ trực tiếp.",
          "Bật cờ 'Bắt buộc chọn đối tác' cho các kênh đại lý để kiểm soát công nợ hoa hồng.",
          "Tạo hồ sơ đối tác doanh nghiệp (Mã số thuế, SĐT, Người liên hệ).",
        ],
      },
      {
        id: "adm-4",
        stepNumber: 4,
        title: "Tạo Tài khoản & Phân quyền Nhân sự",
        role: "Chủ chuỗi",
        screen: "/settings/users & /settings/roles",
        action: "Tạo tài khoản và gán đúng vai trò theo từng cơ sở.",
        details: [
          "Bấm 'Thêm tài khoản nhân sự mới' (/settings/users).",
          "Nhập Email, Mật khẩu khởi tạo, Họ tên nhân viên.",
          "Gán vai trò: Lễ tân, Quản lý, Sales hoặc Kỹ thuật.",
          "Chọn cơ sở trực thuộc (nhân viên chỉ nhìn thấy dữ liệu chi nhánh được gán).",
        ],
        caution:
          "Hệ thống tích hợp cơ chế chống leo quyền: chỉ Chủ chuỗi mới có quyền tạo hoặc phân bổ vai trò quản trị.",
      },
    ],
  },
];

export const MODULE_GUIDES: ModuleGuide[] = [
  {
    id: "mod-checkin-stays",
    title: "Lễ tân & Lưu trú",
    route: "/check-in & /stays",
    iconName: "UserCheck",
    summary:
      "Trọng tâm vận hành hàng ngày của khách sạn: tra cứu khách, nhận phòng nhanh dưới 60 giây, kiểm soát danh sách khách đang ở và trả phòng.",
    rolesInvolved: ["Lễ tân", "Quản lý cơ sở", "Chủ chuỗi"],
    features: [
      {
        name: "Check-in Đón khách Nhanh (/check-in)",
        description:
          "Biểu mẫu thông minh tự động nhận diện khách cũ qua Số điện thoại hoặc CCCD/Hộ chiếu.",
        howTo: [
          "1. Nhập SĐT hoặc CCCD của khách vào ô tra cứu và bấm 'Tra cứu'.",
          "2. Nếu là khách cũ, hệ thống tự động điền hồ sơ. Nếu là khách mới, nhập họ tên và thông tin giấy tờ.",
          "3. Chọn phòng sạch tại cơ sở đang trực.",
          "4. Chọn Kênh nguồn (Direct, OTA, Doanh nghiệp) và Đối tác tương ứng.",
          "5. Bấm 'Xác nhận Check-in'.",
        ],
        tips: "Nếu bị mất kết nối Internet, hệ thống sẽ lưu bản nháp vào bộ nhớ máy, khi có mạng trở lại dữ liệu sẽ được khôi phục tự động.",
      },
      {
        name: "Quản lý Khách Đang Ở (/stays)",
        description:
          "Danh sách trực quan toàn bộ buồng phòng đang có khách lưu trú tại chi nhánh.",
        howTo: [
          "Xem nhanh số phòng, tên khách, ngày nhận, ngày dự kiến trả phòng.",
          "Bấm 'Trả phòng' để thực hiện check-out theo giờ kinh doanh Việt Nam.",
          "Bấm 'Hủy phòng' nếu khách hủy đặt phòng (yêu cầu nhập lý do hủy >= 5 ký tự).",
        ],
      },
    ],
    faq: [
      {
        q: "Làm thế nào để đổi phòng cho khách đang ở?",
        a: "Lễ tân thực hiện trả phòng cũ với ghi chú 'Đổi phòng' và làm thủ tục check-in sang buồng phòng mới cho khách.",
      },
      {
        q: "Khách nước ngoài không có CCCD thì nhập như thế nào?",
        a: "Tại mục loại giấy tờ, chọn 'Hộ chiếu (Passport)', nhập số hộ chiếu và chọn quốc tịch tương ứng.",
      },
    ],
  },
  {
    id: "mod-guests",
    title: "Hồ sơ Khách hàng 360",
    route: "/guests & /search",
    iconName: "Users",
    summary:
      "Cơ sở dữ liệu khách hàng tập trung toàn chuỗi: theo dõi lịch sử lưu trú, tự động nâng hạng thẻ thành viên, lưu vết sở thích và quản lý Sales phụ trách.",
    rolesInvolved: ["Sales", "Lễ tân", "Quản lý", "Chủ chuỗi"],
    features: [
      {
        name: "Hồ sơ Khách hàng 360 (/guests/[id])",
        description:
          "Xem toàn diện hành trình khách hàng: tổng số lượt ở, tổng số đêm, hạng thẻ (Bạc, Vàng, Kim Cương), ghi chú và thẻ phân nhóm.",
        howTo: [
          "Vào /guests, bấm vào tên khách hàng để mở trang chi tiết 360.",
          "Bấm 'Thêm ghi chú' để lưu lại sở thích của khách (ăn chay, không thích phòng gần thang máy).",
          "Bấm 'Thêm thẻ phân nhóm' để gắn nhãn (VIP, Khách đoàn, Golf...).",
          "Phân công Sales phụ trách để có nhân sự chuyên biệt chăm sóc.",
        ],
      },
      {
        name: "Tra cứu Nhanh Khách Toàn Chuỗi (/search hoặc Cmd+K)",
        description:
          "Tìm kiếm tức thì hồ sơ khách hàng ở bất kỳ màn hình nào qua tổ hợp phím Cmd+K hoặc thanh tìm kiếm.",
        howTo: [
          "Bấm Cmd+K (hoặc Ctrl+K trên Windows) để mở Command Palette.",
          "Gõ tên hoặc số điện thoại để nhảy thẳng đến hồ sơ khách hàng.",
        ],
      },
    ],
    faq: [
      {
        q: "Hạng thành viên của khách được tính như thế nào?",
        a: "Hệ thống tự động tính lũy kế từ bảng Lượt ở (Stays) thực tế của khách hàng trên toàn chuỗi, không nhập tay số liệu dẫn xuất để đảm bảo tính minh bạch.",
      },
      {
        q: "Nhân viên Sales có xem được số CCCD của khách không?",
        a: "Không. Dữ liệu số CCCD và SĐT hiển thị cho Sales được che mặt nạ tự động để bảo đảm quyền riêng tư.",
      },
    ],
  },
  {
    id: "mod-facilities",
    title: "Cơ sở vật chất & Bảo trì",
    route: "/facilities/*",
    iconName: "Wrench",
    summary:
      "Hệ thống quản lý bảo trì CSVC toàn diện: tiếp nhận báo sự cố buồng phòng, quản lý phiếu sửa chữa, khóa phòng OOO và cảnh báo hạn tuân thủ an toàn.",
    rolesInvolved: ["Kỹ thuật CSVC", "Quản lý cơ sở", "Lễ tân"],
    features: [
      {
        name: "Phiếu công việc Bảo trì (/facilities/work-orders)",
        description:
          "Theo dõi vòng đời xử lý sự cố từ lúc tiếp nhận đến khi nghiệm thu hoàn thành.",
        howTo: [
          "Lễ tân hoặc buồng phòng tạo phiếu sự cố tại /facilities/report.",
          "Kỹ thuật viên vào danh sách, bấm cập nhật trạng thái sửa chữa.",
          "Khi hoàn thành: bấm 'Nghiệm thu hoàn tất', nhập chi phí linh kiện thay thế.",
        ],
      },
      {
        name: "Khóa Buồng phòng OOO (/facilities/room-blocks)",
        description:
          "Tạm khóa phòng ngừng kinh doanh phục vụ sửa chữa lớn, sơn tường, bảo dưỡng điều hòa.",
        howTo: [
          "Bấm 'Khóa phòng mới', chọn phòng, khoảng ngày khóa và nhập lý do bắt buộc.",
          "Khi sửa xong: Quản lý bấm nút 'Mở khóa phòng' để phòng sẵn sàng đón khách.",
        ],
      },
      {
        name: "Cảnh báo An toàn & Tuân thủ (/facilities/alerts)",
        description:
          "Hệ thống tự động cảnh báo trước 30 ngày các mốc kiểm định bình PCCC, gia hạn giấy phép ATTP, bảo trì máy phát điện.",
        howTo: [
          "Theo dõi danh sách thẻ cảnh báo màu vàng/đỏ.",
          "Thực hiện bảo dưỡng và bấm 'Cập nhật ngày kiểm định mới'.",
        ],
      },
    ],
    faq: [
      {
        q: "Làm thế nào để phòng đang khóa OOO bán được trở lại?",
        a: "Quản lý cơ sở vào /facilities/room-blocks và bấm nút 'Mở khóa' trên dòng buồng phòng tương ứng.",
      },
    ],
  },
  {
    id: "mod-reports",
    title: "Báo cáo Doanh thu & Vận hành",
    route: "/reports, /reports/monthly & /reports/facilities",
    iconName: "BarChart3",
    summary:
      "Hệ thống phân tích dữ liệu đa chiều: đo lường doanh thu ròng, RevPAR, ADR, công suất phòng, phân rã nguồn khách và chi phí kỹ thuật.",
    rolesInvolved: ["Chủ chuỗi", "Quản lý cơ sở"],
    features: [
      {
        name: "Dashboard Báo cáo Tổng thể (/reports)",
        description:
          "Hiển thị 6 thẻ chỉ số tài chính chủ chốt kèm biểu đồ tăng trưởng và cơ cấu doanh thu.",
        howTo: [
          "Sử dụng thanh Filter Toolbar để chọn cơ sở (Toàn chuỗi hoặc một khách sạn cụ thể).",
          "Chọn nhanh khoảng thời gian: 7 ngày qua, 30 ngày qua, hoặc Tháng này.",
          "So sánh số liệu tự động với cùng kỳ năm trước để đánh giá mức độ tăng trưởng.",
        ],
      },
      {
        name: "Báo cáo Vận hành CSVC & Chi phí (/reports/facilities)",
        description:
          "Báo cáo chuyên sâu về số sự cố phát sinh, tỷ lệ đúng hạn SLA, thời gian khắc phục bình quân (MTTR) và cơ cấu chi phí sửa chữa.",
        howTo: [
          "Xem thẻ KPI chi phí bảo trì và tỷ lệ phòng OOO.",
          "Đối soát bảng phân bổ chi phí theo từng loại trang thiết bị (Điều hòa, Điện nước, Nội thất).",
        ],
      },
    ],
    faq: [
      {
        q: "RevPAR và ADR được tính như thế nào?",
        a: "ADR = Tổng doanh thu phòng / Số phòng thực bán. RevPAR = Tổng doanh thu phòng / Tổng số phòng khả dụng trong kỳ.",
      },
    ],
  },
  {
    id: "mod-approvals",
    title: "Trung tâm Phê duyệt & Rủi ro",
    route: "/approvals",
    iconName: "CheckSquare",
    summary:
      "Cửa kiểm soát rủi ro tập trung: xét duyệt cắm cờ cảnh báo vi phạm (Blacklist) và thẩm định yêu cầu hợp nhất hồ sơ khách hàng trùng.",
    rolesInvolved: ["Chủ chuỗi", "Quản lý cơ sở"],
    features: [
      {
        name: "Phê duyệt Cờ Vi phạm (Blacklist Tab)",
        description:
          "Xét duyệt các đề xuất cắm cờ từ quầy lễ tân để bảo vệ tài sản toàn chuỗi.",
        howTo: [
          "Xem lý do đề xuất và bằng chứng do nhân viên quầy cung cấp.",
          "Bấm 'Phê duyệt' để cờ có hiệu lực hoặc 'Từ chối' nếu bằng chứng chưa đủ.",
          "Có thể gỡ cờ cảnh báo khi khách đã bồi thường xong (yêu cầu nhập lý do gỡ cờ).",
        ],
      },
      {
        name: "Phê duyệt Gộp Hồ sơ Khách Trùng (Merge Tab)",
        description:
          "Chủ chuỗi thẩm định đối chiếu hai hồ sơ trước khi gộp để đảm bảo tính toàn vẹn dữ liệu.",
        howTo: [
          "Xem thẻ so sánh chi tiết: Hồ sơ được giữ lại (Master) và Hồ sơ bị gộp (Drop).",
          "Bấm 'Phê duyệt gộp hồ sơ' để hợp nhất toàn bộ dữ liệu lịch sử vào một hồ sơ duy nhất.",
        ],
      },
    ],
    faq: [
      {
        q: "Sau khi gộp hồ sơ thì dữ liệu cũ có bị mất không?",
        a: "Không. Toàn bộ lượt ở, ghi chú và thẻ phân nhóm của hồ sơ phụ được tự động chuyển sang hồ sơ chính và ghi nhận vào Audit Log.",
      },
    ],
  },
  {
    id: "mod-settings",
    title: "Cài đặt & Quản trị Hệ thống",
    route: "/settings/* & /audit",
    iconName: "Settings",
    summary:
      "Trung tâm cấu hình toàn chuỗi: quản lý khách sạn thành viên, phân quyền người dùng, bật tắt module và truy vết kiểm toán.",
    rolesInvolved: ["Chủ chuỗi", "Quản lý cơ sở"],
    features: [
      {
        name: "Quản lý Tài khoản & Phân quyền (/settings/users & /settings/roles)",
        description:
          "Tạo người dùng mới và phân bổ vai trò chuẩn xác theo cơ sở.",
        howTo: [
          "Bấm 'Thêm tài khoản nhân sự mới', nhập email và mật khẩu khởi tạo.",
          "Chọn vai trò: Chủ chuỗi, Quản lý, Lễ tân, Sales, Kỹ thuật.",
          "Chọn chi nhánh áp dụng hoặc để trống nếu là vai trò cấp chuỗi.",
        ],
      },
      {
        name: "Quản lý Kênh Nguồn & Đối tác (/settings/sources - US-22)",
        description:
          "Cấu hình các kênh bán phòng (OTA, Khách lẻ, Đại lý) và hồ sơ đối tác lữ hành.",
        howTo: [
          "Bấm 'Thêm Kênh Nguồn': nhập mã code viết thường (ví dụ: 'agoda'), tên hiển thị.",
          "Bật 'Bắt buộc chọn đối tác' nếu là kênh đại lý.",
          "Thêm danh mục hồ sơ đối tác doanh nghiệp để quản lý công nợ và hợp đồng.",
        ],
      },
      {
        name: "Nhật ký Thao tác Hệ thống (/audit)",
        description:
          "Theo dõi từng giây mọi hành động xuất dữ liệu, thay đổi quyền, trả phòng hoặc gỡ cờ vi phạm.",
        howTo: [
          "Tra cứu nhật ký theo thời gian, người thực hiện hoặc loại hành động.",
          "Bấm vào dòng log để xem chi tiết sai khác (Before / After diff).",
        ],
      },
    ],
    faq: [
      {
        q: "Nếu nhân viên quên mật khẩu thì làm thế nào?",
        a: "Chủ chuỗi vào /settings/users, bấm Sửa tài khoản nhân sự và nhập lại mật khẩu mới cho nhân viên.",
      },
    ],
  },
  {
    id: "mod-prospects",
    title: "Khách hàng tiềm năng B2B",
    route: "/prospects",
    iconName: "Target",
    summary:
      "Nơi lưu công ty tour, đại lý, doanh nghiệp chưa hợp tác. Mỗi công ty chỉ có một sales phụ trách để tránh gọi chồng chéo; khi đồng ý hợp tác thì chuyển thành Đối tác.",
    rolesInvolved: ["Sales", "Quản lý", "Chủ chuỗi"],
    features: [
      {
        name: "Thêm khách tiềm năng & chống trùng",
        description:
          "Hệ thống tự chuẩn hóa SĐT, tên công ty, website, MST rồi so với cả khách tiềm năng lẫn đối tác đã có.",
        howTo: [
          "Bấm 'Thêm khách tiềm năng', nhập tên công ty và ít nhất số điện thoại hoặc email.",
          "Trùng MST hoặc SĐT: hệ thống chặn và hiện bản ghi đã có để bạn mở chăm sóc tiếp.",
          "Nghi trùng (tên giống + cùng tỉnh, hoặc cùng website): chọn mở bản ghi cũ, gộp thông tin vào bản cũ, hoặc vẫn tạo mới kèm lý do bắt buộc.",
        ],
      },
      {
        name: "Chăm sóc & nhật ký liên hệ",
        description:
          "Mỗi lần gọi / Zalo / gặp đều được ghi lại; hệ thống tự cập nhật lần liên hệ cuối và ngày hẹn tiếp.",
        howTo: [
          "Mở hồ sơ, điền 'Ghi nhận lần liên hệ' (hình thức, kết quả, ghi chú, hẹn tiếp).",
          "Trạng thái 'Đang chăm sóc' và 'Đang đàm phán' bắt buộc có ngày hẹn.",
          "Quá ngày hẹn mà chưa có liên hệ mới thì công ty rơi vào danh sách 'Quá hạn chăm sóc'.",
          "SĐT của khách tiềm năng do sales khác phụ trách bị che (090****232); muốn gọi hãy hỏi người phụ trách trước.",
          "Dòng 'Chưa gán' (quản lý chọn 'Không gán' khi tạo / nhập file / chuyển phụ trách): bất kỳ sales nào cũng bấm 'Nhận chăm sóc' để thành người phụ trách; người đến sau bị chặn kèm tên người đã nhận.",
          "Quản lý có thể chọn nhiều dòng rồi 'Bỏ gán các dòng đã chọn' để trả về trạng thái chưa gán.",
        ],
      },
      {
        name: "Chuyển thành đối tác",
        description:
          "Khi công ty đồng ý hợp tác, bấm một nút để tạo hồ sơ Đối tác với đầy đủ thông tin đã thu thập.",
        howTo: [
          "Trong hồ sơ (hoặc ở dòng danh sách), bấm 'Chuyển thành đối tác' và xác nhận.",
          "Hồ sơ khách tiềm năng chuyển sang 'Đã chuyển đổi' và bị khóa; làm tiếp hợp đồng giá, đoàn, hoa hồng tại 'Đối tác & Khách đoàn'.",
          "Không cần quản lý duyệt bước này. Bấm lần 2 không tạo thêm đối tác.",
        ],
      },
      {
        name: "Nhập từ Excel / CSV",
        description:
          "Nhập tối đa 500 công ty mỗi lần, luôn xem trước phân loại trùng rồi mới ghi.",
        howTo: [
          "Bấm 'Nhập Excel/CSV', tải 'file mẫu' để dùng đúng cột.",
          "Xem bảng phân loại: Mới / Nghi trùng / Trùng cứng; chỉ tick những dòng muốn ghi.",
          "Dòng nghi trùng phải ghi lý do; dòng trùng cứng tự bị loại. Dòng tạo dù nghi trùng nằm trong 'Chờ xử lý trùng' để quản lý xem xét.",
        ],
      },
    ],
    faq: [
      {
        q: "Vì sao tôi không sửa được khách tiềm năng này?",
        a: "Chỉ người phụ trách và quản lý được sửa, ghi liên hệ hoặc chuyển đổi. Hãy nhờ quản lý chuyển phụ trách nếu bạn tiếp quản.",
      },
    ],
  },
];
