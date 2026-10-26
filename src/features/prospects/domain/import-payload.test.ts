import { describe, expect, it } from "vitest";
import { buildImportSavePayload } from "./import-payload";

const row = {
  company_name: "Công ty ABC",
  kind: "tour_operator",
  phone: "0909123456",
  note: "Ghi chú gốc\nSĐT khác: 02373268368",
  source: "https://nguon.vn/a",
};

describe("buildImportSavePayload", () => {
  it("bật 'để trống': có key assigned_to = null tường minh", () => {
    const payload = buildImportSavePayload(row, true);
    expect("assigned_to" in payload).toBe(true);
    expect(payload.assigned_to).toBeNull();
  });

  it("tắt 'để trống': KHÔNG có key assigned_to (mặc định gán người import)", () => {
    const payload = buildImportSavePayload(row, false);
    expect("assigned_to" in payload).toBe(false);
  });

  it("luôn giữ note (kể cả dòng 'SĐT khác') và nguồn", () => {
    for (const leave of [true, false]) {
      const payload = buildImportSavePayload(row, leave);
      expect(payload.note).toBe("Ghi chú gốc\nSĐT khác: 02373268368");
      expect(payload.source).toBe("https://nguon.vn/a");
      expect(payload.phone).toBe("0909123456");
    }
  });

  it("chuỗi rỗng chuyển thành null, loại hình mặc định 'other'", () => {
    const payload = buildImportSavePayload(
      { company_name: "X Y", phone: "  ", email: "" },
      false,
    );
    expect(payload).toMatchObject({
      kind: "other",
      phone: null,
      email: null,
      note: null,
    });
  });
});
