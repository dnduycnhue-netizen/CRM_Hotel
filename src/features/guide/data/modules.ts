import type { ModuleGuide } from "../types";

// Hướng dẫn theo phân hệ. Nhãn nút trong ngoặc đơn '...' khớp đúng chữ trên giao diện.

export const MODULE_GUIDES: ModuleGuide[] = [
  {
    id: "mod-checkin-stays",
    title: "Lễ tân & Lưu trú",
    route: "/check-in & /stays",
    iconName: "UserCheck",
    summary:
      "Vận hành hằng ngày của quầy: tra cứu khách, nhận phòng, theo dõi khách đang ở, trả phòng và hủy lượt.",
    rolesInvolved: ["Lễ tân", "Quản lý", "Chủ chuỗi"],
    features: [
      {
        name: "Check-in (/check-in)",
        description:
          "Biểu mẫu một trang: tra cứu khách quen, chọn phòng theo tầng, kênh nguồn, người đi cùng và đồng ý nhận tin.",
        howTo: [
          "1. Nhập SĐT, CCCD 12 số hoặc Passport vào ô tra cứu: hệ thống tự điền hồ sơ khách cũ (khung 'Hồ sơ khách 360' bên phải).",
          "2. Khách mới: nhập họ tên, giới tính, ngày sinh, SĐT, loại và số giấy tờ.",
          "3. Chọn phòng 'Sẵn sàng đón khách' trên lưới theo tầng (hoặc dùng danh sách thả xuống).",
          "4. Chọn kênh nguồn; kênh đại lý / công ty bắt buộc chọn đối tác. Chỉnh giờ dự kiến trả phòng; nhập giá phòng và tiền cọc nếu có.",
          "5. 'Thêm người đi cùng' nếu phòng có từ 2 khách (tối đa 10 người).",
          "6. Hỏi khách có đồng ý nhận tin tiếp thị không (tự nguyện, mặc định không tích).",
          "7. Bấm 'Hoàn Tất Check-in' hoặc phím Enter.",
        ],
        tips: "Biểu mẫu tự lưu nháp trong trình duyệt theo từng cơ sở: mất mạng hoặc lỡ tải lại trang vẫn giữ được dữ liệu. Công tắc 'Nhập bù' (Quản lý) cho phép nhập lượt ở trong quá khứ với giờ vào / ra thực tế.",
      },
      {
        name: "Khách đang ở (/stays)",
        description:
          "Danh sách lượt ở tại cơ sở đang chọn kèm ba thẻ thống kê: Phòng có khách, Tổng số khách, Quá hạn trả phòng.",
        howTo: [
          "Lọc nhanh bằng ô 'Lọc số phòng, tên khách…', bộ lọc trạng thái (Đang ở, Quá hạn trả, Đã trả phòng, Đã hủy) và bộ lọc ngày (ví dụ 'Trả phòng hôm nay').",
          "'Trả phòng': kiểm tra giờ thực tế rồi xác nhận.",
          "Biểu tượng hủy: nhập lý do tối thiểu 5 ký tự. Lễ tân hủy được trong 6 giờ đầu; quá 6 giờ chỉ Quản lý / Chủ chuỗi (hộp thoại hiện 'Cảnh báo hủy trễ').",
          "'Khách trong phòng' (biểu tượng số người): thêm / xóa người đi cùng, bật tắt 'Tích lũy hạng' cho từng người.",
        ],
        tips: "Dòng 'Quá hạn trả' (chữ đỏ) là khách đã quá giờ dự kiến trả; liên hệ khách hoặc gia hạn trước khi trả phòng.",
      },
    ],
    faq: [
      {
        q: "Khách nước ngoài không có CCCD thì nhập thế nào?",
        a: "Chọn loại giấy tờ 'Passport', nhập số hộ chiếu và quốc tịch tương ứng.",
      },
      {
        q: "Làm sao đổi phòng cho khách đang ở?",
        a: "Hệ thống chưa có chức năng đổi phòng riêng. Trả phòng cũ, check-in phòng mới cho cùng khách và ghi chú 'Đổi phòng' ở hồ sơ khách.",
      },
      {
        q: "Tôi bấm hủy nhưng nút bị khóa?",
        a: "Lượt ở đã quá 6 giờ kể từ lúc nhận phòng. Nhờ Quản lý hoặc Chủ chuỗi hủy (cần quyền hủy trễ).",
      },
      {
        q: "Lượt đã hủy có tính vào hạng thành viên không?",
        a: "Không. Lượt hủy không tính vào số lượt ở, số đêm hay hạng của khách.",
      },
    ],
  },
  {
    id: "mod-guests",
    title: "Hồ sơ khách 360 & Tra cứu",
    route: "/guests, /guests/[id] & /search",
    iconName: "Users",
    summary:
      "Cơ sở dữ liệu khách toàn chuỗi: lịch sử lưu trú, hạng thành viên, ghi chú chăm sóc, người đi cùng, cờ cảnh báo và đồng ý nhận tin. Dữ liệu cá nhân được che theo quyền.",
    rolesInvolved: ["Sales", "Lễ tân", "Quản lý", "Chủ chuỗi"],
    features: [
      {
        name: "Danh sách khách (/guests)",
        description:
          "Tìm và lọc hồ sơ khách toàn chuỗi; SĐT / CCCD luôn che trừ khách do chính bạn phụ trách.",
        howTo: [
          "Gõ tên hoặc SĐT vào ô lọc nhanh; lọc thêm theo 'Đồng ý nhận tin', 'Sales' và 'Nhóm khách'.",
          "Bấm 'Hồ sơ 360°' để mở chi tiết.",
          "'Thêm khách tiềm năng' tạo một khách CÁ NHÂN (khác với công ty ở /prospects).",
          "'Xuất Excel' (Quản lý, Chủ chuỗi): CCCD được che; tối đa 500 dòng / lần (Chủ chuỗi 5.000 dòng).",
        ],
        tips: "Dòng ghi 'Lead của bạn' là khách bạn phụ trách nên thấy SĐT đầy đủ; khách của người khác hiện 090****212.",
      },
      {
        name: "Hồ sơ 360 (/guests/[id])",
        description:
          "Sáu tab: Lịch sử lưu trú, Lịch sử hạng, Ghi chú & CSKH, Người đi cùng, Cờ cảnh báo, Đồng ý nhận tin.",
        howTo: [
          "Tab 'Ghi chú & CSKH': thêm ghi chú theo loại (Chung, Sở thích, Dị ứng / Y tế, Phản ánh / Khiếu nại, Sự cố tài sản).",
          "Gắn thẻ phân nhóm (VIP, khách đoàn…) và chọn Sales phụ trách (Quản lý / Chủ chuỗi).",
          "Tab 'Cờ cảnh báo': 'Đề xuất gắn cờ' (lý do tối thiểu 10 ký tự); Chủ chuỗi duyệt tại /approvals.",
          "'Đề xuất gộp hồ sơ' khi khách bị tạo trùng.",
          "'Gán hạng thủ công' (Quản lý / Chủ chuỗi): bắt buộc lý do tối thiểu 10 ký tự, được ghi vào lịch sử hạng.",
        ],
      },
      {
        name: "Tra cứu nhanh (Ctrl / Cmd + K, hoặc /search)",
        description:
          "Tìm khách toàn chuỗi 8 cơ sở từ bất kỳ màn hình nào bằng tên, SĐT, CCCD, email (tối thiểu 2 ký tự).",
        howTo: [
          "Bấm vào ô tìm kiếm đầu trang hoặc phím Ctrl / Cmd + K.",
          "Dùng phím mũi tên và Enter để mở hồ sơ.",
        ],
        tips: "Từ khóa tìm kiếm (có thể là SĐT / CCCD) được gửi qua thao tác bảo mật, không xuất hiện trên đường dẫn.",
      },
    ],
    faq: [
      {
        q: "Hạng thành viên của khách được tính như thế nào?",
        a: "Tự động từ các lượt ở thực tế (không nhập tay) theo chính sách đang hiệu lực ở /settings/loyalty: cửa sổ tích lũy 24 tháng, không tính lượt đang ở và lượt đã hủy.",
      },
      {
        q: "'Khách tiềm năng' ở /guests và /prospects khác nhau thế nào?",
        a: "/guests là khách cá nhân của khách sạn. /prospects là công ty tour, đại lý, doanh nghiệp chưa hợp tác (B2B).",
      },
      {
        q: "Vì sao tôi thấy SĐT dạng 090****232?",
        a: "Theo Nghị định 13, SĐT / CCCD chỉ hiển thị đầy đủ cho người phụ trách khách đó, quản lý hoặc chủ chuỗi.",
      },
    ],
  },
  {
    id: "mod-prospects",
    title: "Khách hàng tiềm năng B2B",
    route: "/prospects",
    iconName: "Target",
    summary:
      "Kho công ty tour, đại lý, doanh nghiệp chưa hợp tác. Mỗi công ty chỉ có một sales phụ trách; khi đồng ý hợp tác thì chuyển thành Đối tác bằng một nút.",
    rolesInvolved: ["Sales", "Quản lý", "Chủ chuỗi"],
    features: [
      {
        name: "Thêm mới & chống trùng",
        description:
          "Mọi SĐT, MST, tên công ty, website được chuẩn hóa rồi so với cả khách tiềm năng và đối tác đã có.",
        howTo: [
          "'Thêm khách tiềm năng': nhập tên công ty và ít nhất SĐT hoặc email.",
          "Trùng mã số thuế / SĐT: bị chặn, kèm liên kết tới bản ghi đã có.",
          "Nghi trùng (tên + tỉnh, hoặc cùng website riêng): chọn 'Mở bản ghi & chăm sóc tiếp', 'Gộp vào bản này' hoặc 'Vẫn tạo mới' (bắt buộc ghi lý do).",
          "Trang Facebook, TikTok, Google… không bị coi là 'cùng website'.",
        ],
        tips: "Khi gõ SĐT / MST, khung cảnh báo trùng hiện ngay trong lúc điền, trước khi bấm lưu.",
      },
      {
        name: "Nhận chăm sóc & nhật ký liên hệ",
        description:
          "Dòng 'Chưa gán' có nút 'Nhận chăm sóc'. Người phụ trách ghi nhật ký và đẩy khách đi qua pipeline.",
        howTo: [
          "Bấm 'Nhận chăm sóc' ở danh sách hoặc trong hồ sơ; người nhận sau bị chặn kèm tên người đã nhận.",
          "'Ghi nhận lần liên hệ': hình thức (Gọi điện, Zalo, Email, Gặp trực tiếp, Gửi báo giá, Khác), kết quả, ghi chú, ngày hẹn tiếp.",
          "'Đổi trạng thái': Mới tìm được → Đã liên hệ → Đang chăm sóc → Đang đàm phán. Hai trạng thái cuối bắt buộc ngày hẹn.",
          "Kết thúc: 'Không tiềm năng' (bắt buộc lý do) hoặc 'Trùng lặp' (chọn bản ghi gốc).",
        ],
        tips: "Các thẻ đầu trang lọc nhanh theo giai đoạn; thẻ 'Quá hạn chăm sóc' hiển thị công ty đã qua ngày hẹn mà chưa có liên hệ mới.",
      },
      {
        name: "Chuyển thành đối tác",
        description:
          "Tạo hồ sơ Đối tác từ dữ liệu đã thu thập, không cần quản lý duyệt; hồ sơ tiềm năng bị khóa và có liên kết sang đối tác.",
        howTo: [
          "Bấm 'Chuyển thành đối tác' (hoặc 'Chuyển đối tác' ở dòng danh sách) rồi xác nhận.",
          "Nếu đối tác đã tồn tại (trùng MST / SĐT / tên) hệ thống dừng và dẫn tới đối tác đó.",
          "Tiếp tục hợp đồng giá, đoàn và hoa hồng tại /partners.",
        ],
      },
      {
        name: "Dành cho Quản lý / Chủ chuỗi",
        description:
          "Phân phối khách tiềm năng, nhập hàng loạt và dọn dữ liệu.",
        howTo: [
          "Khi tạo: chọn người phụ trách hoặc 'Không gán — để sales tự nhận sau'.",
          "'Chuyển phụ trách' trong hồ sơ, kể cả chọn 'Không gán'.",
          "Bộ lọc 'Chưa gán'; chọn nhiều dòng (có thể 'Chọn tất cả … dòng đang lọc') rồi 'Bỏ gán các dòng đã chọn'.",
          "'Nhập Excel/CSV' (tối đa 500 dòng): xem trước Mới / Nghi trùng / Trùng cứng rồi chỉ ghi dòng đã tick; có file mẫu để tải; checkbox 'Để trống người phụ trách' cho cả lô.",
          "Mục 'Chờ xử lý trùng': dòng được tạo dù nghi trùng, mở hồ sơ để 'Đã xem xét, không trùng' hoặc đánh dấu 'Trùng lặp'.",
        ],
      },
    ],
    faq: [
      {
        q: "Vì sao tôi không sửa được khách tiềm năng này?",
        a: "Chỉ người phụ trách và quản lý được sửa, ghi liên hệ hoặc chuyển đổi. Dòng 'Chưa gán' cần bấm 'Nhận chăm sóc' trước.",
      },
      {
        q: "Tôi thấy SĐT dạng 090****232, làm sao gọi được?",
        a: "Công ty đó do sales khác phụ trách. Hãy hỏi người phụ trách (tên hiện ở cột 'Phụ trách') trước khi liên hệ.",
      },
      {
        q: "File Excel của tôi thiếu cột nào cũng được?",
        a: "Bắt buộc có cột tên công ty; mỗi dòng cần SĐT hoặc email. Các cột nhận diện: Tên công ty / ten_to_chuc, Loại hình, SĐT, Email, Địa chỉ, Tỉnh/Vùng, Website, Nguồn, Ghi chú. Ô SĐT có nhiều số ngăn cách bằng '/' sẽ lấy di động đầu tiên làm số chính, các số còn lại ghi vào ghi chú.",
      },
    ],
  },
  {
    id: "mod-partners",
    title: "Đối tác, Khách đoàn & Hoa hồng",
    route: "/partners",
    iconName: "Handshake",
    summary:
      "Quản lý công ty lữ hành / OTA đã hợp tác, hợp đồng giá bán buôn, điều phối khách đoàn và chi trả hoa hồng.",
    rolesInvolved: ["Sales", "Quản lý", "Chủ chuỗi"],
    features: [
      {
        name: "Đối tác & Hợp đồng giá",
        description: "Hai tab đầu: 'Đối tác & OTA' và 'Hợp đồng giá'.",
        howTo: [
          "'Thêm đối tác': loại hình, MST, người liên hệ, SĐT, địa chỉ, hạn mức và điều khoản công nợ.",
          "'Ký hợp đồng B2B': số hợp đồng, thời hạn, % chiết khấu, % hoa hồng, điều khoản thanh toán.",
          "Tab hiển thị số hợp đồng đang hiệu lực và số đoàn của từng đối tác.",
        ],
      },
      {
        name: "Khách đoàn",
        description:
          "Tab 'Khách đoàn' liệt kê đoàn của mọi cơ sở bạn có quyền xem.",
        howTo: [
          "'Tạo đoàn mới': cơ sở, đối tác, tên đoàn, trưởng đoàn, giờ nhận / trả, số phòng, số khách, dự toán, đặt cọc.",
          "Trạng thái: Báo giá / Dự thảo, Đã xác nhận, Đang lưu trú, Đã hoàn thành, Đã hủy.",
          "Sales chỉ sửa đoàn do mình tạo ('Cập nhật'); đoàn của người khác chỉ mở 'Chi tiết' để xem.",
        ],
        tips: "Thẻ đầu trang cho biết số phòng khách đoàn đang chiếm dụng toàn chuỗi (hoặc tại cơ sở nếu bạn chỉ thuộc một cơ sở).",
      },
      {
        name: "Bảng kê hoa hồng",
        description:
          "Hoa hồng tự sinh khi đoàn có đối tác và dự toán lớn hơn 0.",
        howTo: [
          "Tỷ lệ theo hợp đồng đang hiệu lực của đối tác; không có hợp đồng thì 10%.",
          "Quản lý / Chủ chuỗi: 'Duyệt' → 'Đã duyệt (chờ chi)' → 'Chi trả'; hoặc 'Hủy'.",
          "Sales chỉ xem, không có cột thao tác.",
        ],
        tips: "Chỉ bấm 'Chi trả' sau khi đã chuyển khoản thật: hệ thống ghi người chi và thời điểm chi.",
      },
    ],
    faq: [
      {
        q: "Vì sao dòng hoa hồng của tôi vẫn 'Chờ phê duyệt'?",
        a: "Duyệt hoa hồng là việc của Quản lý hoặc Chủ chuỗi. Sales không có nút duyệt.",
      },
      {
        q: "Sửa dự toán đoàn thì hoa hồng có đổi không?",
        a: "Có, nếu dòng hoa hồng còn 'Chờ phê duyệt'. Dòng đã duyệt hoặc đã chi không đổi.",
      },
    ],
  },
  {
    id: "mod-rewards",
    title: "Sinh nhật & Voucher",
    route: "/rewards",
    iconName: "Gift",
    summary:
      "Chăm sóc khách vào dịp sinh nhật, phát hành voucher và đổi mã tại quầy.",
    rolesInvolved: ["Sales", "Lễ tân", "Quản lý", "Chủ chuỗi"],
    features: [
      {
        name: "Sinh nhật khách hàng",
        description:
          "Danh sách khách sắp đến sinh nhật; thẻ màu hồng là sinh nhật hôm nay.",
        howTo: [
          "Chọn khoảng: Hôm nay, 7, 14, 30, 60 ngày tới; gõ tên hoặc SĐT để lọc.",
          "'Gửi lời chúc & Tặng voucher': chọn cơ sở, hình thức (Gọi điện, SMS, Zalo, Email, Chúc trực tiếp, Gửi quà), quà tặng, voucher sinh nhật.",
          "SMS / Zalo / Email bị khóa '(Khóa theo NĐ 13)' khi khách chưa đồng ý nhận tin.",
          "Voucher sinh nhật: riêng cho khách đó, giảm 15% mặc định (chỉnh được), tối đa 500.000đ, hiệu lực 60 ngày, dùng 1 lần.",
        ],
      },
      {
        name: "Mã ưu đãi / Voucher",
        description:
          "Danh sách voucher kèm trạng thái, lượt dùng và phạm vi áp dụng.",
        howTo: [
          "'Phát hành Voucher' (Sales, Quản lý): mã (tối thiểu 3 ký tự), loại giảm % hoặc số tiền, hạn dùng, số lượt, hóa đơn tối thiểu, mức giảm tối đa, cơ sở áp dụng, khách mục tiêu.",
          "Biểu tượng sao chép để lấy mã gửi khách; cột 'Phạm vi áp dụng' cho biết voucher công khai hay riêng một khách.",
          "Voucher hết hạn, hết lượt hoặc không còn hiệu lực thì nút 'Đổi mã' bị vô hiệu.",
        ],
      },
      {
        name: "Đổi mã tại quầy",
        description:
          "Lễ tân, Quản lý, Chủ chuỗi áp dụng voucher cho khách khi thanh toán.",
        howTo: [
          "Bấm 'Áp dụng Voucher' (hoặc 'Đổi mã' trên dòng voucher: ô mã được điền sẵn).",
          "Nhập mã, chọn khách, cơ sở (mặc định là cơ sở đang làm việc) và giá trị hóa đơn.",
          "Kết quả hiện mã voucher, số tiền giảm trừ và số tiền cần thanh toán; hộp thoại không tự đóng, bấm 'Hoàn tất & Đóng'.",
        ],
        tips: "Thông báo lỗi nói rõ nguyên nhân: mã không tồn tại, hết hạn, hết lượt, không áp dụng tại cơ sở này, voucher riêng của khách khác, hoặc hóa đơn chưa đạt mức tối thiểu.",
      },
    ],
    faq: [
      {
        q: "Vì sao tôi không chọn được SMS / Zalo để chúc khách?",
        a: "Khách chưa đồng ý nhận tin tiếp thị (NĐ 13/2023). Hãy gọi điện hoặc chúc trực tiếp; đồng ý nhận tin được ghi lúc check-in hoặc ở tab 'Đồng ý nhận tin' của hồ sơ.",
      },
      {
        q: "Lễ tân có phát hành được voucher không?",
        a: "Không. Lễ tân chỉ đổi mã; phát hành do Sales, Quản lý hoặc Chủ chuỗi.",
      },
    ],
  },
  {
    id: "mod-loyalty",
    title: "Hạng thành viên & Giảm giá",
    route: "/settings/loyalty",
    iconName: "Award",
    summary:
      "Chính sách tích lũy và mức giảm giá theo hạng, cấu hình theo mùa hoặc theo năm. Hạng của khách luôn được tính tự động từ lượt ở thực tế.",
    rolesInvolved: ["Quản lý", "Chủ chuỗi", "Lễ tân & Sales (chỉ xem)"],
    features: [
      {
        name: "Chính sách hạng",
        description:
          "Mỗi chính sách có ngày hiệu lực, cơ sở tính (số đêm hoặc số lượt), cửa sổ tích lũy và bảng hạng.",
        howTo: [
          "Bộ lọc: Tất cả, Đang hiệu lực, Bản nháp, Lưu trữ.",
          "Chọn một chính sách ở cột trái để xem quy tắc và bảng hạng bên phải.",
          "'Nhân bản mùa mới': tạo bản nháp từ chính sách hiện có; chỉnh bản nháp (quy tắc, ngưỡng và % giảm của từng hạng) rồi 'Kích hoạt'.",
          "Chính sách đang hiệu lực không cho sửa ngưỡng để bảo toàn lịch sử tích lũy.",
        ],
        tips: "Hạng mặc định: Thành viên (0 đêm, 0%) · Đồng (từ 2 đêm, 3%) · Bạc (từ 5 đêm, 5%) · Vàng (từ 10 đêm, 10%); cửa sổ 24 tháng gần nhất; lượt đang ở chưa tính.",
      },
    ],
    faq: [
      {
        q: "Người đi cùng có được tính lượt không?",
        a: "Theo mặc định của chính sách (hiện là có tích lũy). Nhân viên có thể bật / tắt từng người ở 'Khách trong phòng' hoặc khi check-in.",
      },
      {
        q: "Ai sửa được chính sách hạng?",
        a: "Quản lý và Chủ chuỗi. Lễ tân và Sales chỉ xem để tư vấn khách.",
      },
    ],
  },
  {
    id: "mod-facilities",
    title: "Cơ sở vật chất & Bảo trì",
    route: "/facilities/*",
    iconName: "Wrench",
    summary:
      "Sự cố và sửa chữa có SLA, khóa phòng ngừng bán, danh mục tài sản, bảo trì định kỳ, kiểm tra phòng và hồ sơ pháp lý.",
    rolesInvolved: ["Kỹ thuật", "Quản lý", "Lễ tân", "Chủ chuỗi"],
    features: [
      {
        name: "Phiếu sự cố / Sửa chữa (/facilities/work-orders)",
        description:
          "Vòng đời: Mới tạo → Đang xử lý (có thể Chờ vật tư) → Chờ nghiệm thu → Đã đóng.",
        howTo: [
          "Tạo phiếu ở /facilities/report hoặc nút 'Báo sự cố mới'; tick 'Khóa phòng ngừng bán' nếu phòng không thể bán.",
          "Kỹ thuật bấm 'Bắt đầu' → 'Hoàn thành' (ghi kết quả, chi phí vật tư / nhân công).",
          "Quản lý bấm 'Nghiệm thu': phiếu đóng và phòng khóa gắn phiếu được mở lại.",
          "SLA: Khẩn cấp 4 giờ · Cao 24 giờ · Bình thường 72 giờ · Thấp 7 ngày; quá hạn hiện chữ đỏ.",
        ],
      },
      {
        name: "Khóa phòng ngừng bán (/facilities/room-blocks)",
        description: "Phòng bị khóa không chọn được ở màn hình check-in.",
        howTo: [
          "'Khóa phòng thủ công': chọn phòng, nhập lý do (và ngày dự kiến mở lại nếu có).",
          "Mở khóa trên dòng khi xong; khóa sinh ra từ phiếu sự cố tự mở khi phiếu được nghiệm thu.",
        ],
      },
      {
        name: "Tài sản, Bảo trì & Kiểm tra",
        description:
          "Danh mục tài sản, kế hoạch bảo trì theo chu kỳ và biên bản kiểm tra phòng bằng checklist.",
        howTo: [
          "/facilities/assets: tra cứu và cập nhật tình trạng thiết bị.",
          "/facilities/maintenance → 'Tạo kế hoạch bảo trì', 'Tạo phiếu ngay' khi cần; xem 'Đến hạn trong N ngày'.",
          "'+ Thực hiện kiểm tra phòng': chọn mẫu checklist, đánh dấu từng hạng mục, lưu biên bản (xem ở 'Lịch sử kiểm tra').",
          "Mẫu checklist do Quản lý / Chủ chuỗi tạo tại /settings/checklists.",
        ],
      },
      {
        name: "Hồ sơ pháp lý & Cảnh báo hết hạn",
        description:
          "Ma trận hồ sơ theo cơ sở: đăng ký kinh doanh, đủ điều kiện ANTT, PCCC, bảo hiểm cháy nổ, công nhận hạng sao, hợp đồng thuê mặt bằng…",
        howTo: [
          "'Thêm hồ sơ pháp lý' (Quản lý / Chủ chuỗi): số hiệu, ngày hết hạn, tệp đính kèm.",
          "Mỗi loại hồ sơ có mốc báo trước 30 / 60 / 90 ngày; ô trống 'Bổ sung' là hồ sơ còn thiếu.",
          "/facilities/alerts liệt kê hồ sơ đã hết hạn và sắp hết hạn để xử lý.",
        ],
      },
    ],
    faq: [
      {
        q: "Phòng đã sửa xong nhưng vẫn khóa?",
        a: "Nếu khóa gắn với phiếu sự cố, cần Quản lý 'Nghiệm thu' phiếu; khóa thủ công thì mở khóa tại /facilities/room-blocks.",
      },
      {
        q: "Kỹ thuật có tự đóng phiếu được không?",
        a: "Không. Kỹ thuật bấm 'Hoàn thành'; việc 'Nghiệm thu' thuộc Quản lý / Chủ chuỗi.",
      },
    ],
  },
  {
    id: "mod-reports",
    title: "Báo cáo & Doanh thu",
    route: "/reports, /reports/monthly & /reports/facilities",
    iconName: "BarChart3",
    summary:
      "Đo công suất, khách quen, thời gian lưu trú bình quân, doanh thu, ADR, RevPAR và chi phí kỹ thuật; so sánh với cùng kỳ năm trước.",
    rolesInvolved: ["Chủ chuỗi", "Quản lý"],
    features: [
      {
        name: "Báo cáo điều hành (/reports)",
        description:
          "Ba tab: Tổng quan KPI, Doanh thu 12 tháng, CSVC & Kỹ thuật.",
        howTo: [
          "Chọn khoảng: 7 ngày qua, 30 ngày qua, Tháng này (hoặc khoảng ngày tùy chỉnh) và chuyển chế độ xem 'Tổng quan chuỗi / Theo cơ sở / Kênh & Quốc tịch'.",
          "Bốn thẻ KPI: Công suất phòng, Đêm phòng đã bán, Tỷ lệ khách quen quay lại, Thời gian ở bình quân (ALOS) kèm tỷ lệ hủy phòng.",
          "'Xuất báo cáo' tải báo cáo của khoảng đang xem.",
        ],
      },
      {
        name: "Doanh thu & Cùng kỳ (/reports/monthly)",
        description:
          "Bảng 12 tháng: lượt đến, đêm phòng bán, công suất, doanh thu phòng, ADR, RevPAR.",
        howTo: [
          "'Nhập số liệu tháng' (Quản lý): nhập từng cơ sở rồi 'Lưu số liệu'; có thể dùng file mẫu Excel.",
          "'Khóa sổ' từng cơ sở sau khi chốt; chỉ Chủ chuỗi 'Mở khóa' (kèm lý do).",
          "Từ ngày 5 hằng tháng hiển thị banner nhắc chốt số liệu tháng trước.",
        ],
        tips: "Tháng chưa nhập hiển thị '—'. ADR = doanh thu phòng ÷ đêm đã bán; RevPAR = doanh thu phòng ÷ đêm khả dụng.",
      },
      {
        name: "Báo cáo CSVC & chi phí (/reports/facilities)",
        description:
          "Số sự cố, tỷ lệ đúng hạn SLA, thời gian khắc phục bình quân (MTTR) và chi phí theo loại thiết bị.",
        howTo: [
          "Xem thẻ chi phí bảo trì và tỷ lệ phòng ngừng bán.",
          "Đối chiếu bảng phân bổ chi phí theo loại thiết bị.",
        ],
      },
    ],
    faq: [
      {
        q: "Tại sao doanh thu / ADR / RevPAR hiển thị '—'?",
        a: "Chưa có số liệu doanh thu được nhập cho tháng đó. Quản lý nhập tại 'Nhập số liệu tháng'.",
      },
      {
        q: "Công suất thấp bất thường?",
        a: "Công suất = đêm phòng đã bán ÷ đêm khả dụng của cơ sở (đã trừ phòng khóa OOO). Kiểm tra bộ lọc cơ sở và khoảng ngày.",
      },
    ],
  },
  {
    id: "mod-approvals",
    title: "Trung tâm phê duyệt & Rủi ro",
    route: "/approvals",
    iconName: "CheckSquare",
    summary:
      "Cửa kiểm soát tập trung của Chủ chuỗi: duyệt cờ Blacklist, gỡ cờ và hợp nhất hồ sơ khách trùng.",
    rolesInvolved: ["Chủ chuỗi"],
    features: [
      {
        name: "Ba tab xử lý",
        description:
          "Đầu trang có ba thẻ đếm: Hồ sơ trùng cần gộp, Cờ Blacklist chờ duyệt, Cờ Blacklist đang hiệu lực.",
        howTo: [
          "'Gộp hồ sơ trùng lặp': so sánh hồ sơ giữ lại với hồ sơ bị gộp rồi phê duyệt hoặc từ chối.",
          "'Cờ Blacklist chờ duyệt': xem lý do và người đề xuất, phê duyệt hoặc từ chối.",
          "'Cờ Blacklist đang hiệu lực': gỡ cờ khi khách đã khắc phục (lý do tối thiểu 5 ký tự).",
        ],
      },
    ],
    faq: [
      {
        q: "Quản lý có duyệt được cờ không?",
        a: "Không. Quản lý chỉ đề xuất; nếu mở /approvals sẽ được chuyển về trang làm việc của mình kèm thông báo không đủ quyền.",
      },
      {
        q: "Sau khi gộp hồ sơ thì dữ liệu cũ có mất không?",
        a: "Không. Lượt ở, ghi chú, thẻ của hồ sơ bị gộp được chuyển sang hồ sơ giữ lại và ghi vào nhật ký. Nhưng không hoàn tác được.",
      },
    ],
  },
  {
    id: "mod-settings",
    title: "Cài đặt & Quản trị hệ thống",
    route: "/settings/* & /audit",
    iconName: "Settings",
    summary:
      "Cấu hình cơ sở, tài khoản, phân quyền, module, kênh nguồn và truy vết nhật ký. Hầu hết chỉ dành cho Chủ chuỗi.",
    rolesInvolved: [
      "Chủ chuỗi",
      "Quản lý (checklist, chính sách hạng, nhật ký cơ sở)",
    ],
    features: [
      {
        name: "Người dùng & Ma trận phân quyền",
        description:
          "Tạo tài khoản, gán vai trò theo từng cơ sở và điều chỉnh quyền chi tiết.",
        howTo: [
          "/settings/users → '+ Thêm Tài Khoản Nhân Sự Mới': email, mật khẩu khởi tạo, họ tên, vai trò và cơ sở.",
          "'Sửa & Cấp quyền' để đổi vai trò, đặt lại mật khẩu; 'Khóa tài khoản' khi nhân sự nghỉ việc.",
          "/settings/roles: bảng quyền theo vai trò; thay đổi chỉ có hiệu lực sau khi lưu.",
        ],
      },
      {
        name: "Cơ sở, Module & Kênh nguồn",
        description:
          "Thông tin cơ sở, bật tắt phân hệ theo cơ sở và danh mục kênh bán phòng.",
        howTo: [
          "/settings/branches: tên, hotline, địa chỉ, giờ chuyển đêm, giờ trả phòng mặc định.",
          "/settings/modules: mỗi phân hệ có ba trạng thái Tắt / Chỉ xem (readonly) / Bật cho từng cơ sở.",
          "/settings/sources: thêm kênh (trực tiếp, OTA, đối tác, doanh nghiệp) và bật 'Bắt buộc chọn đối tác'.",
        ],
      },
      {
        name: "Nhật ký thao tác (/audit)",
        description:
          "Mọi thêm / sửa / xóa và truy cập nhạy cảm được ghi lại kèm người thực hiện.",
        howTo: [
          "Lọc theo cơ sở, đối tượng, loại hành động; Quản lý chỉ thấy cơ sở của mình, Chủ chuỗi thấy toàn chuỗi.",
          "Bấm mũi tên đầu dòng để xem so sánh trước / sau.",
          "'Xuất Excel' để lưu nhật ký đang lọc.",
        ],
      },
      {
        name: "Tài khoản cá nhân",
        description: "Mọi nhân viên tự quản lý mật khẩu của mình.",
        howTo: [
          "Bấm avatar góc phải → 'Đổi mật khẩu' (cần nhập mật khẩu hiện tại).",
          "Đăng xuất ở cuối cùng menu avatar.",
        ],
      },
    ],
    faq: [
      {
        q: "Nhân viên quên mật khẩu thì làm thế nào?",
        a: "Chủ chuỗi vào /settings/users, bấm 'Sửa & Cấp quyền' của nhân viên và đặt lại mật khẩu.",
      },
      {
        q: "Vì sao menu của tôi thiếu một số mục?",
        a: "Menu chỉ hiện các màn hình bạn có quyền và phân hệ đang bật tại cơ sở. Cần thêm quyền, hãy nhờ Chủ chuỗi.",
      },
      {
        q: "Tôi mở một đường dẫn và bị đưa về trang chủ?",
        a: "Bạn không đủ quyền với màn hình đó; thông báo 'Bạn không có quyền truy cập trang này' sẽ hiện ở góc phải trên.",
      },
    ],
  },
];
