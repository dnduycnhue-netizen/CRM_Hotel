// src/shared/utils/phone.ts — Chuẩn hoá và kiểm tra định dạng SĐT Việt Nam & Quốc tế (E.164)

export const VN_PHONE_REGEX = /^0[35789][0-9]{8}$/;
export const INTL_PHONE_REGEX = /^\+[1-9][0-9]{6,14}$/;

/**
 * Chuẩn hoá số điện thoại Việt Nam.
 * Loại bỏ khoảng trắng, dấu gạch ngang, dấu chấm, dấu ngoặc.
 * Đổi đầu +84 thành 0.
 */
export function normalizePhoneVn(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;
  let clean = raw.trim().replace(/[\s\-.()]/g, "");
  if (!clean) return null;

  if (clean.startsWith("+84")) {
    clean = `0${clean.slice(3)}`;
  } else if (clean.startsWith("84") && clean.length === 11) {
    clean = `0${clean.slice(2)}`;
  }

  return clean;
}

/**
 * Kiểm tra tính hợp lệ của SĐT Việt Nam (10 số, đầu 03, 05, 07, 08, 09)
 */
export function isValidPhoneVn(raw: string | null | undefined): boolean {
  const normalized = normalizePhoneVn(raw);
  if (!normalized) return false;
  return VN_PHONE_REGEX.test(normalized);
}

export type NormalizeIntlResult =
  | { success: true; phone: string | null }
  | { success: false; error: string };

/**
 * Chuẩn hoá và kiểm tra số điện thoại quốc tế E.164.
 * Quy tắc:
 * 1. Trim, loại bỏ khoảng trắng, gạch ngang, ngoặc, chấm.
 * 2. Đổi '00' ở đầu thành '+'.
 * 3. Bắt buộc phải có dấu '+' ở đầu (không tự đoán mã quốc gia).
 * 4. Khớp định dạng CHECK DB: ^\+[1-9][0-9]{6,14}$
 */
export function normalizePhoneIntl(
  raw: string | null | undefined,
): NormalizeIntlResult {
  if (!raw || !raw.trim()) {
    return { success: true, phone: null };
  }

  let clean = raw.trim();

  // Đổi '00' ở đầu thành '+'
  if (clean.startsWith("00")) {
    clean = `+${clean.slice(2)}`;
  }

  // Bắt buộc phải có '+'
  if (!clean.startsWith("+")) {
    return {
      success: false,
      error:
        "Số điện thoại quốc tế phải bắt đầu bằng dấu '+' kèm mã quốc gia (VD: +1, +82...)",
    };
  }

  // Bỏ khoảng trắng, dấu gạch ngang, dấu ngoặc, dấu chấm ở phần còn lại
  const prefix = "+";
  const rest = clean.slice(1).replace(/[\s\-.()]/g, "");
  const normalized = prefix + rest;

  if (!INTL_PHONE_REGEX.test(normalized)) {
    return {
      success: false,
      error:
        "Số điện thoại quốc tế không hợp lệ theo chuẩn E.164 (+[mã quốc gia][số], từ 7 đến 15 chữ số)",
    };
  }

  return { success: true, phone: normalized };
}

/**
 * Che mặt nạ số điện thoại (bảo vệ PII theo phân quyền)
 */
export function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  if (phone.includes("*")) return phone;

  // SĐT Việt Nam (10 số)
  if (phone.startsWith("0") && phone.length === 10) {
    return `${phone.slice(0, 3)}****${phone.slice(7)}`;
  }

  // SĐT Quốc tế E.164 (VD: +14155550123 -> +141****0123)
  if (phone.startsWith("+") && phone.length >= 8) {
    const keepStart = Math.min(4, Math.floor(phone.length / 3));
    const keepEnd = Math.min(4, Math.floor(phone.length / 3));
    return `${phone.slice(0, keepStart)}****${phone.slice(phone.length - keepEnd)}`;
  }

  return phone;
}
