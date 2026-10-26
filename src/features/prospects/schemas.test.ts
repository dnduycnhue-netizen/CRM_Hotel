import { describe, expect, it } from "vitest";
import {
  commitImportSchema,
  logInteractionSchema,
  MAX_IMPORT_ROWS,
  previewImportSchema,
  saveProspectSchema,
  setProspectStatusSchema,
} from "./schemas";

const valid = {
  company_name: "Công ty Du lịch Biển Xanh",
  kind: "tour_operator" as const,
  phone: "0909 123 456",
};

describe("saveProspectSchema", () => {
  it("chấp nhận tối thiểu tên công ty + SĐT", () => {
    expect(saveProspectSchema.safeParse(valid).success).toBe(true);
  });

  it("chấp nhận tên công ty + email (không có SĐT)", () => {
    const r = saveProspectSchema.safeParse({
      company_name: "ABC Travel",
      kind: "other",
      email: "booking@abc.vn",
    });
    expect(r.success).toBe(true);
  });

  it("bắt buộc có SĐT hoặc email để chống trùng", () => {
    const r = saveProspectSchema.safeParse({
      company_name: "ABC Travel",
      kind: "other",
    });
    expect(r.success).toBe(false);
  });

  it("từ chối SĐT quá ngắn sau khi chuẩn hóa", () => {
    const r = saveProspectSchema.safeParse({ ...valid, phone: "09-1" });
    expect(r.success).toBe(false);
  });

  it("chấp nhận SĐT dạng +84", () => {
    const r = saveProspectSchema.safeParse({ ...valid, phone: "+84909123456" });
    expect(r.success).toBe(true);
  });

  it("từ chối tên quá ngắn và email sai định dạng", () => {
    expect(
      saveProspectSchema.safeParse({ ...valid, company_name: "A" }).success,
    ).toBe(false);
    expect(
      saveProspectSchema.safeParse({ ...valid, email: "khong-hop-le" }).success,
    ).toBe(false);
  });

  it("từ chối loại hình không có trong danh sách", () => {
    expect(
      saveProspectSchema.safeParse({ ...valid, kind: "ota" }).success,
    ).toBe(false);
  });

  it("quy mô ước tính: chuỗi rỗng → null, số âm bị từ chối", () => {
    const ok = saveProspectSchema.parse({
      ...valid,
      estimated_groups_per_year: "",
      estimated_guests_per_year: "120",
    });
    expect(ok.estimated_groups_per_year).toBeNull();
    expect(ok.estimated_guests_per_year).toBe(120);
    expect(
      saveProspectSchema.safeParse({ ...valid, estimated_groups_per_year: -1 })
        .success,
    ).toBe(false);
  });

  it("độ ưu tiên mặc định là trung bình", () => {
    expect(saveProspectSchema.parse(valid).priority).toBe("medium");
  });
});

describe("logInteractionSchema", () => {
  const base = {
    prospect_id: "5c4b85cf-6715-48dc-9ced-c88e29f82c5e",
    channel: "call" as const,
    outcome: "interested" as const,
  };

  it("hợp lệ với ngày hẹn đúng định dạng", () => {
    expect(
      logInteractionSchema.safeParse({
        ...base,
        next_follow_up_at: "2026-11-02",
      }).success,
    ).toBe(true);
  });

  it("từ chối ngày hẹn sai định dạng và kênh lạ", () => {
    expect(
      logInteractionSchema.safeParse({
        ...base,
        next_follow_up_at: "02/11/2026",
      }).success,
    ).toBe(false);
    expect(
      logInteractionSchema.safeParse({ ...base, channel: "sms" }).success,
    ).toBe(false);
  });
});

describe("setProspectStatusSchema", () => {
  it("không cho đổi tay sang 'converted' (chỉ qua nút chuyển đổi)", () => {
    const r = setProspectStatusSchema.safeParse({
      id: "5c4b85cf-6715-48dc-9ced-c88e29f82c5e",
      status: "converted",
    });
    expect(r.success).toBe(false);
  });
});

describe("import schemas", () => {
  const row = (i: number) => ({
    row_id: String(i),
    company_name: `Công ty ${i}`,
    phone: "0909123456",
  });

  it(`giới hạn ${MAX_IMPORT_ROWS} dòng mỗi lần`, () => {
    const ok = Array.from({ length: MAX_IMPORT_ROWS }, (_, i) => row(i + 2));
    const tooMany = Array.from({ length: MAX_IMPORT_ROWS + 1 }, (_, i) =>
      row(i + 2),
    );
    expect(previewImportSchema.safeParse({ rows: ok }).success).toBe(true);
    expect(previewImportSchema.safeParse({ rows: tooMany }).success).toBe(
      false,
    );
    expect(previewImportSchema.safeParse({ rows: [] }).success).toBe(false);
  });

  it("commit yêu cầu có ít nhất một dòng và áp dụng cùng giới hạn", () => {
    expect(commitImportSchema.safeParse({ rows: [] }).success).toBe(false);
    expect(
      commitImportSchema.safeParse({ rows: [{ row: row(2) }] }).success,
    ).toBe(true);
  });
});
