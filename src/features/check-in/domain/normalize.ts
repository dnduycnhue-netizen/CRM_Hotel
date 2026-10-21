// src/features/check-in/domain/normalize.ts

/**
 * Chuẩn hoá số điện thoại Việt Nam:
 * +84 905 123 456, 84905123456, 0905.123.456 → 0905123456
 */
export function normalizeVnPhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.startsWith('84') && digits.length === 11) {
    return '0' + digits.slice(2);
  }
  return digits;
}

/**
 * Chuẩn hoá họ tên: viết hoa, bỏ khoảng trắng thừa
 */
export function normalizeFullName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toUpperCase();
}
