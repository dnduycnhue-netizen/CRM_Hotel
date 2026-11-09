import { describe, expect, it } from "vitest";
import {
  isValidPhoneVn,
  maskPhone,
  normalizePhoneIntl,
  normalizePhoneVn,
} from "./phone";

describe("Phone utilities", () => {
  describe("normalizePhoneVn", () => {
    it("normalizes Vietnamese mobile phones", () => {
      expect(normalizePhoneVn("0987234565")).toBe("0987234565");
      expect(normalizePhoneVn("098 723 4565")).toBe("0987234565");
      expect(normalizePhoneVn("098-723-4565")).toBe("0987234565");
      expect(normalizePhoneVn("+84987234565")).toBe("0987234565");
      expect(normalizePhoneVn("84987234565")).toBe("0987234565");
    });

    it("handles empty or null input", () => {
      expect(normalizePhoneVn("")).toBeNull();
      expect(normalizePhoneVn(null)).toBeNull();
      expect(normalizePhoneVn(undefined)).toBeNull();
    });

    it("validates Vietnamese phone format", () => {
      expect(isValidPhoneVn("0987234565")).toBe(true);
      expect(isValidPhoneVn("0387234565")).toBe(true);
      expect(isValidPhoneVn("0787234565")).toBe(true);
      expect(isValidPhoneVn("0587234565")).toBe(true);
      expect(isValidPhoneVn("0887234565")).toBe(true);
      expect(isValidPhoneVn("0243888888")).toBe(false); // bàn
      expect(isValidPhoneVn("0123456789")).toBe(false); // đầu 01
      expect(isValidPhoneVn("098723456")).toBe(false); // thiếu số
    });
  });

  describe("normalizePhoneIntl", () => {
    it("TC1: accepts valid international E.164 format", () => {
      const res = normalizePhoneIntl("+14155550123");
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.phone).toBe("+14155550123");
      }
    });

    it("TC2: rejects international number missing leading +", () => {
      const res = normalizePhoneIntl("14155550123");
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toContain("phải bắt đầu bằng dấu '+'");
      }
    });

    it("TC3: normalizes spaces, dashes, parentheses and 00 prefix", () => {
      const res1 = normalizePhoneIntl("+1 415-555-0123");
      expect(res1.success).toBe(true);
      if (res1.success) expect(res1.phone).toBe("+14155550123");

      const res2 = normalizePhoneIntl("+1 (415) 555-0123");
      expect(res2.success).toBe(true);
      if (res2.success) expect(res2.phone).toBe("+14155550123");

      const res3 = normalizePhoneIntl("0014155550123");
      expect(res3.success).toBe(true);
      if (res3.success) expect(res3.phone).toBe("+14155550123");
    });

    it("handles empty or whitespace gracefully", () => {
      const res = normalizePhoneIntl("   ");
      expect(res.success).toBe(true);
      if (res.success) expect(res.phone).toBeNull();
    });

    it("rejects invalid E.164 (too short, letters, zero country code)", () => {
      expect(normalizePhoneIntl("+0123456789").success).toBe(false); // starts with 0 after +
      expect(normalizePhoneIntl("+1234").success).toBe(false); // too short
      expect(normalizePhoneIntl("+1415555abc").success).toBe(false); // letters
    });
  });

  describe("maskPhone", () => {
    it("masks Vietnamese phone numbers", () => {
      expect(maskPhone("0987234565")).toBe("098****565");
    });

    it("masks international phone numbers", () => {
      const masked = maskPhone("+14155550123");
      expect(masked).toContain("****");
      expect(masked?.startsWith("+14")).toBe(true);
      expect(masked?.endsWith("0123")).toBe(true);
    });

    it("preserves already masked numbers", () => {
      expect(maskPhone("098****565")).toBe("098****565");
    });
  });
});
