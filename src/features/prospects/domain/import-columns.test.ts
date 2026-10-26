import { describe, expect, it } from "vitest";
import {
  buildImportRow,
  parsePhoneCell,
  restoreLeadingZero,
  IMPORT_TEMPLATE_HEADERS,
  mapKindText,
  matchImportHeader,
} from "./import-columns";

describe("matchImportHeader", () => {
  it("nhận diện đủ các cột của file mẫu", () => {
    const fields = IMPORT_TEMPLATE_HEADERS.map(matchImportHeader);
    expect(fields).toEqual([
      "company_name",
      "kind",
      "phone",
      "email",
      "address",
      "province",
      "website",
      "source",
    ]);
  });

  it("bỏ qua cột lạ", () => {
    expect(matchImportHeader("Ghi chú nội bộ")).toBeNull();
    expect(matchImportHeader("")).toBeNull();
  });
});

describe("mapKindText", () => {
  it("map nhãn tiếng Việt sang mã chuẩn", () => {
    expect(mapKindText("Lữ hành")).toBe("tour_operator");
    expect(mapKindText("Đại lý du lịch")).toBe("travel_agency");
    expect(mapKindText("Doanh nghiệp")).toBe("corporate");
    expect(mapKindText("Trường học")).toBe("school");
    expect(mapKindText("Hành hương")).toBe("pilgrimage");
    expect(mapKindText("MICE")).toBe("mice");
    expect(mapKindText("???")).toBe("other");
    expect(mapKindText(null)).toBe("other");
  });
});

describe("buildImportRow", () => {
  it("dựng dòng theo bản đồ cột, trim và đưa trống về null", () => {
    const map = ["company_name", null, "phone", "email"] as const;
    const row = buildImportRow(
      ["  Công ty ABC ", "x", "0909 123 456", " ABC@Mail.com "],
      map,
    );
    expect(row.company_name).toBe("Công ty ABC");
    expect(row.phone).toBe("0909123456");
    expect(row.email).toBe("abc@mail.com");
    expect(row.website).toBeNull();
    expect(row.kind).toBe("other");
  });
});

describe("restoreLeadingZero", () => {
  it("khôi phục số 0 đầu bị Excel làm mất", () => {
    expect(restoreLeadingZero("909123456")).toBe("0909123456");
    expect(restoreLeadingZero("2563123456")).toBe("02563123456");
  });

  it("giữ nguyên số đã đúng hoặc không phải chuỗi chữ số thuần", () => {
    expect(restoreLeadingZero("0909123456")).toBe("0909123456");
    expect(restoreLeadingZero("+84909123456")).toBe("+84909123456");
    expect(restoreLeadingZero("0909 123 456")).toBe("0909 123 456");
    expect(restoreLeadingZero("84909123456")).toBe("84909123456");
    expect(restoreLeadingZero(null)).toBeNull();
  });
});

describe("header file leads thật (snake_case không dấu)", () => {
  it("map đủ 9 cột của file leads-mira", () => {
    const headers = [
      "ten_to_chuc",
      "phan_loai",
      "sdt",
      "email",
      "website",
      "dia_chi",
      "tinh_thanh",
      "ghi_chu",
      "nguon_url",
    ];
    expect(headers.map(matchImportHeader)).toEqual([
      "company_name",
      "kind",
      "phone",
      "email",
      "website",
      "address",
      "province",
      "note",
      "source",
    ]);
  });

  it("map giá trị phan_loai sang loại hình chuẩn", () => {
    expect(mapKindText("lua_hanh")).toBe("tour_operator");
    expect(mapKindText("teambuilding_mice")).toBe("mice");
    expect(mapKindText("hanh_huong")).toBe("pilgrimage");
    expect(mapKindText("tour_nho")).toBe("small_tour");
    expect(mapKindText("truong_hoc")).toBe("school");
    expect(mapKindText("doanh_nghiep")).toBe("corporate");
  });
});

describe("parsePhoneCell", () => {
  it("nhiều số: lấy di động đầu tiên làm chính, số còn lại vào others", () => {
    expect(parsePhoneCell("0973 615 595 / 0237 326 8368")).toEqual({
      primary: "0973615595",
      others: ["02373268368"],
    });
  });

  it("di động không phải số đầu thì vẫn được ưu tiên làm số chính", () => {
    expect(parsePhoneCell("0237 396 3274 / 0913 316 259")).toEqual({
      primary: "0913316259",
      others: ["02373963274"],
    });
  });

  it("không có di động: lấy số hợp lệ đầu tiên; đoạn cụt giữ nguyên văn", () => {
    expect(parsePhoneCell("(0237) 386 2013 / 386 2017")).toEqual({
      primary: "02373862013",
      others: ["386 2017"],
    });
  });

  it("ba số trong một ô", () => {
    expect(
      parsePhoneCell("0934 418 468 / 0912 137 896 / 0966 249 769"),
    ).toEqual({
      primary: "0934418468",
      others: ["0912137896", "0966249769"],
    });
  });

  it("chuẩn hóa +84 và các dạng có ngoặc/gạch", () => {
    expect(parsePhoneCell("+84-233-3662949").primary).toBe("02333662949");
    expect(parsePhoneCell("(+84)238 222 9999").primary).toBe("02382229999");
    expect(parsePhoneCell("+84929 638 286").primary).toBe("0929638286");
    expect(parsePhoneCell("0965.200.456").primary).toBe("0965200456");
  });

  it("ô rỗng hoặc không có số", () => {
    expect(parsePhoneCell("")).toEqual({ primary: null, others: [] });
    expect(parsePhoneCell(null)).toEqual({ primary: null, others: [] });
  });

  it("không lặp lại số chính trong others", () => {
    expect(parsePhoneCell("0909 123 456 / 090 912 3456")).toEqual({
      primary: "0909123456",
      others: [],
    });
  });
});

