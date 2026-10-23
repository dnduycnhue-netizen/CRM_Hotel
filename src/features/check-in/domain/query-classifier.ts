// src/features/check-in/domain/query-classifier.ts

export type QueryKind = "phone" | "cccd" | "passport" | "name" | "unknown";

export function classifyQuery(input: string): {
  kind: QueryKind;
  cleanValue: string;
} {
  const trimmed = input.trim();
  const digitsOnly = trimmed.replace(/\D/g, "");

  // 1. Số điện thoại Việt Nam (10 số, bắt đầu bằng 0 hoặc 84)
  if (/^(0|84)[3|5|7|8|9][0-9]{8}$/.test(digitsOnly)) {
    const phone = digitsOnly.startsWith("84")
      ? `0${digitsOnly.slice(2)}`
      : digitsOnly;
    return { kind: "phone", cleanValue: phone };
  }

  // 2. CCCD Việt Nam (12 chữ số)
  if (/^[0-9]{12}$/.test(digitsOnly)) {
    return { kind: "cccd", cleanValue: digitsOnly };
  }

  // 3. Passport (1 chữ cái hoa + 7 đến 8 chữ số)
  const upper = trimmed.toUpperCase().replace(/\s+/g, "");
  if (/^[A-Z][0-9]{7,8}$/.test(upper)) {
    return { kind: "passport", cleanValue: upper };
  }

  // 4. Nếu có chứa chữ cái và có khoảng trắng -> Họ tên
  if (/[a-zA-ZÀ-ỹ]/.test(trimmed)) {
    return { kind: "name", cleanValue: trimmed };
  }

  return { kind: "unknown", cleanValue: trimmed };
}
