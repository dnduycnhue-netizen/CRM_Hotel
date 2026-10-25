import { describe, expect, it } from "vitest";
import {
  lockMonthlyFiguresSchema,
  monthlyFiguresRowSchema,
  saveMonthlyFiguresSchema,
  unlockMonthlyFiguresSchema,
} from "./schemas";

describe("Monthly Figures Schemas (§14 Revenue Input)", () => {
  const validBranchId = "123e4567-e89b-12d3-a456-426614174000";

  it("chấp nhận dữ liệu hàng hợp lệ", () => {
    const valid = {
      branch_id: validBranchId,
      month: "2026-10-01",
      arrivals: 150,
      guests: 210,
      room_nights: 300,
      available_room_nights: 400,
      room_revenue: 250000000,
      other_revenue: 35000000,
      note: "Doanh thu tăng nhờ lễ hội",
    };

    const res = monthlyFiguresRowSchema.safeParse(valid);
    expect(res.success).toBe(true);
  });

  it("từ chối khi room_nights > available_room_nights", () => {
    const invalid = {
      branch_id: validBranchId,
      month: "2026-10-01",
      arrivals: 150,
      guests: 210,
      room_nights: 500,
      available_room_nights: 400,
      room_revenue: 250000000,
      other_revenue: 35000000,
    };

    const res = monthlyFiguresRowSchema.safeParse(invalid);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0]?.message).toContain(
        "Số đêm phòng bán không được lớn hơn số đêm phòng khả dụng",
      );
    }
  });

  it("từ chối định dạng tháng sai (không phải ngày 01)", () => {
    const invalid = {
      branch_id: validBranchId,
      month: "2026-10-15",
      arrivals: 10,
      guests: 10,
      room_nights: 10,
      available_room_nights: 20,
      room_revenue: 10000000,
      other_revenue: 0,
    };

    const res = monthlyFiguresRowSchema.safeParse(invalid);
    expect(res.success).toBe(false);
  });

  it("từ chối doanh thu âm", () => {
    const invalid = {
      branch_id: validBranchId,
      month: "2026-10-01",
      arrivals: 10,
      guests: 10,
      room_nights: 10,
      available_room_nights: 20,
      room_revenue: -5000,
      other_revenue: 0,
    };

    const res = monthlyFiguresRowSchema.safeParse(invalid);
    expect(res.success).toBe(false);
  });

  it("validate lockMonthlyFiguresSchema hợp lệ", () => {
    const valid = {
      branch_id: validBranchId,
      month: "2026-10-01",
    };

    const res = lockMonthlyFiguresSchema.safeParse(valid);
    expect(res.success).toBe(true);
  });

  it("validate unlockMonthlyFiguresSchema yêu cầu lý do tối thiểu 10 ký tự", () => {
    const tooShort = {
      branch_id: validBranchId,
      month: "2026-10-01",
      reason: "Mở lại",
    };
    expect(unlockMonthlyFiguresSchema.safeParse(tooShort).success).toBe(false);

    const valid = {
      branch_id: validBranchId,
      month: "2026-10-01",
      reason: "Điều chỉnh doanh thu phòng theo kiểm toán quý",
    };
    expect(unlockMonthlyFiguresSchema.safeParse(valid).success).toBe(true);
  });

  it("validate saveMonthlyFiguresSchema yêu cầu ít nhất 1 hàng", () => {
    expect(saveMonthlyFiguresSchema.safeParse({ rows: [] }).success).toBe(
      false,
    );
  });
});
