// src/features/check-in/domain/cccd.ts

/**
 * Kiểm tra CCCD 12 số:
 * 3 số đầu: mã tỉnh/thành phố (001 đến 096)
 * 1 số tiếp theo: mã thế kỷ và giới tính (0-9)
 * 2 số tiếp theo: 2 số cuối năm sinh (00-99)
 * 6 số cuối: số ngẫu nhiên
 */
export function validateCccd(cccd: string): {
  isValid: boolean;
  provinceCode?: string;
  birthYear?: number;
  gender?: "male" | "female";
} {
  const clean = cccd.replace(/\D/g, "");
  if (clean.length !== 12) {
    return { isValid: false };
  }

  const province = clean.slice(0, 3);
  const centuryGender = parseInt(clean.slice(3, 4), 10);
  const yearSuffix = parseInt(clean.slice(4, 6), 10);

  // Thế kỷ 20 (sinh 1900-1999): Nam = 0, Nữ = 1
  // Thế kỷ 21 (sinh 2000-2099): Nam = 2, Nữ = 3
  let birthYear = 1900 + yearSuffix;
  let gender: "male" | "female" = "male";

  if (centuryGender === 0) {
    birthYear = 1900 + yearSuffix;
    gender = "male";
  } else if (centuryGender === 1) {
    birthYear = 1900 + yearSuffix;
    gender = "female";
  } else if (centuryGender === 2) {
    birthYear = 2000 + yearSuffix;
    gender = "male";
  } else if (centuryGender === 3) {
    birthYear = 2000 + yearSuffix;
    gender = "female";
  }

  return {
    isValid: true,
    provinceCode: province,
    birthYear,
    gender,
  };
}
