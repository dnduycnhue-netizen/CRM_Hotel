import { describe, expect, it } from "vitest";
import { changeRoomSchema } from "./schemas";

describe("changeRoomSchema", () => {
  const validData = {
    stayId: "11111111-1111-4111-8111-111111111111",
    branchId: "22222222-2222-4222-8222-222222222222",
    toRoomId: "33333333-3333-4333-8333-333333333333",
    reasonCategory: "maintenance",
    reasonNote: "Máy lạnh bị chảy nước nhiều không mát",
  };

  it("chấp nhận dữ liệu hợp lệ", () => {
    const res = changeRoomSchema.safeParse(validData);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.createWorkOrder).toBe(false);
      expect(res.data.workOrderPriority).toBe("high");
    }
  });

  it("từ chối khi reasonNote dưới 5 ký tự", () => {
    const res = changeRoomSchema.safeParse({
      ...validData,
      reasonNote: "hỏng",
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      const noteIssue = res.error.issues.find((i) =>
        i.path.includes("reasonNote"),
      );
      expect(noteIssue?.message).toContain("tối thiểu 5 ký tự");
    }
  });

  it("từ chối lý do không hợp lệ", () => {
    const res = changeRoomSchema.safeParse({
      ...validData,
      reasonCategory: "invalid_reason",
    });
    expect(res.success).toBe(false);
  });

  it("cho phép kèm tùy chọn tạo phiếu sửa chữa", () => {
    const res = changeRoomSchema.safeParse({
      ...validData,
      createWorkOrder: true,
      workOrderTitle: "Sửa máy lạnh phòng 201",
      workOrderPriority: "urgent",
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.createWorkOrder).toBe(true);
      expect(res.data.workOrderPriority).toBe("urgent");
    }
  });
});
