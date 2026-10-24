import { describe, expect, it } from "vitest";
import {
  guestTierOverrideSchema,
  loyaltyPolicySchema,
  loyaltyTierItemSchema,
} from "./schemas";

const VALID_UUID_1 = "123e4567-e89b-12d3-a456-426614174000";
const VALID_UUID_2 = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";

describe("loyaltyPolicySchema", () => {
  it("chấp nhận chính sách hợp lệ", () => {
    const res = loyaltyPolicySchema.safeParse({
      name: "Chính sách Mùa Hè 2026",
      validFrom: "2026-05-01",
      validTo: "2026-09-30",
      basis: "stays",
      windowMonths: 12,
      countCurrentStay: true,
      companionsCountDefault: true,
      note: "Áp dụng toàn chuỗi dịp hè",
    });
    expect(res.success).toBe(true);
  });

  it("cho phép validTo là null (vô thời hạn)", () => {
    const res = loyaltyPolicySchema.safeParse({
      name: "Chính sách Dài Hạn",
      validFrom: "2026-01-01",
      validTo: null,
      basis: "nights",
      windowMonths: 24,
      countCurrentStay: false,
      companionsCountDefault: false,
    });
    expect(res.success).toBe(true);
  });

  it("từ chối khi ngày bắt đầu sai định dạng", () => {
    const res = loyaltyPolicySchema.safeParse({
      name: "Chính sách lỗi",
      validFrom: "01/01/2026",
      basis: "stays",
      windowMonths: 12,
    });
    expect(res.success).toBe(false);
  });
});

describe("loyaltyTierItemSchema", () => {
  it("chấp nhận hạng hợp lệ với màu hex và min_value >= 0", () => {
    const res = loyaltyTierItemSchema.safeParse({
      policyId: VALID_UUID_1,
      code: "gold_vip",
      name: "Hạng Vàng VIP",
      minValue: 10,
      discountPct: 15,
      color: "#F59E0B",
      sort: 2,
    });
    expect(res.success).toBe(true);
  });

  it("từ chối mã hạng có ký tự hoa hoặc ký tự đặc biệt", () => {
    const res = loyaltyTierItemSchema.safeParse({
      policyId: VALID_UUID_1,
      code: "Gold VIP!",
      name: "Hạng Vàng",
      minValue: 5,
      discountPct: 10,
    });
    expect(res.success).toBe(false);
  });

  it("từ chối % giảm giá > 100 hoặc âm", () => {
    const res1 = loyaltyTierItemSchema.safeParse({
      policyId: VALID_UUID_1,
      code: "invalid_pct",
      name: "Lỗi %",
      minValue: 5,
      discountPct: 110,
    });
    expect(res1.success).toBe(false);

    const res2 = loyaltyTierItemSchema.safeParse({
      policyId: VALID_UUID_1,
      code: "invalid_pct",
      name: "Lỗi %",
      minValue: 5,
      discountPct: -5,
    });
    expect(res2.success).toBe(false);
  });
});

describe("guestTierOverrideSchema", () => {
  it("chấp nhận gán hạng với lý do tối thiểu 10 ký tự", () => {
    const res = guestTierOverrideSchema.safeParse({
      guestId: VALID_UUID_2,
      tierCode: "platinum",
      reason: "Đối tác chiến lược chuỗi năm 2026",
      until: "2026-12-31",
    });
    expect(res.success).toBe(true);
  });

  it("từ chối khi lý do dưới 10 ký tự", () => {
    const res = guestTierOverrideSchema.safeParse({
      guestId: VALID_UUID_2,
      tierCode: "platinum",
      reason: "VIP ngắn",
    });
    expect(res.success).toBe(false);
  });

  it("cho phép tierCode rỗng để hủy gán thủ công", () => {
    const res = guestTierOverrideSchema.safeParse({
      guestId: VALID_UUID_2,
      tierCode: "",
      reason: "Hủy gán thủ công theo quyết định quản lý",
    });
    expect(res.success).toBe(true);
  });
});
