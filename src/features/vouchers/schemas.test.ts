import { describe, expect, it } from "vitest";
import {
  createVoucherSchema,
  recordBirthdayGreetingSchema,
  redeemVoucherSchema,
} from "./schemas";

const VALID_UUID_1 = "123e4567-e89b-12d3-a456-426614174000";
const VALID_UUID_2 = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";
const VALID_UUID_3 = "c89b4f23-8c45-4df3-a17f-1d89e5a1b32f";

describe("createVoucherSchema", () => {
  it("chấp nhận voucher giảm giá theo phần trăm hợp lệ", () => {
    const res = createVoucherSchema.safeParse({
      code: "SUMMER2026",
      title: "Ưu đãi Chào Hè 2026",
      discount_type: "percent",
      discount_value: 20,
      max_discount_amount: 500000,
      min_spend_amount: 1000000,
      valid_from: "2026-06-01",
      valid_to: "2026-08-31",
      usage_limit: 100,
      target_guest_id: null,
      applicable_branch_id: null,
      note: "Áp dụng toàn chuỗi",
    });
    expect(res.success).toBe(true);
  });

  it("chấp nhận voucher giảm giá tiền cố định hợp lệ", () => {
    const res = createVoucherSchema.safeParse({
      code: "VIP-BDAY-200K",
      title: "Voucher Sinh nhật VIP 200k",
      discount_type: "fixed_amount",
      discount_value: 200000,
      valid_from: "2026-10-01",
      valid_to: "2026-10-31",
      usage_limit: 1,
      target_guest_id: VALID_UUID_1,
      applicable_branch_id: VALID_UUID_2,
    });
    expect(res.success).toBe(true);
  });

  it("từ chối khi giảm giá phần trăm vượt quá 100%", () => {
    const res = createVoucherSchema.safeParse({
      code: "INVALID120",
      title: "Voucher quá 100%",
      discount_type: "percent",
      discount_value: 120,
      valid_from: "2026-06-01",
      valid_to: "2026-08-31",
    });
    expect(res.success).toBe(false);
  });

  it("từ chối khi ngày hết hạn trước ngày hiệu lực", () => {
    const res = createVoucherSchema.safeParse({
      code: "WRONGDATES",
      title: "Sai ngày",
      discount_type: "percent",
      discount_value: 10,
      valid_from: "2026-10-25",
      valid_to: "2026-10-20",
    });
    expect(res.success).toBe(false);
  });

  it("từ chối mã voucher có ký tự đặc biệt", () => {
    const res = createVoucherSchema.safeParse({
      code: "CODE@#$!",
      title: "Mã sai ký tự",
      discount_type: "fixed_amount",
      discount_value: 50000,
      valid_from: "2026-01-01",
      valid_to: "2026-12-31",
    });
    expect(res.success).toBe(false);
  });
});

describe("redeemVoucherSchema", () => {
  it("chấp nhận dữ liệu đổi voucher hợp lệ", () => {
    const res = redeemVoucherSchema.safeParse({
      code: "BDAY2026-ABCDEF",
      guest_id: VALID_UUID_1,
      branch_id: VALID_UUID_2,
      stay_id: VALID_UUID_3,
      bill_amount: 1500000,
      note: "Áp dụng giảm trừ khi check-out",
    });
    expect(res.success).toBe(true);
  });

  it("cho phép stay_id là null hoặc rỗng", () => {
    const res = redeemVoucherSchema.safeParse({
      code: "SUMMER2026",
      guest_id: VALID_UUID_1,
      branch_id: VALID_UUID_2,
      stay_id: "",
      bill_amount: 0,
    });
    expect(res.success).toBe(true);
  });

  it("từ chối khi thiếu guest_id hoặc branch_id", () => {
    const res = redeemVoucherSchema.safeParse({
      code: "SUMMER2026",
      bill_amount: 500000,
    });
    expect(res.success).toBe(false);
  });
});

describe("recordBirthdayGreetingSchema", () => {
  it("chấp nhận ghi nhận lời chúc sinh nhật hợp lệ", () => {
    const res = recordBirthdayGreetingSchema.safeParse({
      guest_id: VALID_UUID_1,
      branch_id: VALID_UUID_2,
      year: 2026,
      channel: "phone",
      gift_description: "Gọi điện chúc mừng và tặng thiệp chúc mừng",
      auto_issue_voucher: true,
      voucher_discount_pct: 20,
      note: "Khách rất vui và dự định ghé cuối tuần",
    });
    expect(res.success).toBe(true);
  });

  it("từ chối kênh gửi không hợp lệ", () => {
    const res = recordBirthdayGreetingSchema.safeParse({
      guest_id: VALID_UUID_1,
      branch_id: VALID_UUID_2,
      channel: "telegram", // không nằm trong greetingChannels
    });
    expect(res.success).toBe(false);
  });

  it("từ chối voucher_discount_pct ngoài khoảng 1-100", () => {
    const res = recordBirthdayGreetingSchema.safeParse({
      guest_id: VALID_UUID_1,
      branch_id: VALID_UUID_2,
      channel: "zalo",
      auto_issue_voucher: true,
      voucher_discount_pct: 150,
    });
    expect(res.success).toBe(false);
  });
});
