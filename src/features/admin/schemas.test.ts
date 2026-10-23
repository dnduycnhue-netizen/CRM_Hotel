import { describe, expect, it } from "vitest";
import { partnerSchema, sourceChannelSchema } from "./schemas";

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
