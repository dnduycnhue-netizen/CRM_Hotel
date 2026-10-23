import { describe, expect, it } from "vitest";
import {
  approveMergeSchema,
  decideFlagSchema,
  proposeFlagSchema,
  proposeMergeSchema,
  removeFlagSchema,
} from "./schemas";

describe("Approvals Schemas Validation", () => {
  const validUUID1 = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
  const validUUID2 = "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22";

  describe("proposeMergeSchema", () => {
    it("accepts valid keep and drop UUIDs", () => {
      const result = proposeMergeSchema.safeParse({
        keep_guest_id: validUUID1,
        drop_guest_id: validUUID2,
        reason: "same_phone",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.keep_guest_id).toBe(validUUID1);
        expect(result.data.drop_guest_id).toBe(validUUID2);
        expect(result.data.reason).toBe("same_phone");
      }
    });

    it("rejects invalid UUID strings", () => {
      const result = proposeMergeSchema.safeParse({
        keep_guest_id: "invalid-id",
        drop_guest_id: validUUID2,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("proposeFlagSchema", () => {
    it("validates reason minimum 10 characters (US-16)", () => {
      const shortReason = proposeFlagSchema.safeParse({
        guest_id: validUUID1,
        branch_id: validUUID2,
        flag_type: "blacklist",
        reason: "quá ngắn",
      });
      expect(shortReason.success).toBe(false);

      const validReason = proposeFlagSchema.safeParse({
        guest_id: validUUID1,
        branch_id: validUUID2,
        flag_type: "blacklist",
        reason: "Khách gây rối mất trật tự lúc 23h tại sảnh",
      });
      expect(validReason.success).toBe(true);
    });

    it("rejects invalid flag type", () => {
      const invalidType = proposeFlagSchema.safeParse({
        guest_id: validUUID1,
        branch_id: validUUID2,
        flag_type: "unknown_type" as any,
        reason: "Khách gây rối mất trật tự lúc 23h tại sảnh",
      });
      expect(invalidType.success).toBe(false);
    });
  });

  describe("decideFlagSchema", () => {
    it("accepts approval with optional note", () => {
      const result = decideFlagSchema.safeParse({
        id: validUUID1,
        approve: true,
        note: "Đã xác minh qua camera sảnh",
      });
      expect(result.success).toBe(true);
    });

    it("accepts rejection without note", () => {
      const result = decideFlagSchema.safeParse({
        id: validUUID1,
        approve: false,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("removeFlagSchema", () => {
    it("requires minimum 5 characters reason", () => {
      const result = removeFlagSchema.safeParse({
        id: validUUID1,
        reason: "ok",
      });
      expect(result.success).toBe(false);

      const validResult = removeFlagSchema.safeParse({
        id: validUUID1,
        reason: "Khách đã bồi thường thiệt hại đầy đủ",
      });
      expect(validResult.success).toBe(true);
    });
  });
});
