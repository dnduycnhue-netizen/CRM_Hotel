import { describe, expect, it } from "vitest";
import { checkInSchema } from "./schemas";

describe("CheckIn Schemas", () => {
  const validBranchId = "550e8400-e29b-41d4-a716-446655440000";
  const validRoomId = "660e8400-e29b-41d4-a716-446655440000";

  it("hợp lệ với đầy đủ thông tin check-in hợp lệ", () => {
    const result = checkInSchema.safeParse({
      branchId: validBranchId,
      roomId: validRoomId,
      fullName: "Đoàn Thanh Nghĩa",
      gender: "male",
      phone: "0902000024",
      sourceChannelCode: "walk_in",
      expectedCheckOutAt: "2026-10-25T12:00:00+07:00",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.documentType).toBe("cccd");
      expect(result.data.isBackdated).toBe(false);
      expect(result.data.blacklistAck).toBe(false);
    }
  });

  it("từ chối khi thiếu nguồn khách (sourceChannelCode)", () => {
    const result = checkInSchema.safeParse({
      branchId: validBranchId,
      roomId: validRoomId,
      fullName: "Đoàn Thanh Nghĩa",
      sourceChannelCode: "",
      expectedCheckOutAt: "2026-10-25T12:00:00+07:00",
    });
    expect(result.success).toBe(false);
  });

  it("từ chối khi thiếu ngày giờ dự kiến trả phòng", () => {
    const result = checkInSchema.safeParse({
      branchId: validBranchId,
      roomId: validRoomId,
      fullName: "Đoàn Thanh Nghĩa",
      sourceChannelCode: "walk_in",
      expectedCheckOutAt: "",
    });
    expect(result.success).toBe(false);
  });

  it("từ chối khi branchId không phải UUID hợp lệ", () => {
    const result = checkInSchema.safeParse({
      branchId: "invalid-branch-id",
      roomId: validRoomId,
      fullName: "Đoàn Thanh Nghĩa",
      sourceChannelCode: "walk_in",
      expectedCheckOutAt: "2026-10-25T12:00:00+07:00",
    });
    expect(result.success).toBe(false);
  });

  it("chấp nhận danh sách người đi cùng hợp lệ", () => {
    const result = checkInSchema.safeParse({
      branchId: validBranchId,
      roomId: validRoomId,
      fullName: "Đoàn Thanh Nghĩa",
      phone: "0902000024",
      documentType: "cccd",
      documentNumber: "001090123456",
      sourceChannelCode: "walk_in",
      expectedCheckOutAt: "2026-10-25T12:00:00+07:00",
      companions: [
        {
          fullName: "Nguyễn Thị Mai",
          gender: "female",
          phone: "0903111222",
          documentType: "cccd",
          documentNumber: "001090654321",
          countsForLoyalty: true,
        },
        {
          fullName: "Đoàn Bé Nhỏ",
          gender: "male",
          isChild: true,
          countsForLoyalty: false,
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.companions).toHaveLength(2);
      expect(result.data.companions[0].countsForLoyalty).toBe(true);
      expect(result.data.companions[1].countsForLoyalty).toBe(false);
    }
  });

  it("từ chối khi người đi cùng trùng số giấy tờ với khách chính", () => {
    const result = checkInSchema.safeParse({
      branchId: validBranchId,
      roomId: validRoomId,
      fullName: "Đoàn Thanh Nghĩa",
      phone: "0902000024",
      documentType: "cccd",
      documentNumber: "001090123456",
      sourceChannelCode: "walk_in",
      expectedCheckOutAt: "2026-10-25T12:00:00+07:00",
      companions: [
        {
          fullName: "Nguyễn Thị Mai",
          gender: "female",
          documentType: "cccd",
          documentNumber: "001090123456", // trùng khách chính
          countsForLoyalty: true,
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("từ chối khi quá 10 người đi cùng", () => {
    const companions = Array.from({ length: 11 }, (_, i) => ({
      fullName: `Người đi cùng ${i + 1}`,
      gender: "male" as const,
      countsForLoyalty: true,
    }));

    const result = checkInSchema.safeParse({
      branchId: validBranchId,
      roomId: validRoomId,
      fullName: "Đoàn Thanh Nghĩa",
      phone: "0902000024",
      sourceChannelCode: "walk_in",
      expectedCheckOutAt: "2026-10-25T12:00:00+07:00",
      companions,
    });
    expect(result.success).toBe(false);
  });
});
