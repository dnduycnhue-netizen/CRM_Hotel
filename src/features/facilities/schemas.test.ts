import { describe, expect, it } from "vitest";
import {
  checklistTemplateSchema,
  createAssetSchema,
  createPmPlanSchema,
  reportIssueSchema,
  roomBlockSchema,
  submitInspectionSchema,
  transitionWorkOrderSchema,
  updateAssetStatusSchema,
  upsertComplianceDocSchema,
} from "./schemas";

describe("Facilities Schemas Validation", () => {
  const validBranchId = "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33";
  const validRoomId = "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44";
  const validOrderId = "e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55";

  describe("reportIssueSchema", () => {
    it("validates minimum 3 chars for title", () => {
      const invalid = reportIssueSchema.safeParse({
        branch_id: validBranchId,
        title: "ab",
      });
      expect(invalid.success).toBe(false);

      const valid = reportIssueSchema.safeParse({
        branch_id: validBranchId,
        title: "Hỏng vòi hoa sen",
        priority: "high",
        blocks_room: true,
      });
      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.priority).toBe("high");
        expect(valid.data.blocks_room).toBe(true);
      }
    });

    it("defaults kind to corrective and priority to normal", () => {
      const result = reportIssueSchema.safeParse({
        branch_id: validBranchId,
        title: "Điều hòa kêu to",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.kind).toBe("corrective");
        expect(result.data.priority).toBe("normal");
        expect(result.data.blocks_room).toBe(false);
      }
    });
  });

  describe("transitionWorkOrderSchema", () => {
    it("validates transition status and optional costs", () => {
      const result = transitionWorkOrderSchema.safeParse({
        id: validOrderId,
        to: "done",
        comment: "Đã thay ron cao su và vòi mới",
        patch: {
          labor_cost: 150000,
          parts_cost: 80000,
        },
      });
      expect(result.success).toBe(true);
    });

    it("rejects negative costs", () => {
      const result = transitionWorkOrderSchema.safeParse({
        id: validOrderId,
        to: "done",
        patch: {
          labor_cost: -50000,
        },
      });
      expect(result.success).toBe(false);
    });
  });

  describe("roomBlockSchema", () => {
    it("requires minimum 5 chars reason", () => {
      const invalid = roomBlockSchema.safeParse({
        room_id: validRoomId,
        reason: "sửa",
      });
      expect(invalid.success).toBe(false);

      const valid = roomBlockSchema.safeParse({
        room_id: validRoomId,
        reason: "Sửa chữa đường ống thoát sàn phòng tắm",
      });
      expect(valid.success).toBe(true);
    });
  });

  describe("createAssetSchema", () => {
    const validCatId = "f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66";

    it("validates asset code format and minimum name length", () => {
      const invalidCode = createAssetSchema.safeParse({
        branch_id: validBranchId,
        category_id: validCatId,
        code: "ac 01", // có dấu cách
        name: "Máy lạnh",
      });
      expect(invalidCode.success).toBe(false);

      const valid = createAssetSchema.safeParse({
        branch_id: validBranchId,
        category_id: validCatId,
        code: "AC-101-DAIKIN",
        name: "Máy lạnh Daikin 1.5HP",
        status: "in_use",
      });
      expect(valid.success).toBe(true);
    });
  });

  describe("updateAssetStatusSchema", () => {
    it("validates valid status transitions", () => {
      const valid = updateAssetStatusSchema.safeParse({
        id: validOrderId,
        branch_id: validBranchId,
        status: "under_repair",
        note: "Đang gửi hãng bảo hành",
      });
      expect(valid.success).toBe(true);
    });
  });

  describe("createPmPlanSchema", () => {
    it("chấp nhận kế hoạch bảo trì hợp lệ", () => {
      const valid = {
        branch_id: validBranchId,
        name: "Bảo dưỡng điều hòa trung tâm",
        interval_days: 60,
        lead_days: 7,
        checklist: ["Vệ sinh màng lọc", "Kiểm tra gas", "Đo dòng điện"],
        next_due_date: "2026-11-15",
      };
      expect(createPmPlanSchema.safeParse(valid).success).toBe(true);
    });

    it("từ chối khi tên quá ngắn hoặc chu kỳ <= 0", () => {
      expect(
        createPmPlanSchema.safeParse({
          branch_id: validBranchId,
          name: "AB",
          interval_days: 0,
          next_due_date: "2026-11-15",
        }).success,
      ).toBe(false);
    });
  });

  describe("checklistTemplateSchema", () => {
    it("chấp nhận mẫu kiểm tra với các tiêu chí", () => {
      const valid = {
        name: "Checklist Buồng phòng tiêu chuẩn",
        scope: "room",
        items: [
          { key: "bed", label: "Giường nệm phẳng, sạch sẽ", critical: false },
          {
            key: "ac",
            label: "Điều hòa mát, không kêu",
            critical: true,
            hint: "Bật 24 độ",
          },
        ],
        is_active: true,
      };
      expect(checklistTemplateSchema.safeParse(valid).success).toBe(true);
    });

    it("từ chối mẫu không có tiêu chí nào", () => {
      expect(
        checklistTemplateSchema.safeParse({
          name: "Mẫu rỗng",
          scope: "area",
          items: [],
        }).success,
      ).toBe(false);
    });
  });

  describe("submitInspectionSchema", () => {
    const validTemplateId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

    it("chấp nhận kết quả kiểm tra hợp lệ", () => {
      const valid = {
        branch_id: validBranchId,
        template_id: validTemplateId,
        room_id: validRoomId,
        results: [
          { key: "bed", status: "pass" },
          {
            key: "ac",
            status: "fail",
            note: "Điều hòa chảy nước rỉ xuống sàn",
          },
        ],
      };
      expect(submitInspectionSchema.safeParse(valid).success).toBe(true);
    });

    it("bắt buộc ghi chú lý do khi mục đánh giá là fail", () => {
      const invalid = {
        branch_id: validBranchId,
        template_id: validTemplateId,
        results: [
          { key: "ac", status: "fail", note: "" }, // không ghi chú
        ],
      };
      expect(submitInspectionSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe("upsertComplianceDocSchema", () => {
    const validDocTypeId = "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22";

    it("chấp nhận hồ sơ pháp lý hợp lệ", () => {
      const valid = {
        branch_id: validBranchId,
        doc_type_id: validDocTypeId,
        number: "GPKD-2024-001",
        issuer: "Sở Kế hoạch và Đầu tư TP.HCM",
        issued_on: "2024-01-15",
        expires_on: "2026-01-15",
        file_paths: ["compliance/gpkd_signed.pdf"],
        note: "Giấy phép đăng ký kinh doanh bản cấp đổi lần 2",
        is_renew: false,
      };
      expect(upsertComplianceDocSchema.safeParse(valid).success).toBe(true);
    });

    it("từ chối khi ngày hết hạn trước ngày cấp", () => {
      const invalid = {
        branch_id: validBranchId,
        doc_type_id: validDocTypeId,
        number: "PCCC-999",
        issued_on: "2026-05-10",
        expires_on: "2025-05-10", // hết hạn trước khi cấp
      };
      const res = upsertComplianceDocSchema.safeParse(invalid);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0]?.message).toContain(
          "Ngày hết hạn không được trước ngày cấp",
        );
      }
    });

    it("chấp nhận hồ sơ không có thời hạn (expires_on = null)", () => {
      const valid = {
        branch_id: validBranchId,
        doc_type_id: validDocTypeId,
        number: "GPKD-VO-THOI-HAN",
        issued_on: "2020-01-01",
        expires_on: null,
      };
      expect(upsertComplianceDocSchema.safeParse(valid).success).toBe(true);
    });
  });
});
