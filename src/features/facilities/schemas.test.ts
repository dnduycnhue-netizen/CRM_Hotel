import { describe, expect, it } from "vitest";
import {
  createAssetSchema,
  reportIssueSchema,
  roomBlockSchema,
  transitionWorkOrderSchema,
  updateAssetStatusSchema,
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
});
