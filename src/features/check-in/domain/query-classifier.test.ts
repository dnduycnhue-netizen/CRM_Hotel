import { describe, expect, it } from "vitest";
import { classifyQuery } from "./query-classifier";

describe("classifyQuery", () => {
  it("nhận diện SĐT quốc tế E.164 với dấu + và khoảng trắng/dấu gạch", () => {
    const res = classifyQuery("+1 415-555-0123");
    expect(res).toEqual({
      kind: "phone_intl",
      cleanValue: "+14155550123",
    });
  });

  it("nhận diện SĐT quốc tế bắt đầu bằng 00", () => {
    const res = classifyQuery("0082 10 1234 5678");
    expect(res).toEqual({
      kind: "phone_intl",
      cleanValue: "+821012345678",
    });
  });

  it("nhận diện SĐT Việt Nam 10 số đầu 09", () => {
    const res = classifyQuery("0905123456");
    expect(res).toEqual({
      kind: "phone",
      cleanValue: "0905123456",
    });
  });

  it("nhận diện SĐT Việt Nam đầu 84", () => {
    const res = classifyQuery("84905123456");
    expect(res).toEqual({
      kind: "phone",
      cleanValue: "0905123456",
    });
  });

  it("nhận diện CCCD 12 số", () => {
    const res = classifyQuery("079123456789");
    expect(res).toEqual({
      kind: "cccd",
      cleanValue: "079123456789",
    });
  });

  it("nhận diện Passport mã hợp lệ", () => {
    const res = classifyQuery("B1234567");
    expect(res).toEqual({
      kind: "passport",
      cleanValue: "B1234567",
    });
  });

  it("nhận diện Họ tên có dấu khoảng trắng", () => {
    const res = classifyQuery("John Smith");
    expect(res).toEqual({
      kind: "name",
      cleanValue: "John Smith",
    });
  });
});