describe("quy tắc chọn số chính (10 số chỉ áp cho di động)", () => {
  it("máy bàn 10–11 số làm số chính khi không có di động", () => {
    expect(parsePhoneCell("0237 386 2013").primary).toBe("02373862013"); // 11 số
    expect(parsePhoneCell("(028) 3822 7788").primary).toBe("02838227788"); // 11 số
    expect(parsePhoneCell("0232 381 655").primary).toBe("0232381655"); // 10 số
  });

  it("tổng đài 8 số và mã vùng cũ 9 số vẫn được chấp nhận làm số chính", () => {
    expect(parsePhoneCell("1900 3398").primary).toBe("19003398");
    expect(parsePhoneCell("1800 6700 / (028) 73 081 888")).toEqual({
      primary: "18006700",
      others: ["02873081888"],
    });
    expect(parsePhoneCell("(054) 850164 – 850165")).toEqual({
      primary: "054850164",
      others: ["850165"],
    });
  });

  it("di động được ưu tiên hơn máy bàn đứng trước nó", () => {
    expect(parsePhoneCell("0237 396 3274 / 0913 316 259").primary).toBe(
      "0913316259",
    );
  });

  it("số không hợp lệ (quá ngắn / quá dài) không bao giờ làm số chính", () => {
    expect(parsePhoneCell("386 2017")).toEqual({
      primary: null,
      others: ["386 2017"],
    });
    expect(parsePhoneCell("0909 123 456 789 012").primary).toBeNull();
  });
});

describe("buildImportRow với dữ liệu leads thật", () => {
  const map = [
    "company_name",
    "kind",
    "phone",
    "email",
    "website",
    "address",
    "province",
    "note",
    "source",
  ] as const;

  it("nhiều SĐT: số chính vào phone, số khác nối vào cuối ghi chú", () => {
    const row = buildImportRow(
      [
        "Công Ty Du Lịch Quốc Tế Đại Đông Á",
        "lua_hanh",
        "0973 615 595 / 0237 326 8368",
        "daidongatravel@gmail.com",
        "",
        "Số 11 Cao Sơn, Thanh Hóa",
        "Thanh Hóa",
        "Tổ chức tour nội địa + quốc tế",
        "https://intour.vn/bai-viet.html",
      ],
      map,
    );
    expect(row.phone).toBe("0973615595");
    expect(row.kind).toBe("tour_operator");
    expect(row.note).toBe(
      "Tổ chức tour nội địa + quốc tế\nSĐT khác: 02373268368",
    );
    expect(row.source).toBe("https://intour.vn/bai-viet.html");
    expect(row.website).toBeNull();
  });

  it("không SĐT nhưng có email vẫn hợp lệ để import", () => {
    const row = buildImportRow(
      [
        "Trường THPT Đào Duy Từ",
        "truong_hoc",
        "",
        "thpt@quangbinh.edu.vn",
        "",
        "",
        "Quảng Bình",
        "",
        "",
      ],
      map,
    );
    expect(row.phone).toBeNull();
    expect(row.email).toBe("thpt@quangbinh.edu.vn");
    expect(row.kind).toBe("school");
    expect(row.note).toBeNull();
  });

  it("ghi chú trống nhưng có SĐT khác: ghi chú chỉ chứa dòng SĐT khác", () => {
    const row = buildImportRow(
      [
        "ABC",
        "lua_hanh",
        "0912 799 088 / 023 7888 8558",
        "",
        "",
        "",
        "",
        "",
        "",
      ],
      map,
    );
    expect(row.note).toBe("SĐT khác: 02378888558");
  });

  it("email không hợp lệ (bị che bởi trang nguồn) chuyển vào ghi chú", () => {
    const row = buildImportRow(
      [
        "Trung tâm hành hương",
        "hanh_huong",
        "02703 824 016",
        "[email protected]",
        "",
        "",
        "Bến Tre",
        "",
        "",
      ],
      map,
    );
    expect(row.email).toBeNull();
    expect(row.note).toBe("Email trong file không hợp lệ: [email protected]");
    expect(row.phone).toBe("02703824016");
  });
});
