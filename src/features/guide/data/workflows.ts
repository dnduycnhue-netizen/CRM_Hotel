import type { WorkflowDiagram } from "../types";

// Mỗi SOP đối chiếu với hành vi thật của hệ thống (nhãn nút, ngưỡng, quyền).
// Mã SOP: FO = Lễ tân · ENG = Kỹ thuật · CRM = Khách hàng · ADM = Quản trị
//         SAL = Kinh doanh B2B · FIN = Doanh thu

export const WORKFLOW_DIAGRAMS: WorkflowDiagram[] = [
  {
    id: "wf-checkin-checkout",
    code: "SOP-FO-01",
    title: "Quy trình Check-in, Lưu trú & Check-out",
    description:
      "Từ lúc khách đến quầy đến khi trả phòng: tra cứu khách quen, kiểm soát cảnh báo, chọn phòng và kênh nguồn, người đi cùng, đồng ý nhận tin, trả phòng và hủy lượt.",
    primaryRole: "Lễ tân & Quản lý cơ sở",
    nodes: [
      {
        id: "fo-1",
        stepNumber: 1,
        title: "Tra cứu khách bằng một ô duy nhất",
        role: "Lễ tân",
        screen: "/check-in",
        action:
          "Nhập SĐT, CCCD 12 số hoặc số Passport vào ô '1. Ô Tra Cứu Nhanh'. Hệ thống tự nhận diện loại giá trị.",
        details: [
          "Khách cũ: họ tên, ngày sinh, giới tính, giấy tờ được điền sẵn và khung 'Hồ sơ khách 360' bên phải hiện hạng thành viên, số lượt ở.",
          "Số CCCD của khách cũ hiển thị 'Đã lưu hồ sơ (bảo mật)': chỉ nhập số mới khi cần đổi.",
          "Khách mới: nhập họ tên, ngày sinh, giấy tờ theo CCCD / Hộ chiếu trực tiếp trên biểu mẫu.",
        ],
        caution:
          "Luôn đối chiếu khuôn mặt khách với ảnh trên giấy tờ trước khi lưu.",
      },
      {
        id: "fo-2",
        stepNumber: 2,
        title: "Đọc cảnh báo Blacklist",
        role: "Lễ tân (hệ thống tự quét)",
        screen: "/check-in",
        action:
          "Nếu khách có cờ đã được duyệt, một hộp cảnh báo đỏ hiện kèm lý do. Phải tick xác nhận đã đọc mới lưu được.",
        details: [
          "Hộp cảnh báo ghi lý do vi phạm do Chủ chuỗi đã duyệt (áp dụng cho cả 8 cơ sở).",
          "Tick 'Tôi xác nhận đã đọc cảnh báo và chịu trách nhiệm tiếp nhận'; nếu không tick, hệ thống từ chối lưu.",
          "Cần hỗ trợ: mời Quản lý cơ sở xử lý trước khi nhận phòng.",
        ],
      },
      {
        id: "fo-3",
        stepNumber: 3,
        title: "Chọn phòng, kênh nguồn, dự kiến trả",
        role: "Lễ tân",
        screen: "/check-in",
        action:
          "Chọn phòng trên lưới theo tầng, chọn kênh nguồn và giờ dự kiến trả phòng.",
        details: [
          "Màu trạng thái phòng: Sẵn sàng đón khách · Chờ dọn dẹp · Đang có khách · Khóa OOO. Phòng đang có khách hoặc khóa OOO không chọn được.",
          "Phòng 'Chờ dọn dẹp' có nút 'Báo sạch': Lễ tân xác nhận buồng phòng dọn xong để mở bán check-in ngay mà không cần chờ hết 6 giờ mặc định.",
          "Kênh nguồn: khách vãng lai, điện thoại / Zalo, OTA (Booking.com, Agoda…), đối tác tour, khách công ty. Kênh đại lý / công ty bắt buộc chọn đối tác liên kết.",
          "Dự kiến trả phòng mặc định 12:00 ngày hôm sau. Giá phòng/đêm và tiền cọc là tùy chọn.",
        ],
      },
      {
        id: "fo-4",
        stepNumber: 4,
        title: "Người đi cùng & đồng ý nhận tin",
        role: "Lễ tân",
        screen: "/check-in",
        action:
          "Thêm người đi cùng (tối đa 10) và ghi nhận khách có đồng ý nhận tin tiếp thị hay không.",
        details: [
          "'Thêm người đi cùng': có thể tra khách cũ bằng SĐT / CCCD hoặc tạo mới; trẻ em dưới 14 tuổi không bắt buộc giấy tờ.",
          "Mỗi người đi cùng có ô 'Tính lượt cho hạng thành viên' (mặc định theo chính sách hạng); nhân viên có thể bỏ tick nếu người đó không được tích lũy.",
          "Khối 'Đồng thuận tiếp thị' (NĐ 13/2023): Zalo ZNS, SMS, Email, Cuộc gọi CSKH. Tự nguyện, mặc định KHÔNG tích; đọc kịch bản gợi ý cho khách.",
        ],
        caution:
          "Không tự tích đồng ý thay khách. Kênh SMS / Zalo / Email chỉ dùng cho khách đã đồng ý.",
      },
      {
        id: "fo-5",
        stepNumber: 5,
        title: "Hoàn tất check-in",
        role: "Lễ tân & Hệ thống",
        screen: "/stays",
        action:
          "Bấm 'Hoàn Tất Check-in' (hoặc phím Enter). Khách xuất hiện ở danh sách Khách đang ở.",
        details: [
          "Bản nháp biểu mẫu được lưu trong trình duyệt theo từng cơ sở: tải lại trang hay mất mạng không mất dữ liệu; tự xóa khi lưu thành công.",
          "Quản lý có thể bật công tắc 'Nhập bù' để nhập lượt ở trong quá khứ (giờ vào / ra thực tế).",
          "Nhập bù chỉ dành cho người có quyền nhập lượt quá khứ (Quản lý, Chủ chuỗi).",
        ],
      },
      {
        id: "fo-6",
        stepNumber: 6,
        title: "Trong thời gian lưu trú",
        role: "Lễ tân",
        screen: "/stays",
        action:
          "Theo dõi khách, cập nhật người trong phòng và báo sự cố khi khách phản ánh.",
        details: [
          "Thống kê đầu trang: 'Phòng có khách', 'Tổng số khách', 'Quá hạn trả phòng' (màu đỏ).",
          "Dùng bộ lọc trạng thái (Đang ở, Quá hạn, Đã trả, Đã hủy) và ngày để tìm nhanh.",
          "Nút 'Khách trong phòng' mở danh sách: thêm / xóa người đi cùng, bật tắt tính lượt hạng.",
          "Phòng hỏng: dùng 'Báo sự cố' ở thanh đầu trang (xem SOP-ENG-02).",
        ],
      },
      {
        id: "fo-7",
        stepNumber: 7,
        title: "Trả phòng",
        role: "Lễ tân",
        screen: "/stays",
        action:
          "Bấm 'Trả phòng' trên dòng khách, kiểm tra giờ trả thực tế rồi xác nhận.",
        details: [
          "Giờ ghi nhận theo múi giờ Việt Nam; phòng chuyển sang trạng thái chờ dọn dẹp.",
          "Nút 'Báo sạch' (trên lưới chọn phòng /check-in hoặc bảng /stays): cho phép mở bán phòng ngay khi buồng phòng hoàn tất dọn trước 6 giờ mặc định.",
          "Số lượt ở, số đêm và hạng thành viên của khách được tính lại tự động từ lượt ở thực tế (không nhập tay).",
        ],
        caution:
          "Chỉ trả phòng khi khách đã thanh toán đủ và buồng phòng đã được kiểm tra.",
      },
      {
        id: "fo-8",
        stepNumber: 8,
        title: "Hủy lượt ở (nhập nhầm, khách không đến)",
        role: "Lễ tân / Quản lý",
        screen: "/stays",
        action:
          "Bấm biểu tượng hủy trên dòng khách và nhập lý do (tối thiểu 5 ký tự).",
        details: [
          "Trong vòng 6 giờ kể từ khi nhận phòng: Lễ tân tự hủy được.",
          "Quá 6 giờ: nút bị khóa với Lễ tân; chỉ Quản lý / Chủ chuỗi hủy được và hộp thoại hiện 'Cảnh báo hủy trễ'.",
          "Lượt đã hủy không tính vào số lượt ở, số đêm hay hạng của khách.",
        ],
        caution:
          "Hủy lượt là thao tác ghi nhật ký kiểm toán; lý do phải trung thực.",
      },
    ],
  },
  {
    id: "wf-facility-maintenance",
    code: "SOP-ENG-02",
    title: "Quy trình Xử lý Sự cố & Khóa phòng ngừng bán (OOO)",
    description:
      "Phối hợp giữa Lễ tân, Kỹ thuật và Quản lý: báo sự cố, phân công, sửa chữa, nghiệm thu và mở lại phòng. Có SLA theo mức ưu tiên.",
    primaryRole: "Kỹ thuật & Quản lý cơ sở",
    nodes: [
      {
        id: "eng-1",
        stepNumber: 1,
        title: "Báo sự cố",
        role: "Lễ tân / Kỹ thuật / Quản lý",
        screen: "/facilities/report",
        action: "Điền biểu mẫu báo sự cố ngay khi phát hiện.",
        details: [
          "Chọn cơ sở, chọn Phòng hoặc Khu vực chung, nhập tiêu đề và mô tả.",
          "Mức ưu tiên và SLA: Khẩn cấp 4 giờ · Ưu tiên cao 24 giờ · Bình thường 72 giờ · Ưu tiên thấp 7 ngày.",
          "Với sự cố ở phòng: tick 'Khóa phòng ngừng bán (Out of Order)' để chặn check-in phòng đó ngay (cần quyền khóa phòng).",
        ],
      },
      {
        id: "eng-2",
        stepNumber: 2,
        title: "Nhận việc",
        role: "Kỹ thuật / Quản lý",
        screen: "/facilities/work-orders",
        action:
          "Phiếu mới ở trạng thái 'Mới tạo' và 'Chưa phân công'. Người xử lý bấm 'Bắt đầu' để nhận việc; người bấm trở thành người xử lý của phiếu.",
        details: [
          "Danh sách có các bộ lọc nhanh: Tất cả, Đang mở (chưa đóng), Khẩn cấp, Phòng đang khóa, Chờ nghiệm thu.",
          "Biểu tượng con mắt mở chi tiết phiếu: mô tả, nhật ký tiến trình, kết quả xử lý.",
          "Hủy phiếu cần ghi chú lý do; phiếu đã đóng hoặc hủy không còn thao tác.",
        ],
      },
      {
        id: "eng-3",
        stepNumber: 3,
        title: "Xử lý tại hiện trường",
        role: "Kỹ thuật viên",
        screen: "/facilities/work-orders",
        action:
          "Bấm 'Bắt đầu' khi tới nơi; thiếu vật tư thì chuyển 'Chờ vật tư / tạm dừng' kèm ghi chú.",
        details: [
          "Phiếu gắn thiết bị: thiết bị tự chuyển sang 'Đang sửa chữa'.",
          "Cột 'Ưu tiên / SLA' hiển thị hạn xử lý; quá hạn hiện chữ đỏ.",
        ],
      },
      {
        id: "eng-4",
        stepNumber: 4,
        title: "Hoàn thành & nhập chi phí",
        role: "Kỹ thuật viên",
        screen: "/facilities/work-orders",
        action:
          "Bấm 'Hoàn thành', ghi kết quả xử lý (tối thiểu 3 ký tự), chi phí phụ tùng / vật tư và nhân công ngoài.",
        details: [
          "Phiếu chuyển sang 'Chờ nghiệm thu'.",
          "Chi phí cộng dồn vào báo cáo CSVC (/reports, tab CSVC & Kỹ thuật).",
        ],
      },
      {
        id: "eng-5",
        stepNumber: 5,
        title: "Nghiệm thu & mở lại phòng",
        role: "Quản lý / Chủ chuỗi",
        screen: "/facilities/work-orders",
        action:
          "Kiểm tra thực tế rồi bấm 'Nghiệm thu'. Phiếu đóng và phòng khóa OOO gắn với phiếu được tự mở khóa.",
        details: [
          "Hộp xác nhận ghi số phiếu; sau khi đóng phiếu không sửa được kết quả.",
          "Phiếu sinh ra từ kế hoạch bảo trì định kỳ: khi nghiệm thu, hạn bảo trì kế tiếp tự dời theo chu kỳ.",
        ],
        caution:
          "Kỹ thuật viên không tự nghiệm thu phiếu của mình; bước này cần quyền nghiệm thu.",
      },
      {
        id: "eng-6",
        stepNumber: 6,
        title: "Khóa / mở khóa phòng thủ công",
        role: "Lễ tân / Kỹ thuật / Quản lý",
        screen: "/facilities/room-blocks",
        action:
          "Dùng 'Khóa phòng thủ công' cho phòng cần ngừng bán không qua phiếu (sơn sửa, giữ chỗ…); mở khóa ngay trên dòng khi hết lý do.",
        details: [
          "Nhập lý do khóa; phòng bị khóa không còn xuất hiện là phòng sẵn sàng ở màn hình check-in.",
          "Bảng liệt kê cơ sở & phòng, lý do, thời gian, nguồn khóa (thủ công / từ phiếu) và người thực hiện.",
        ],
      },
    ],
  },
  {
    id: "wf-maintenance-compliance",
    code: "SOP-ENG-09",
    title: "Quy trình Bảo trì định kỳ, Kiểm tra phòng & Hồ sơ pháp lý",
    description:
      "Phòng ngừa thay vì chữa cháy: lập kế hoạch bảo trì theo chu kỳ, kiểm tra phòng bằng checklist, theo dõi hồ sơ pháp lý (PCCC, ATTP, ANTT…) và cảnh báo hết hạn.",
    primaryRole: "Kỹ thuật & Quản lý cơ sở",
    nodes: [
      {
        id: "pm-1",
        stepNumber: 1,
        title: "Lập kế hoạch bảo trì định kỳ",
        role: "Kỹ thuật / Quản lý",
        screen: "/facilities/maintenance",
        action:
          "Tab 'Kế hoạch bảo trì' → 'Tạo kế hoạch bảo trì': chọn thiết bị hoặc khu vực, chu kỳ (ngày) và hạn kế tiếp.",
        details: [
          "Kế hoạch hiển thị 'Đến hạn trong N ngày' để chủ động chuẩn bị.",
          "Nút 'Tạo phiếu ngay' sinh phiếu công việc tức thì; có thể xóa kế hoạch không còn dùng.",
          "Khi phiếu sinh ra được nghiệm thu, hạn kế tiếp tự cộng thêm một chu kỳ.",
        ],
      },
      {
        id: "pm-2",
        stepNumber: 2,
        title: "Tạo mẫu checklist kiểm tra",
        role: "Quản lý / Chủ chuỗi",
        screen: "/settings/checklists",
        action:
          "Tạo mẫu checklist (các hạng mục kiểm tra) cho phòng hoặc khu vực chung.",
        details: [
          "Mẫu được dùng khi 'Thực hiện kiểm tra phòng'.",
          "Mẫu đã tạo hiển thị ở thẻ 'Mẫu kiểm tra chuẩn (Checklist)' trên trang Bảo trì & Kiểm tra.",
        ],
      },
      {
        id: "pm-3",
        stepNumber: 3,
        title: "Thực hiện kiểm tra phòng",
        role: "Lễ tân / Kỹ thuật / Quản lý",
        screen: "/facilities/inspections/new",
        action:
          "Bấm '+ Thực hiện kiểm tra phòng', chọn mẫu và phòng, đánh dấu Đạt / Không đạt từng hạng mục rồi lưu biên bản.",
        details: [
          "Biên bản lưu ở tab 'Lịch sử kiểm tra' với tỷ lệ đạt (%).",
          "Hạng mục không đạt nên kèm báo sự cố để kỹ thuật xử lý.",
        ],
      },
      {
        id: "pm-4",
        stepNumber: 4,
        title: "Cập nhật hồ sơ pháp lý, kiểm định",
        role: "Quản lý / Chủ chuỗi",
        screen: "/facilities/compliance",
        action:
          "'Thêm hồ sơ pháp lý': loại hồ sơ, số hiệu, ngày hết hạn và file đính kèm.",
        details: [
          "'Ma trận pháp lý' xem theo cơ sở × loại hồ sơ; ô trống 'Bổ sung' là hồ sơ còn thiếu.",
          "Mỗi loại hồ sơ có mốc báo trước riêng (30 / 60 / 90 ngày) để cảnh báo sớm.",
          "Bốn thẻ đầu trang: Tổng hồ sơ · Đã hết hạn định kỳ · Sắp hết hạn · Hợp lệ & còn hạn tốt.",
        ],
      },
      {
        id: "pm-5",
        stepNumber: 5,
        title: "Xử lý cảnh báo hết hạn",
        role: "Kỹ thuật / Quản lý",
        screen: "/facilities/alerts",
        action:
          "Mỗi ngày mở 'Cảnh báo hết hạn', xử lý hồ sơ đã hết hạn hoặc sắp hết hạn.",
        details: [
          "Lọc theo mức độ: đã hết hạn, sắp hết hạn, còn hạn.",
          "Sau khi gia hạn: cập nhật ngày hết hạn mới ở /facilities/compliance.",
        ],
      },
    ],
  },
  {
    id: "wf-blacklist-merge",
    code: "SOP-CRM-03",
    title: "Quy trình Cắm cờ Blacklist & Gộp Hồ sơ Khách Trùng",
    description:
      "Kiểm soát rủi ro vi phạm và giữ dữ liệu khách sạch: nhân viên ĐỀ XUẤT, Chủ chuỗi PHÊ DUYỆT.",
    primaryRole: "Lễ tân, Sales, Quản lý (đề xuất) & Chủ chuỗi (duyệt)",
    nodes: [
      {
        id: "crm-1",
        stepNumber: 1,
        title: "Đề xuất cắm cờ",
        role: "Lễ tân / Sales / Quản lý",
        screen: "/guests",
        action: "Mở hồ sơ khách 360 → tab 'Cờ cảnh báo' → 'Đề xuất gắn cờ'.",
        details: [
          "Chọn mức: Blacklist (cảnh báo đỏ) hoặc Cần chú ý.",
          "Bắt buộc nhập lý do chi tiết tối thiểu 10 ký tự.",
          "Đề xuất chuyển sang trạng thái chờ duyệt, chưa có hiệu lực.",
        ],
      },
      {
        id: "crm-2",
        stepNumber: 2,
        title: "Chủ chuỗi phê duyệt cờ",
        role: "Chủ chuỗi",
        screen: "/approvals",
        action:
          "Tab 'Cờ Blacklist chờ duyệt': xem lý do, bấm Phê duyệt hoặc Từ chối.",
        details: [
          "Sau khi duyệt, cờ hiện cảnh báo đỏ khi bất kỳ cơ sở nào check-in khách này.",
          "Tab 'Cờ Blacklist đang hiệu lực': gỡ cờ khi khách đã khắc phục (lý do tối thiểu 5 ký tự).",
        ],
        caution:
          "Quản lý cơ sở không có quyền duyệt cờ; hãy nhắc Chủ chuỗi xử lý.",
      },
      {
        id: "crm-3",
        stepNumber: 3,
        title: "Đề xuất gộp hồ sơ trùng",
        role: "Lễ tân / Sales / Quản lý",
        screen: "/guests",
        action:
          "Trên hồ sơ khách 360 bấm 'Đề xuất gộp hồ sơ', tìm hồ sơ trùng và chọn hồ sơ GIỮ LẠI.",
        details: [
          "Tìm hồ sơ trùng bằng tên hoặc SĐT.",
          "Nhập lý do giải trình gộp hồ sơ.",
        ],
      },
      {
        id: "crm-4",
        stepNumber: 4,
        title: "Chủ chuỗi thẩm định & hợp nhất",
        role: "Chủ chuỗi",
        screen: "/approvals",
        action:
          "Tab 'Gộp hồ sơ trùng lặp': xem thẻ so sánh hai hồ sơ và bấm phê duyệt.",
        details: [
          "Toàn bộ lượt ở, ghi chú, thẻ của hồ sơ bị gộp chuyển sang hồ sơ giữ lại.",
          "Hồ sơ bị gộp bị vô hiệu hóa; thao tác ghi vào nhật ký (/audit).",
        ],
        caution: "Gộp hồ sơ là vĩnh viễn, không thể hoàn tác.",
      },
    ],
  },
  {
    id: "wf-prospect-b2b",
    code: "SOP-SAL-05",
    title: "Quy trình Khách hàng tiềm năng B2B → Đối tác",
    description:
      "Tìm và chăm sóc công ty tour, đại lý, doanh nghiệp chưa hợp tác mà không gọi chồng chéo; khi đồng ý hợp tác thì chuyển thành đối tác chỉ bằng một nút.",
    primaryRole: "Sales (chủ trì), Quản lý & Chủ chuỗi",
    nodes: [
      {
        id: "sal-1",
        stepNumber: 1,
        title: "Kiểm tra trước khi liên hệ",
        role: "Sales",
        screen: "/prospects",
        action:
          "Gõ tên công ty, SĐT hoặc website vào ô tìm kiếm để xem công ty đã có người chăm sóc chưa.",
        details: [
          "Lọc theo trạng thái, loại hình, tỉnh, sales phụ trách hoặc 'Chưa gán'.",
          "Công ty của sales khác chỉ hiện SĐT dạng che (090****232): hỏi người phụ trách trước khi gọi.",
        ],
      },
      {
        id: "sal-2",
        stepNumber: 2,
        title: "Thêm mới & chống trùng",
        role: "Sales",
        screen: "/prospects",
        action:
          "'Thêm khách tiềm năng': tối thiểu tên công ty và (SĐT hoặc email).",
        details: [
          "Trùng mã số thuế hoặc SĐT với khách tiềm năng / đối tác khác: hệ thống CHẶN và dẫn tới bản ghi đã có.",
          "Nghi trùng (tên giống + cùng tỉnh, hoặc cùng website riêng): chọn Mở bản ghi cũ, Gộp thông tin vào bản cũ, hoặc Vẫn tạo (bắt buộc ghi lý do).",
          "SĐT được chuẩn hóa tự động (+84 → 0, bỏ dấu cách, dấu chấm) trước khi so sánh.",
        ],
      },
      {
        id: "sal-3",
        stepNumber: 3,
        title: "Nhận chăm sóc",
        role: "Sales",
        screen: "/prospects",
        action:
          "Với dòng 'Chưa gán', bấm 'Nhận chăm sóc' để trở thành người phụ trách duy nhất.",
        details: [
          "Sau khi nhận: được sửa thông tin, ghi nhật ký, đổi trạng thái và chuyển đổi.",
          "Sales khác bấm nhận tiếp sẽ bị chặn kèm tên người đã nhận.",
          "Sales tạo mới thì mặc định là người phụ trách; quản lý có thể chọn 'Không gán' khi tạo để sales tự nhận.",
        ],
      },
      {
        id: "sal-4",
        stepNumber: 4,
        title: "Chăm sóc & ghi nhật ký",
        role: "Người phụ trách",
        screen: "/prospects",
        action:
          "Mở hồ sơ, điền 'Ghi nhận lần liên hệ': hình thức, kết quả, ghi chú, ngày hẹn tiếp.",
        details: [
          "Hình thức: Gọi điện · Zalo · Email · Gặp trực tiếp · Gửi báo giá · Khác.",
          "Pipeline: Mới tìm được → Đã liên hệ → Đang chăm sóc → Đang đàm phán. Hai trạng thái sau bắt buộc có ngày hẹn.",
          "Quá ngày hẹn mà chưa có liên hệ mới: công ty vào mục 'Quá hạn chăm sóc'.",
        ],
      },
      {
        id: "sal-5",
        stepNumber: 5,
        title: "Kết thúc hoặc chuyển đổi",
        role: "Người phụ trách",
        screen: "/prospects",
        action:
          "'Chuyển thành đối tác' khi đồng ý hợp tác; hoặc đổi sang 'Không tiềm năng' / 'Trùng lặp'.",
        details: [
          "Chuyển đổi không cần quản lý duyệt: tạo hồ sơ đối tác (loại hình, liên hệ, MST, địa chỉ) và khóa hồ sơ tiềm năng.",
          "'Không tiềm năng' bắt buộc ghi lý do; 'Trùng lặp' phải chọn bản ghi gốc.",
          "Sau chuyển đổi, làm tiếp hợp đồng giá, đoàn, hoa hồng tại /partners (SOP-SAL-06).",
        ],
        caution:
          "Nếu đối tác đã tồn tại (trùng MST / SĐT / tên), hệ thống dừng và dẫn tới đối tác đó, không tạo trùng.",
      },
      {
        id: "sal-6",
        stepNumber: 6,
        title: "Quản lý: phân phối & nhập hàng loạt",
        role: "Quản lý / Chủ chuỗi",
        screen: "/prospects",
        action:
          "Chuyển phụ trách, chọn 'Không gán', bỏ gán hàng loạt, hoặc 'Nhập Excel/CSV'.",
        details: [
          "Nhập Excel/CSV (tối đa 500 dòng): bước 1 xem trước phân loại Mới / Nghi trùng / Trùng cứng, bước 2 chỉ ghi các dòng được tick.",
          "Checkbox 'Để trống người phụ trách' đưa cả lô vào trạng thái chưa gán cho sales tự nhận.",
          "Dòng nghi trùng được tạo kèm lý do sẽ nằm ở 'Chờ xử lý trùng' để xem xét.",
          "Chọn nhiều dòng rồi 'Bỏ gán các dòng đã chọn' để thu hồi hàng loạt (có xác nhận).",
        ],
      },
    ],
  },
  {
    id: "wf-partner-group",
    code: "SOP-SAL-06",
    title: "Quy trình Đối tác, Hợp đồng giá, Khách đoàn & Hoa hồng",
    description:
      "Từ hồ sơ đối tác đến hợp đồng giá bán buôn, đoàn khách và chi trả hoa hồng đại lý.",
    primaryRole: "Sales & Quản lý cơ sở",
    nodes: [
      {
        id: "ptn-1",
        stepNumber: 1,
        title: "Tạo hồ sơ đối tác",
        role: "Sales / Quản lý",
        screen: "/partners",
        action: "Tab 'Đối tác & OTA' → 'Thêm đối tác'.",
        details: [
          "Phân loại: Đại lý du lịch, Công ty lữ hành, Doanh nghiệp, OTA, Hướng dẫn viên / Lái xe, Khác.",
          "Nhập MST, người liên hệ, SĐT, email, địa chỉ, hạn mức và điều khoản công nợ.",
          "Đối tác từ khách tiềm năng đã được tạo sẵn khi bấm 'Chuyển thành đối tác'.",
        ],
      },
      {
        id: "ptn-2",
        stepNumber: 2,
        title: "Ký hợp đồng giá B2B",
        role: "Sales / Quản lý",
        screen: "/partners",
        action:
          "'Ký hợp đồng B2B': số hợp đồng, thời hạn, % chiết khấu, % hoa hồng.",
        details: [
          "Trạng thái hợp đồng: Đang hiệu lực, Đã hết hạn, Đã chấm dứt.",
          "Tỷ lệ hoa hồng của hợp đồng đang hiệu lực được dùng khi tính hoa hồng cho đoàn.",
        ],
      },
      {
        id: "ptn-3",
        stepNumber: 3,
        title: "Tạo và điều phối đoàn",
        role: "Sales / Quản lý",
        screen: "/partners",
        action:
          "'Tạo đoàn mới': cơ sở, đối tác, tên đoàn, trưởng đoàn, giờ nhận / trả, số phòng, số khách, dự toán, đặt cọc.",
        details: [
          "Trạng thái đoàn: Báo giá / Dự thảo · Đã xác nhận · Đang lưu trú · Đã hoàn thành · Đã hủy.",
          "Sales chỉ sửa được đoàn do chính mình tạo; Quản lý / Chủ chuỗi sửa được mọi đoàn (đoàn khác chỉ mở xem 'Chi tiết').",
          "Giờ nhận / trả hiển thị theo múi giờ Việt Nam.",
        ],
      },
      {
        id: "ptn-4",
        stepNumber: 4,
        title: "Hoa hồng tự sinh",
        role: "Hệ thống",
        screen: "/partners",
        action:
          "Đoàn có đối tác và dự toán lớn hơn 0 sẽ tự sinh một dòng hoa hồng 'Chờ phê duyệt'.",
        details: [
          "Tỷ lệ lấy theo hợp đồng đang hiệu lực của đối tác; không có hợp đồng thì mặc định 10%.",
          "Sửa dự toán đoàn thì dòng hoa hồng còn 'Chờ phê duyệt' tự cập nhật theo.",
        ],
      },
      {
        id: "ptn-5",
        stepNumber: 5,
        title: "Duyệt và chi trả hoa hồng",
        role: "Quản lý / Chủ chuỗi",
        screen: "/partners",
        action:
          "Tab 'Bảng kê hoa hồng': 'Duyệt' → 'Đã duyệt (chờ chi)' → 'Chi trả'; hoặc 'Hủy'.",
        details: [
          "Chỉ người có quyền quản lý hoa hồng thấy cột thao tác; Sales chỉ xem.",
          "Thẻ đầu trang 'Hoa hồng chờ thanh toán' và 'Đã chi trả' cập nhật theo.",
        ],
        caution:
          "'Chi trả' ghi nhận người chi và thời điểm: chỉ bấm khi đã chuyển khoản thật.",
      },
    ],
  },
  {
    id: "wf-birthday-voucher",
    code: "SOP-CRM-07",
    title: "Quy trình Sinh nhật & Voucher ưu đãi",
    description:
      "Chăm sóc khách vào dịp sinh nhật, phát hành voucher và đổi mã tại quầy, tuân thủ Nghị định 13 về đồng ý nhận tin.",
    primaryRole: "Sales (chăm sóc), Lễ tân (đổi mã), Quản lý",
    nodes: [
      {
        id: "vc-1",
        stepNumber: 1,
        title: "Xem khách sắp sinh nhật",
        role: "Sales / Quản lý",
        screen: "/rewards",
        action:
          "Tab 'Sinh nhật khách hàng': lọc Hôm nay / 7 / 14 / 30 / 60 ngày tới.",
        details: [
          "Thẻ khách hiện ngày sinh (DD/MM/YYYY), tuổi mới, hạng thành viên, số lượt ở.",
          "Dòng 'Quyền nhận tin (NĐ 13)' cho biết khách đã đồng ý hay chưa.",
        ],
      },
      {
        id: "vc-2",
        stepNumber: 2,
        title: "Gửi lời chúc & tặng voucher",
        role: "Sales / Quản lý",
        screen: "/rewards",
        action:
          "'Gửi lời chúc & Tặng voucher': chọn cơ sở, hình thức chúc, quà tặng và voucher sinh nhật.",
        details: [
          "Hình thức: Gọi điện, SMS, Zalo, Email, Chúc trực tiếp tại quầy, Gửi quà.",
          "SMS / Zalo / Email bị khóa '(Khóa theo NĐ 13)' nếu khách chưa đồng ý: dùng gọi điện hoặc chúc trực tiếp.",
          "Voucher sinh nhật tự tạo: riêng cho khách đó, mặc định giảm 15% (tối đa 500.000đ), hiệu lực 60 ngày, dùng 1 lần.",
        ],
      },
      {
        id: "vc-3",
        stepNumber: 3,
        title: "Phát hành voucher khuyến mãi",
        role: "Sales / Quản lý",
        screen: "/rewards",
        action: "Tab 'Mã ưu đãi / Voucher' → 'Phát hành Voucher'.",
        details: [
          "Mã tối thiểu 3 ký tự (có nút sinh mã ngẫu nhiên PROMO-XXXXXX).",
          "Loại giảm: theo % (tối đa 100%, có thể đặt mức giảm tối đa) hoặc số tiền cố định.",
          "Đặt hạn dùng, số lượt tối đa, hóa đơn tối thiểu, cơ sở áp dụng; chọn khách mục tiêu hoặc để 'Tất cả khách' (voucher công khai).",
        ],
      },
      {
        id: "vc-4",
        stepNumber: 4,
        title: "Đổi mã tại quầy",
        role: "Lễ tân / Quản lý",
        screen: "/rewards",
        action:
          "'Áp dụng Voucher' (hoặc 'Đổi mã' trên dòng voucher): nhập mã, chọn khách, cơ sở và giá trị hóa đơn.",
        details: [
          "Kết quả hiện số tiền giảm trừ và số tiền cần thanh toán.",
          "Lỗi được báo cụ thể: mã không tồn tại, chưa tới hạn / hết hạn, hết lượt dùng, không áp dụng tại cơ sở này, voucher riêng của khách khác, hóa đơn chưa đạt mức tối thiểu.",
          "Mỗi lần đổi thành công tăng số lượt đã dùng và ghi vào tab 'Lịch sử đổi voucher'.",
        ],
      },
    ],
  },
  {
    id: "wf-monthly-revenue",
    code: "SOP-FIN-08",
    title: "Quy trình Nhập & Khóa sổ doanh thu tháng",
    description:
      "Mỗi tháng, từng cơ sở nhập số liệu kinh doanh nền (doanh thu, đêm phòng) để báo cáo ADR / RevPAR chính xác và khóa sổ chống chỉnh sửa.",
    primaryRole: "Quản lý cơ sở (nhập) & Chủ chuỗi (mở khóa)",
    nodes: [
      {
        id: "fin-1",
        stepNumber: 1,
        title: "Mở bảng nhập số liệu",
        role: "Quản lý",
        screen: "/reports/monthly",
        action:
          "Tab 'Doanh thu 12 tháng' → 'Nhập số liệu tháng'. Từ ngày 5 hằng tháng có banner nhắc kỳ báo cáo.",
        details: [
          "Chọn tháng cần nhập; mỗi cơ sở được phép nhập hiển thị một dòng.",
          "Cột 'Nguồn dữ liệu' cho biết tháng đang dùng số liệu hệ thống CRM hay số liệu đã nhập.",
        ],
      },
      {
        id: "fin-2",
        stepNumber: 2,
        title: "Nhập số liệu từng cơ sở",
        role: "Quản lý",
        screen: "/reports/monthly",
        action:
          "Điền lượt đến, số khách, đêm phòng bán, đêm phòng khả dụng, doanh thu phòng, doanh thu khác và ghi chú.",
        details: [
          "Số liệu CRM của tháng hiển thị bên cạnh để đối chiếu; đêm phòng khả dụng có gợi ý theo số phòng.",
          "Có thể tải file mẫu Excel, điền rồi nạp lại; kiểm tra số liệu trước khi bấm 'Lưu số liệu'.",
        ],
      },
      {
        id: "fin-3",
        stepNumber: 3,
        title: "Khóa sổ tháng",
        role: "Quản lý",
        screen: "/reports/monthly",
        action: "Bấm 'Khóa sổ' ở dòng cơ sở sau khi số liệu đã chính xác.",
        details: [
          "Khóa sổ chống chỉnh sửa; số liệu khóa mới được coi là chốt.",
        ],
        caution:
          "Sau khi khóa, Quản lý không tự mở lại được; chỉ Chủ chuỗi 'Mở khóa' kèm lý do bắt buộc.",
      },
      {
        id: "fin-4",
        stepNumber: 4,
        title: "Đọc báo cáo ADR / RevPAR",
        role: "Quản lý / Chủ chuỗi",
        screen: "/reports/monthly",
        action:
          "Bảng 12 tháng hiển thị lượt đến, đêm phòng bán, công suất, doanh thu phòng, ADR và RevPAR.",
        details: [
          "ADR = doanh thu phòng ÷ số đêm phòng đã bán.",
          "RevPAR = doanh thu phòng ÷ số đêm phòng khả dụng.",
          "Tháng chưa nhập hiển thị '—' (không phải bằng 0).",
        ],
      },
    ],
  },
  {
    id: "wf-admin-governance",
    code: "SOP-ADM-04",
    title: "Quy trình Khởi tạo Cơ sở & Phân quyền Quản trị Chuỗi",
    description:
      "Thiết lập hệ thống khi khai trương cơ sở mới hoặc nhận nhân sự mới. Chỉ Chủ chuỗi thực hiện.",
    primaryRole: "Chủ chuỗi (Owner)",
    nodes: [
      {
        id: "adm-1",
        stepNumber: 1,
        title: "Khởi tạo / cập nhật cơ sở",
        role: "Chủ chuỗi",
        screen: "/settings/branches",
        action: "Thêm hoặc sửa cơ sở bằng hộp thoại cơ sở.",
        details: [
          "Mã cơ sở (viết hoa, không dấu), tên, số điện thoại / hotline, địa chỉ.",
          "Giờ chuyển đêm (night cutoff) và giờ trả phòng mặc định của cơ sở.",
        ],
      },
      {
        id: "adm-2",
        stepNumber: 2,
        title: "Quản lý danh mục phòng",
        role: "Quản lý cơ sở & Chủ chuỗi",
        screen: "/settings/rooms",
        action: "Thêm mới, sửa thông tin phòng, ngừng/mở lại kinh doanh và xóa phòng.",
        details: [
          "Quản lý cơ sở: thêm phòng mới, sửa số phòng/tầng/loại phòng/giá, tạm ngừng kinh doanh và mở lại bán cho cơ sở mình.",
          "Chủ chuỗi: quản lý danh mục toàn bộ 8 cơ sở, có thêm quyền 'Xóa vĩnh viễn' các phòng trống chưa từng có lịch sử lưu trú.",
          "Phòng đang có khách (in_house) bị chặn không cho phép ngừng kinh doanh.",
        ],
      },
      {
        id: "adm-3",
        stepNumber: 3,
        title: "Bật / tắt module theo cơ sở",
        role: "Chủ chuỗi",
        screen: "/settings/modules",
        action:
          "Bật hoặc tắt từng phân hệ cho từng cơ sở: Đối tác, Voucher, Sinh nhật, Hồ sơ pháp lý, Khách tiềm năng…",
        details: [
          "Một số module phụ thuộc module khác (ví dụ Hợp đồng giá, Khách đoàn, Hoa hồng cần Đối tác).",
          "Module tắt thì menu và các thao tác ghi tại cơ sở đó bị khóa.",
          "Một số phân hệ chưa mở cho sử dụng: Quét QR CCCD, Phản hồi khách, Xuất khai báo lưu trú.",
        ],
      },
      {
        id: "adm-4",
        stepNumber: 4,
        title: "Cấu hình kênh nguồn khách",
        role: "Chủ chuỗi",
        screen: "/settings/sources",
        action: "Thêm kênh bán phòng: trực tiếp, OTA, đối tác, doanh nghiệp.",
        details: [
          "Bật 'Bắt buộc chọn đối tác' cho kênh đại lý / công ty để lễ tân luôn chọn đối tác khi check-in.",
        ],
      },
      {
        id: "adm-5",
        stepNumber: 5,
        title: "Tạo tài khoản & phân quyền",
        role: "Chủ chuỗi",
        screen: "/settings/users & /settings/roles",
        action:
          "Tạo tài khoản, gán vai trò theo từng cơ sở; điều chỉnh ma trận quyền khi cần.",
        details: [
          "Vai trò hiện có: Chủ chuỗi, Quản lý, Lễ tân, Sales, Kỹ thuật.",
          "Nhân viên chỉ thấy dữ liệu các cơ sở được gán.",
          "Quên mật khẩu: Chủ chuỗi đặt lại mật khẩu tại /settings/users; mỗi người tự đổi mật khẩu ở menu tài khoản góc phải.",
        ],
        caution:
          "Hệ thống chặn leo quyền: chỉ Chủ chuỗi được gán hoặc sửa vai trò Chủ chuỗi và quản trị.",
      },
    ],
  },
];
