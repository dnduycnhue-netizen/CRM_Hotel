import type { RoleGuide } from "../types";

// Nội dung đối chiếu với ma trận quyền thật trên hệ thống (bảng role_permissions).
// Khi đổi quyền ở /settings/roles, hãy cập nhật lại các mục "Được làm / Không được làm".

export const ROLE_GUIDES: RoleGuide[] = [
  {
    key: "owner",
    title: "Chủ chuỗi (Owner / Tổng giám đốc)",
    badge: "Toàn quyền hệ thống",
    badgeColor:
      "bg-amber-500/15 text-amber-800 border-amber-500/40 dark:text-amber-300",
    iconName: "Crown",
    description:
      "Toàn quyền trên cả 8 cơ sở. Là vai trò DUY NHẤT được cấu hình hệ thống (cơ sở, phòng, tài khoản, ma trận phân quyền, bật/tắt module, kênh nguồn), duyệt cờ Blacklist và gộp hồ sơ khách, xem nhật ký toàn chuỗi, xem báo cáo toàn chuỗi và xuất CCCD đầy đủ.",
    keyResponsibilities: [
      "Quản lý cơ sở, phòng, tài khoản và ma trận phân quyền (/settings/branches, /settings/rooms, /settings/users, /settings/roles).",
      "Bật / tắt module theo từng cơ sở và cấu hình kênh nguồn khách (/settings/modules, /settings/sources).",
      "Phê duyệt đề xuất cắm cờ Blacklist, gỡ cờ và gộp hồ sơ khách trùng (/approvals).",
      "Mở khóa sổ doanh thu tháng khi cần chỉnh số liệu đã chốt (/reports/monthly).",
      "Theo dõi nhật ký thao tác toàn chuỗi để phát hiện bất thường (/audit).",
      "Xem báo cáo công suất, doanh thu, ADR, RevPAR toàn chuỗi và chi phí CSVC (/reports).",
      "Phân phối khách tiềm năng B2B cho sales, theo dõi tỷ lệ chuyển đổi (/prospects).",
    ],
    allowedRoutes: [
      {
        path: "/reports",
        label: "Báo cáo công suất & khách",
        desc: "KPI toàn chuỗi hoặc từng cơ sở, so sánh cùng kỳ năm trước.",
      },
      {
        path: "/reports/monthly",
        label: "Doanh thu & Cùng kỳ",
        desc: "Doanh thu, ADR, RevPAR 12 tháng; nhập, khóa và mở khóa sổ.",
      },
      {
        path: "/approvals",
        label: "Trung tâm phê duyệt",
        desc: "Duyệt gộp hồ sơ, duyệt và gỡ cờ Blacklist.",
      },
      {
        path: "/settings/users",
        label: "Người dùng & Tài khoản",
        desc: "Tạo tài khoản, gán vai trò theo cơ sở, đặt lại mật khẩu.",
      },
      {
        path: "/settings/roles",
        label: "Ma trận phân quyền",
        desc: "Điều chỉnh quyền chi tiết cho từng vai trò.",
      },
      {
        path: "/settings/modules",
        label: "Bật / Tắt Module",
        desc: "Bật tắt từng phân hệ cho từng cơ sở.",
      },
      {
        path: "/audit",
        label: "Nhật ký thao tác",
        desc: "Truy vết mọi thay đổi, kèm so sánh trước / sau.",
      },
      {
        path: "/prospects",
        label: "Khách tiềm năng B2B",
        desc: "Gán, bỏ gán, nhập Excel, theo dõi chuyển đổi.",
      },
    ],
    prohibitedActions: [
      "Không chia sẻ tài khoản Chủ chuỗi: mỗi người một tài khoản riêng để nhật ký thao tác chính xác.",
      "Không đăng nhập trên máy tính công cộng; tài khoản này xem được CCCD / Hộ chiếu dạng rõ và xuất được Excel toàn chuỗi (tối đa 5.000 dòng).",
      "Không phê duyệt gộp hồ sơ khi chưa đối chiếu hai hồ sơ: gộp hồ sơ là thao tác không hoàn tác.",
    ],
    dailyChecklist: [
      "08:30 — Xem /reports: công suất, khách quen quay lại, hủy phòng của ngày hôm qua.",
      "09:30 — Mở /approvals: xử lý đề xuất cờ Blacklist và gộp hồ sơ đang chờ.",
      "11:00 — Mở /prospects: lọc 'Quá hạn chăm sóc' và 'Chưa gán' để nhắc hoặc phân phối lại.",
      "16:30 — Xem /reports (tab CSVC & Kỹ thuật): sự cố quá SLA, chi phí sửa chữa.",
      "Từ ngày 5 hằng tháng — Kiểm tra mọi cơ sở đã nhập và khóa sổ doanh thu tháng trước (/reports/monthly).",
    ],
    securityNote:
      "Mọi thao tác nhạy cảm (xem CCCD đầy đủ, xuất file, đổi quyền, mở khóa sổ, gộp hồ sơ) đều ghi nhật ký. Hệ thống kiểm tra quyền hai lớp (ứng dụng và cơ sở dữ liệu) nên việc ẩn nút không phải là rào bảo vệ duy nhất.",
  },
  {
    key: "branch_manager",
    title: "Quản lý cơ sở (Branch Manager)",
    badge: "Điều hành cơ sở",
    badgeColor:
      "bg-purple-500/15 text-purple-800 border-purple-500/40 dark:text-purple-300",
    iconName: "Shield",
    description:
      "Điều hành đón tiếp, buồng phòng, bảo trì, kinh doanh và chăm sóc khách tại cơ sở được gán (chọn cơ sở ở góc trên bên trái). Có gần như mọi quyền tác nghiệp, nhưng KHÔNG có quyền cấu hình hệ thống và KHÔNG tự duyệt cờ Blacklist / gộp hồ sơ (chỉ Chủ chuỗi duyệt).",
    keyResponsibilities: [
      "Giám sát khách đang ở; hủy lượt ở quá 6 giờ và nhập bù lượt ở quá khứ khi cần (/stays, /check-in).",
      "Nghiệm thu phiếu sự cố, lập kế hoạch bảo trì, quản lý mẫu checklist và hồ sơ pháp lý (/facilities/*, /settings/checklists).",
      "Nhập và khóa sổ doanh thu tháng của cơ sở (/reports/monthly).",
      "Duyệt và chi trả hoa hồng đối tác; quản lý hợp đồng giá, khách đoàn (/partners).",
      "Phát hành và đổi voucher, chăm sóc sinh nhật khách (/rewards).",
      "Cấu hình chính sách hạng thành viên và giảm giá (/settings/loyalty).",
      "Phân phối khách tiềm năng B2B: gán, bỏ gán, chuyển người phụ trách, nhập Excel (/prospects).",
      "Xuất danh sách khách ra Excel (CCCD được che, tối đa 500 dòng/lần) và xem nhật ký cơ sở (/guests, /audit).",
    ],
    allowedRoutes: [
      {
        path: "/stays",
        label: "Khách đang ở",
        desc: "Trả phòng, hủy lượt (kể cả hủy trễ), người đi cùng.",
      },
      {
        path: "/facilities/work-orders",
        label: "Phiếu sự cố / Sửa chữa",
        desc: "Phân công, theo dõi SLA và nghiệm thu phiếu.",
      },
      {
        path: "/reports/monthly",
        label: "Doanh thu & Cùng kỳ",
        desc: "Nhập số liệu tháng, khóa sổ cơ sở.",
      },
      {
        path: "/partners",
        label: "Đối tác & Khách đoàn",
        desc: "Hợp đồng giá, đoàn, duyệt và chi trả hoa hồng.",
      },
      {
        path: "/rewards",
        label: "Sinh nhật & Voucher",
        desc: "Phát hành voucher, đổi mã, chăm sóc sinh nhật.",
      },
      {
        path: "/settings/loyalty",
        label: "Chính sách hạng & Giảm giá",
        desc: "Tạo, sửa, kích hoạt chính sách theo mùa / năm.",
      },
      {
        path: "/prospects",
        label: "Khách tiềm năng B2B",
        desc: "Gán / bỏ gán, nhập Excel, chuyển đổi.",
      },
      {
        path: "/audit",
        label: "Nhật ký thao tác",
        desc: "Truy vết thao tác tại cơ sở đang chọn.",
      },
    ],
    prohibitedActions: [
      "Không vào được Cài đặt hệ thống (cơ sở, phòng, tài khoản, phân quyền, module, kênh nguồn): đây là việc của Chủ chuỗi.",
      "Không tự duyệt cờ Blacklist hoặc gộp hồ sơ: chỉ ĐỀ XUẤT, Chủ chuỗi sẽ duyệt tại /approvals.",
      "Không mở khóa sổ doanh thu đã chốt (cần Chủ chuỗi) và không xem CCCD đầy đủ khi xuất file.",
      "Không can thiệp dữ liệu của cơ sở khác ngoài cơ sở được gán.",
    ],
    dailyChecklist: [
      "07:30 — Giao ban đầu ca với Lễ tân: khách dự kiến nhận / trả phòng trong ngày.",
      "10:00 — Mở /stays: xử lý các lượt 'Quá hạn trả phòng' (tab thống kê màu đỏ).",
      "11:00 — Mở /facilities/work-orders: phiếu 'Khẩn cấp' và phiếu 'Chờ nghiệm thu'; kiểm tra phòng đang khóa OOO.",
      "14:00 — Mở /prospects và /partners: khách tiềm năng quá hạn chăm sóc; hoa hồng chờ duyệt.",
      "Từ ngày 5 hằng tháng — Nhập và khóa sổ doanh thu tháng trước.",
    ],
    securityNote:
      "Quyết định hủy trễ, nhập bù, khóa phòng, duyệt hoa hồng đều ghi nhật ký kèm lý do. SĐT khách của sales khác vẫn hiển thị dạng che; chỉ quản lý được xem đầy đủ để điều phối.",
  },
  {
    key: "receptionist",
    title: "Lễ tân (Receptionist / Front Desk)",
    badge: "Tác nghiệp quầy",
    badgeColor:
      "bg-emerald-500/15 text-emerald-800 border-emerald-500/40 dark:text-emerald-300",
    iconName: "UserCheck",
    description:
      "Tuyến đầu tiếp đón: tra cứu khách, check-in, theo dõi khách đang ở, trả phòng, hủy lượt trong 6 giờ, báo sự cố, đổi voucher tại quầy và ghi nhận đồng ý nhận tin theo Nghị định 13.",
    keyResponsibilities: [
      "Tra cứu khách bằng SĐT, CCCD 12 số hoặc Passport rồi check-in (/check-in, phím tắt Enter để lưu).",
      "Đọc và xác nhận cảnh báo Blacklist trước khi nhận khách có cờ đỏ.",
      "Thêm người đi cùng (tối đa 10) và ghi nhận đồng ý nhận tin tiếp thị của khách (NĐ 13/2023).",
      "Trả phòng, hủy lượt trong vòng 6 giờ kể từ khi nhận phòng (/stays).",
      "Đề xuất cắm cờ Blacklist hoặc gộp hồ sơ khi phát hiện (Chủ chuỗi sẽ duyệt).",
      "Báo sự cố nhanh; khóa / mở khóa phòng ngừng bán khi cần (/facilities/report, /facilities/room-blocks).",
      "Đổi mã voucher cho khách tại quầy (/rewards).",
    ],
    allowedRoutes: [
      {
        path: "/check-in",
        label: "Check-in phòng",
        desc: "Tra cứu, chọn phòng theo tầng, kênh nguồn, người đi cùng.",
      },
      {
        path: "/stays",
        label: "Khách đang ở",
        desc: "Lọc theo trạng thái / ngày, trả phòng, hủy trong 6 giờ.",
      },
      {
        path: "/search",
        label: "Tra cứu khách",
        desc: "Tìm theo tên, SĐT, giấy tờ (cũng mở nhanh bằng Ctrl/Cmd + K).",
      },
      {
        path: "/guests",
        label: "Hồ sơ khách hàng",
        desc: "Xem hồ sơ 360, thêm ghi chú, thẻ, người đi cùng.",
      },
      {
        path: "/rewards",
        label: "Sinh nhật & Voucher",
        desc: "Đổi mã voucher cho khách (không phát hành mã mới).",
      },
      {
        path: "/facilities/report",
        label: "Báo sự cố nhanh",
        desc: "Tạo phiếu, có thể khóa phòng ngừng bán ngay.",
      },
      {
        path: "/facilities/room-blocks",
        label: "Khóa phòng ngừng bán",
        desc: "Khóa hoặc mở khóa phòng thủ công kèm lý do.",
      },
    ],
    prohibitedActions: [
      "Không chụp ảnh CCCD gửi qua mạng xã hội / Zalo cá nhân.",
      "Không hủy lượt ở đã quá 6 giờ và không nhập bù lượt quá khứ: chuyển Quản lý xử lý.",
      "Không tự duyệt Blacklist / gộp hồ sơ; không xuất danh sách khách; không vào Cài đặt hệ thống.",
      "Không trả phòng khi khách chưa thanh toán đủ hoặc chưa kiểm tra buồng phòng.",
    ],
    dailyChecklist: [
      "Nhận ca: đối soát chìa khóa, danh sách khách đang ở và các lượt 'Quá hạn trả phòng'.",
      "Xem banner mạng ở đầu trang: nếu mất mạng, bản nháp check-in được giữ trong trình duyệt.",
      "Mỗi lượt check-in: đối chiếu mặt khách với CCCD, đọc cảnh báo Blacklist, hỏi đồng ý nhận tin (không bắt buộc).",
      "Ghi chú đặc biệt của khách (dị ứng, thói quen) vào hồ sơ 360, mục 'Ghi chú & CSKH'.",
      "Bàn giao ca: danh sách trả phòng, tiền cọc, phòng đang khóa OOO.",
    ],
    securityNote:
      "Bản nháp check-in lưu ngay trên máy theo từng cơ sở và tự xóa sau khi lưu thành công. Số CCCD của khách cũ hiển thị che; chỉ nhập số mới khi cần thay đổi.",
  },
  {
    key: "sales",
    title: "Nhân viên Sales (Sales Executive)",
    badge: "Khách hàng & B2B",
    badgeColor:
      "bg-blue-500/15 text-blue-800 border-blue-500/40 dark:text-blue-300",
    iconName: "TrendingUp",
    description:
      "Phát triển khách đoàn, công ty lữ hành và doanh nghiệp: tìm và chăm sóc khách tiềm năng B2B, chuyển thành đối tác, ký hợp đồng giá, tạo đoàn, chăm sóc sinh nhật và phát hành voucher. Không thao tác quầy lễ tân.",
    keyResponsibilities: [
      "Tìm, nhận chăm sóc và ghi nhật ký liên hệ khách tiềm năng B2B; chuyển thành đối tác khi đồng ý hợp tác (/prospects).",
      "Quản lý hồ sơ đối tác, hợp đồng giá, tạo và theo dõi đoàn; xem hoa hồng (/partners).",
      "Gửi lời chúc sinh nhật và phát hành voucher ưu đãi (/rewards).",
      "Chăm sóc khách của mình: ghi chú, gắn thẻ, đề xuất gộp hồ sơ / cắm cờ (/guests).",
      "Xem chính sách hạng và mức giảm giá để tư vấn (/settings/loyalty, chỉ xem).",
    ],
    allowedRoutes: [
      {
        path: "/prospects",
        label: "Khách tiềm năng B2B",
        desc: "Pipeline chăm sóc, chống trùng, chuyển đổi, nhập Excel.",
      },
      {
        path: "/partners",
        label: "Đối tác & Khách đoàn",
        desc: "Đối tác, hợp đồng giá, đoàn do mình tạo, xem hoa hồng.",
      },
      {
        path: "/rewards",
        label: "Sinh nhật & Voucher",
        desc: "Chúc sinh nhật, phát hành voucher (không đổi mã).",
      },
      {
        path: "/guests",
        label: "Hồ sơ khách hàng",
        desc: "Hồ sơ 360, ghi chú, thẻ; SĐT đầy đủ chỉ với khách của mình.",
      },
      {
        path: "/search",
        label: "Tra cứu khách",
        desc: "Tìm khách toàn chuỗi (kết quả được che SĐT / CCCD).",
      },
      {
        path: "/settings/loyalty",
        label: "Chính sách hạng",
        desc: "Chỉ xem các mức hạng và % giảm giá.",
      },
    ],
    prohibitedActions: [
      "Không xem SĐT / CCCD đầy đủ của khách hoặc khách tiềm năng do người khác phụ trách (hiển thị dạng 090****232).",
      "Không sửa, ghi nhật ký hoặc chuyển đổi khách tiềm năng của sales khác; không sửa đoàn do người khác tạo.",
      "Không duyệt hoặc chi trả hoa hồng; không xem doanh thu; không check-in / trả phòng.",
      "Không xuất danh sách khách ra ngoài hệ thống.",
    ],
    dailyChecklist: [
      "Mở /prospects, lọc 'Quá hạn chăm sóc': gọi lại các công ty đã hẹn.",
      "Lọc 'Chưa gán' và bấm 'Nhận chăm sóc' các công ty phù hợp với khu vực của mình.",
      "Sau mỗi cuộc gọi / Zalo: ghi nhật ký (hình thức, kết quả, ngày hẹn tiếp).",
      "Mở /rewards: khách có sinh nhật trong 7 ngày, gửi lời chúc (SMS / Zalo / Email chỉ khi khách đã đồng ý).",
      "Mở /partners: kiểm tra đoàn sắp đến và hợp đồng sắp hết hạn.",
    ],
    securityNote:
      "Mỗi khách tiềm năng chỉ có một sales phụ trách để tránh gọi chồng chéo. Khi cần liên hệ khách của sales khác, hãy hỏi người phụ trách trước.",
  },
  {
    key: "technician",
    title: "Kỹ thuật & Bảo trì (Technician)",
    badge: "Cơ sở vật chất",
    badgeColor:
      "bg-orange-500/15 text-orange-800 border-orange-500/40 dark:text-orange-300",
    iconName: "Wrench",
    description:
      "Xử lý sự cố, bảo trì định kỳ và theo dõi hồ sơ pháp lý của cơ sở. Được phân công, bắt đầu, hoàn thành phiếu và khóa / mở khóa phòng; việc NGHIỆM THU đóng phiếu thuộc về Quản lý. Không truy cập dữ liệu cá nhân của khách.",
    keyResponsibilities: [
      "Nhận phiếu, phân công và cập nhật tiến độ: Bắt đầu, Chờ vật tư, Hoàn thành (/facilities/work-orders).",
      "Khi hoàn thành: ghi kết quả xử lý, chi phí vật tư và nhân công ngoài.",
      "Lập và chạy kế hoạch bảo trì định kỳ; thực hiện kiểm tra theo checklist (/facilities/maintenance).",
      "Quản lý danh mục tài sản, thiết bị (/facilities/assets).",
      "Theo dõi hồ sơ pháp lý, PCCC và cảnh báo hết hạn (/facilities/compliance, /facilities/alerts).",
      "Khóa / mở khóa phòng ngừng bán khi sửa chữa (/facilities/room-blocks).",
    ],
    allowedRoutes: [
      {
        path: "/facilities/work-orders",
        label: "Phiếu sự cố / Sửa chữa",
        desc: "Phân công, bắt đầu, hoàn thành phiếu (chờ Quản lý nghiệm thu).",
      },
      {
        path: "/facilities/report",
        label: "Báo sự cố nhanh",
        desc: "Tạo phiếu mới cho phòng hoặc khu vực chung.",
      },
      {
        path: "/facilities/maintenance",
        label: "Bảo trì & Kiểm tra",
        desc: "Kế hoạch bảo trì định kỳ, lịch sử kiểm tra phòng.",
      },
      {
        path: "/facilities/assets",
        label: "Danh mục tài sản",
        desc: "Thiết bị, tình trạng, lịch sử sửa chữa.",
      },
      {
        path: "/facilities/compliance",
        label: "Hồ sơ pháp lý & PCCC",
        desc: "Xem hồ sơ và ngày hết hạn (chỉ xem).",
      },
      {
        path: "/facilities/alerts",
        label: "Cảnh báo hết hạn",
        desc: "Hồ sơ sắp hết hạn hoặc đã quá hạn.",
      },
      {
        path: "/facilities/room-blocks",
        label: "Khóa phòng ngừng bán",
        desc: "Khóa hoặc mở khóa phòng thủ công.",
      },
    ],
    prohibitedActions: [
      "Không nghiệm thu / đóng phiếu của chính mình: bước này dành cho Quản lý hoặc Chủ chuỗi.",
      "Không tạo mẫu checklist hoặc cập nhật hồ sơ pháp lý (chỉ xem hồ sơ pháp lý).",
      "Không xem hồ sơ khách, doanh thu hay báo cáo kinh doanh.",
    ],
    dailyChecklist: [
      "08:00 — Mở /facilities/work-orders, ưu tiên phiếu 'Khẩn cấp' (SLA 4 giờ) và 'Ưu tiên cao' (24 giờ).",
      "Mỗi phiếu: Bắt đầu khi tới hiện trường; nếu thiếu vật tư chuyển 'Chờ vật tư' kèm ghi chú.",
      "Khi xong: bấm 'Hoàn thành', nhập kết quả xử lý và chi phí để Quản lý nghiệm thu.",
      "Mở /facilities/maintenance: kế hoạch 'Đến hạn trong N ngày'.",
      "Cuối ngày — Kiểm tra /facilities/alerts: hồ sơ PCCC / ATTP sắp hết hạn.",
    ],
    securityNote:
      "Tài khoản Kỹ thuật bị từ chối truy cập mọi dữ liệu cá nhân khách hàng và dữ liệu doanh thu ở cả tầng ứng dụng lẫn cơ sở dữ liệu.",
  },
];
