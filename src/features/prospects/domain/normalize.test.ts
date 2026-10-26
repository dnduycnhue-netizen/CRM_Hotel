import { describe, expect, it } from "vitest";
import {
  maskPhone,
  normalizeCompanyName,
  normalizeDomain,
  normalizePhone,
  normalizeTaxCode,
} from "./normalize";

describe("normalizePhone", () => {
  it("đưa các biến thể về cùng một số", () => {
    for (const v of [
      "090 978 92 32",
      "+84909789232",
      "+84 (909) 789.232",
      "0084909789232",
      "0909-789-232",
    ]) {
      expect(normalizePhone(v)).toBe("0909789232");
    }
  });

  it("không có chữ số thì trả null", () => {
    expect(normalizePhone("abc")).toBeNull();
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone(null)).toBeNull();
  });
});

describe("normalizeCompanyName", () => {
  it("bỏ từ pháp nhân và dấu tiếng Việt", () => {
    expect(normalizeCompanyName("Công ty TNHH Du Lịch ABC")).toBe(
      "du lich abc",
    );
    expect(normalizeCompanyName("CÔNG TY CỔ PHẦN DU LỊCH  ABC.")).toBe(
      "du lich abc",
    );
    expect(normalizeCompanyName("Đại Lý Đà Nẵng MTV")).toBe("dai ly da nang");
  });

  it("tên viết tắt vẫn khác (dựa vào lớp 2 của chống trùng)", () => {
    expect(normalizeCompanyName("DL ABC")).not.toBe(
      normalizeCompanyName("Công ty TNHH Du Lịch ABC"),
    );
  });

  it("chuỗi rỗng trả null", () => {
    expect(normalizeCompanyName("  ")).toBeNull();
  });
});

describe("normalizeDomain", () => {
  it("chỉ giữ domain", () => {
    expect(normalizeDomain("https://www.abc-travel.com.vn/gioi-thieu")).toBe(
      "abc-travel.com.vn",
    );
    expect(normalizeDomain("HTTP://ABC.com:8080/x?y=1")).toBe("abc.com");
    expect(normalizeDomain("www.abc.vn")).toBe("abc.vn");
    expect(normalizeDomain("abc.vn/trang")).toBe("abc.vn");
  });

  it("rỗng trả null", () => {
    expect(normalizeDomain("")).toBeNull();
  });
});

describe("normalizeTaxCode", () => {
  it("bỏ khoảng trắng, gạch ngang, dấu chấm", () => {
    expect(normalizeTaxCode(" 0312 345-678.001 ")).toBe("0312345678001");
    expect(normalizeTaxCode("")).toBeNull();
  });
});

describe("maskPhone", () => {
  it("giữ 3 số đầu và 3 số cuối", () => {
    expect(maskPhone("0909789232")).toBe("090****232");
    expect(maskPhone("+84 909 789 232")).toBe("090****232");
  });

  it("số quá ngắn thì che toàn bộ", () => {
    expect(maskPhone("123")).toBe("***");
    expect(maskPhone(null)).toBeNull();
  });
});
