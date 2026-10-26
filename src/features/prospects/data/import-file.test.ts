import ExcelJS from "exceljs";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { parseProspectImportFile } from "./import-file";

const HEADERS = [
  "Tên công ty",
  "Loại hình",
  "SĐT",
  "Email",
  "Địa chỉ",
  "Tỉnh/Vùng",
  "Website",
  "Nguồn",
];

function csvFile(text: string, name = "leads.csv"): File {
  return new File([`﻿${text}`], name, { type: "text/csv" });
}

describe("parseProspectImportFile", () => {
  it("đọc CSV UTF-8 có BOM, nhận diện cột tiếng Việt và map loại hình", async () => {
    const file = csvFile(
      [
        HEADERS.join(","),
        'Công ty Du lịch Biển Xanh,Lữ hành,0909 123 456,Booking@BienXanh.vn,"12 Lê Lợi, Quy Nhơn",Bình Định,https://bienxanh.vn,Hội chợ',
        ",,,,,,,",
        "Đại lý Sao Mai,Đại lý du lịch,+84911222333,,,Huế,,",
      ].join("\r\n"),
    );
    const res = await parseProspectImportFile(file);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.rows).toHaveLength(2);
    expect(res.rows[0]).toMatchObject({
      row_id: "2",
      company_name: "Công ty Du lịch Biển Xanh",
      kind: "tour_operator",
      phone: "0909123456",
      email: "booking@bienxanh.vn",
      address: "12 Lê Lợi, Quy Nhơn",
      province: "Bình Định",
      website: "https://bienxanh.vn",
      source: "Hội chợ",
    });
    expect(res.rows[1]).toMatchObject({
      row_id: "4",
      company_name: "Đại lý Sao Mai",
      kind: "travel_agency",
      phone: "0911222333",
      email: null,
    });
  });

  it("đọc CSV leads thật: header snake_case, BOM, nhiều SĐT, dòng chỉ có email", async () => {
    const file = csvFile(
      [
        "ten_to_chuc,phan_loai,sdt,email,website,dia_chi,tinh_thanh,ghi_chu,nguon_url",
        'Công Ty Du Lịch Đại Đông Á,lua_hanh,0973 615 595 / 0237 326 8368,daidong@gmail.com,,"Số 11 Cao Sơn, Thanh Hóa",Thanh Hóa,"Tour nội địa, cho thuê xe",https://intour.vn/a.html',
        "Trường THPT Đào Duy Từ,truong_hoc,,thpt_daoduytu@quangbinh.edu.vn,http://thpt.edu.vn,Đồng Hới,Quảng Bình,Liên hệ qua email,https://tripi.vn/b",
        "Trung tâm Đức Mẹ La Mã,hanh_huong,02703 824 016,[email protected],giaophanvinhlong.net,Bến Tre,Bến Tre,,https://giaophanvinhlong.net/x",
      ].join("\r\n"),
    );
    const res = await parseProspectImportFile(file);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.ignoredColumns).toEqual([]);
    expect(res.rows).toHaveLength(3);

    expect(res.rows[0]).toMatchObject({
      company_name: "Công Ty Du Lịch Đại Đông Á",
      kind: "tour_operator",
      phone: "0973615595",
      note: "Tour nội địa, cho thuê xe\nSĐT khác: 02373268368",
      source: "https://intour.vn/a.html",
      province: "Thanh Hóa",
    });
    // Không SĐT nhưng có email: vẫn đủ điều kiện (SĐT hoặc email)
    expect(res.rows[1]).toMatchObject({
      kind: "school",
      phone: null,
      email: "thpt_daoduytu@quangbinh.edu.vn",
    });
    // Email bị che: bỏ khỏi trường email, giữ trong ghi chú
    expect(res.rows[2]).toMatchObject({
      kind: "pilgrimage",
      phone: "02703824016",
      email: null,
      note: "Email trong file không hợp lệ: [email protected]",
    });
  });

  it("đọc file .xlsx và báo các cột bị bỏ qua", async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Leads");
    ws.addRow([...HEADERS, "Ghi chú nội bộ"]);
    ws.addRow([
      "Công ty ABC",
      "Doanh nghiệp",
      909123456,
      "abc@abc.vn",
      "",
      "Đà Nẵng",
      "",
      "Giới thiệu",
      "bỏ qua",
    ]);
    const buffer = Buffer.from(await wb.xlsx.writeBuffer());
    const res = await parseProspectImportFile(new File([buffer], "leads.xlsx"));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0]).toMatchObject({
      company_name: "Công ty ABC",
      kind: "corporate",
      phone: "0909123456",
      province: "Đà Nẵng",
    });
    expect(res.ignoredColumns).toEqual(["Ghi chú nội bộ"]);
  });

  it("từ chối file thiếu cột tên công ty", async () => {
    const res = await parseProspectImportFile(
      csvFile("SĐT,Email\r\n0909123456,a@b.vn"),
    );
    expect(res.ok).toBe(false);
  });

  it("từ chối định dạng lạ, file rỗng và file chỉ có tiêu đề", async () => {
    expect(
      (await parseProspectImportFile(new File(["x"], "leads.txt"))).ok,
    ).toBe(false);
    expect((await parseProspectImportFile(new File([], "a.csv"))).ok).toBe(
      false,
    );
    expect((await parseProspectImportFile(csvFile(HEADERS.join(",")))).ok).toBe(
      false,
    );
  });

  it("từ chối file quá 500 dòng", async () => {
    const lines = [HEADERS.join(",")];
    for (let i = 0; i < 501; i++) {
      lines.push(`Công ty ${i},Lữ hành,09${String(10000000 + i)},,,,,`);
    }
    const res = await parseProspectImportFile(csvFile(lines.join("\r\n")));
    expect(res.ok).toBe(false);
  });
});
