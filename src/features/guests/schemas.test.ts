import { describe, expect, it } from "vitest";
import {
  addGuestNoteSchema,
  createGuestSchema,
  setGuestConsentSchema,
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

  describe("setGuestConsentSchema", () => {
    const validGuestId = "550e8400-e29b-41d4-a716-446655440000";

    it("hợp lệ khi cấp đồng ý kênh zalo có ghi chú và nguồn", () => {
      const result = setGuestConsentSchema.safeParse({
        guestId: validGuestId,
        channel: "zalo",
        granted: true,
        source: "front_desk",
        note: "Khách đồng ý khi làm thủ tục check-in tại quầy",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.channel).toBe("zalo");
        expect(result.data.granted).toBe(true);
      }
    });

    it("hợp lệ khi rút đồng ý (granted: false) kèm lý do", () => {
      const result = setGuestConsentSchema.safeParse({
        guestId: validGuestId,
        channel: "phone",
        granted: false,
        note: "Khách yêu cầu không gọi điện làm phiền trong giờ làm việc",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.granted).toBe(false);
        expect(result.data.source).toBe("front_desk");
      }
    });

    it("từ chối khi kênh liên lạc không hợp lệ", () => {
      const result = setGuestConsentSchema.safeParse({
        guestId: validGuestId,
        channel: "telegram",
        granted: true,
      });
      expect(result.success).toBe(false);
    });

    it("từ chối khi guestId không phải UUID", () => {
      const result = setGuestConsentSchema.safeParse({
        guestId: "12345",
        channel: "email",
        granted: true,
      });
      expect(result.success).toBe(false);
    });
  });
});
