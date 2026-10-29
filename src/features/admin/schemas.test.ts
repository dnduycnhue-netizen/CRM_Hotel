import { describe, expect, it } from "vitest";
import {
  createRoomSchema,
  partnerSchema,
  sourceChannelSchema,
  updateRoomSchema,
} from "./schemas";

describe("sourceChannelSchema", () => {
  it("validates a correct source channel", () => {
    const valid = {
      code: "agoda_direct",
      name: "Agoda Direct",
      kind: "ota",
      requires_partner: false,
      is_active: true,
      sort: 1,
    };
    const res = sourceChannelSchema.safeParse(valid);
    expect(res.success).toBe(true);
  });

  it("fails when code contains uppercase or special characters", () => {
    const invalid = {
      code: "Agoda-Direct",
      name: "Agoda Direct",
      kind: "ota",
    };
    const res = sourceChannelSchema.safeParse(invalid);
    expect(res.success).toBe(false);
  });

  it("fails when kind is invalid", () => {
    const invalid = {
      code: "agoda",
      name: "Agoda",
      kind: "unknown_kind",
    };
    const res = sourceChannelSchema.safeParse(invalid);
    expect(res.success).toBe(false);
  });
});

describe("partnerSchema", () => {
  it("validates a correct partner", () => {
    const valid = {
      name: "Công ty Cổ phần Du lịch Saigontourist",
      kind: "tour_operator",
      contact_name: "Nguyễn Văn A",
      phone: "0901234567",
      email: "contact@saigontourist.vn",
      tax_code: "0300123456",
      is_active: true,
    };
    const res = partnerSchema.safeParse(valid);
    expect(res.success).toBe(true);
  });

  it("fails when partner name is too short", () => {
    const invalid = {
      name: "A",
      kind: "corporate",
    };
    const res = partnerSchema.safeParse(invalid);
    expect(res.success).toBe(false);
  });

  it("fails when phone number is invalid", () => {
    const invalid = {
      name: "Công ty ABC",
      kind: "corporate",
      phone: "12345",
    };
    const res = partnerSchema.safeParse(invalid);
    expect(res.success).toBe(false);
  });
});

describe("createRoomSchema & updateRoomSchema", () => {
  const validBranchId = "550e8400-e29b-41d4-a716-446655440000";

  it("validates valid room creation input", () => {
    const valid = {
      branch_id: validBranchId,
      number: "501",
      floor: 5,
      room_type: "Deluxe Suite",
      opened_on: "2026-01-01",
    };
    const res = createRoomSchema.safeParse(valid);
    expect(res.success).toBe(true);
  });

  it("fails when room number is empty or exceeds 10 chars", () => {
    const empty = {
      branch_id: validBranchId,
      number: " ",
    };
    expect(createRoomSchema.safeParse(empty).success).toBe(false);

    const tooLong = {
      branch_id: validBranchId,
      number: "12345678901",
    };
    expect(createRoomSchema.safeParse(tooLong).success).toBe(false);
  });

  it("validates room update input", () => {
    const valid = {
      number: "502",
      floor: 5,
      room_type: "Standard",
    };
    const res = updateRoomSchema.safeParse(valid);
    expect(res.success).toBe(true);
  });
});
