import { describe, expect, it } from "vitest";
import {
  addGuestNoteSchema,
  createGuestSchema,
  updateGuestSchema,
} from "./schemas";

describe("Guests Schemas", () => {
  describe("createGuestSchema", () => {
    it("hợp lệ khi truyền họ tên và các giá trị mặc định", () => {
      const valid = createGuestSchema.safeParse({
        full_name: "Nguyễn Văn Test",
      });
      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.gender).toBe("other");
        expect(valid.data.nationality).toBe("VN");
        expect(valid.data.tags).toEqual([]);
      }
    });

    it("từ chối khi họ tên quá ngắn", () => {
      const result = createGuestSchema.safeParse({
        full_name: "A",
      });
      expect(result.success).toBe(false);
    });

    it("hỗ trợ đính kèm giấy tờ tùy thân hợp lệ", () => {
      const valid = createGuestSchema.safeParse({
        full_name: "Trần Thị B",
        document: {
          type: "cccd",
          number: "001200000001",
          country: "VN",
        },
      });
      expect(valid.success).toBe(true);
    });

    it("từ chối email sai định dạng", () => {
      const result = createGuestSchema.safeParse({
        full_name: "Trần Thị B",
        email: "email-sai-dinh-dang",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("addGuestNoteSchema", () => {
    const validGuestId = "550e8400-e29b-41d4-a716-446655440000";
    const validBranchId = "660e8400-e29b-41d4-a716-446655440000";

    it("hợp lệ khi có guest_id, branch_id hợp lệ và nội dung", () => {
      const result = addGuestNoteSchema.safeParse({
        guest_id: validGuestId,
        branch_id: validBranchId,
        body: "Khách thích phòng tầng cao, yên tĩnh",
        kind: "preference",
      });
      expect(result.success).toBe(true);
    });

    it("cho phép branch_id là null hoặc không truyền (Owner note toàn chuỗi)", () => {
      const result = addGuestNoteSchema.safeParse({
        guest_id: validGuestId,
        branch_id: null,
        body: "Ghi chú cấp chuỗi từ Owner",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.kind).toBe("general");
      }
    });

    it("từ chối khi nội dung ghi chú để trống", () => {
      const result = addGuestNoteSchema.safeParse({
        guest_id: validGuestId,
        body: "",
      });
      expect(result.success).toBe(false);
    });

    it("từ chối khi guest_id không phải uuid", () => {
      const result = addGuestNoteSchema.safeParse({
        guest_id: "not-a-uuid",
        body: "Nội dung hợp lệ",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateGuestSchema", () => {
    it("cho phép cập nhật từng phần thông tin khách", () => {
      const result = updateGuestSchema.safeParse({
        full_name: "Nguyễn Văn Cập Nhật",
        gender: "female",
        phone: "0901234567",
      });
      expect(result.success).toBe(true);
    });
  });
});
