import { describe, expect, it } from "vitest";
import { changePasswordSchema } from "./schemas";

describe("changePasswordSchema", () => {
  it("chấp nhận mật khẩu hợp lệ đáp ứng đầy đủ điều kiện", () => {
    const valid = {
      currentPassword: "OldPassword123!",
      newPassword: "NewSecurePassword2026@",
      confirmPassword: "NewSecurePassword2026@",
    };
    const result = changePasswordSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("từ chối khi thiếu mật khẩu hiện tại", () => {
    const invalid = {
      currentPassword: "",
      newPassword: "NewSecurePassword2026@",
      confirmPassword: "NewSecurePassword2026@",
    };
    const result = changePasswordSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("từ chối mật khẩu mới quá ngắn (< 8 ký tự)", () => {
    const invalid = {
      currentPassword: "OldPassword123!",
      newPassword: "Abc1!",
      confirmPassword: "Abc1!",
    };
    const result = changePasswordSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("từ chối mật khẩu mới không có chữ hoa hoặc chữ số", () => {
    const noUpper = {
      currentPassword: "OldPassword123!",
      newPassword: "password123!",
      confirmPassword: "password123!",
    };
    expect(changePasswordSchema.safeParse(noUpper).success).toBe(false);

    const noNumber = {
      currentPassword: "OldPassword123!",
      newPassword: "PasswordSecret!",
      confirmPassword: "PasswordSecret!",
    };
    expect(changePasswordSchema.safeParse(noNumber).success).toBe(false);
  });

  it("từ chối khi mật khẩu xác nhận không khớp", () => {
    const mismatch = {
      currentPassword: "OldPassword123!",
      newPassword: "NewSecurePassword2026@",
      confirmPassword: "DifferentPassword2026@",
    };
    const result = changePasswordSchema.safeParse(mismatch);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("không trùng khớp");
    }
  });

  it("từ chối khi mật khẩu mới trùng với mật khẩu hiện tại", () => {
    const same = {
      currentPassword: "SamePassword123!",
      newPassword: "SamePassword123!",
      confirmPassword: "SamePassword123!",
    };
    const result = changePasswordSchema.safeParse(same);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("không được trùng");
    }
  });
});
