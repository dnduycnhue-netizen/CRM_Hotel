import { describe, it, expect } from 'vitest';
import { formatDateTimeVN, formatDateVN, toVnTimestamptz, getVnDateString, getVnDateRange } from './date';

describe('formatDateTimeVN', () => {
  it('định dạng đúng ngày giờ theo múi giờ Việt Nam (UTC+7)', () => {
    // 07:00 UTC = 14:00 GMT+7
    const utcStr = '2026-10-22T07:00:00Z';
    expect(formatDateTimeVN(utcStr)).toBe('14:00 22/10/2026');
    expect(formatDateTimeVN(utcStr, 'isoLike')).toBe('2026-10-22 14:00');
    expect(formatDateTimeVN(utcStr, 'short')).toBe('14:00');
    expect(formatDateTimeVN(utcStr, 'full')).toBe('14:00:00 22/10/2026');
  });

  it('xử lý chính xác khoảnh khắc giao thoa nửa đêm (23:59 và 00:01)', () => {
    // 2026-10-22 16:59:00 UTC = 2026-10-22 23:59:00 VN
    const lateNight = '2026-10-22T16:59:00Z';
    expect(formatDateTimeVN(lateNight)).toBe('23:59 22/10/2026');
    expect(formatDateVN(lateNight)).toBe('22/10/2026');

    // 2026-10-22 17:01:00 UTC = 2026-10-23 00:01:00 VN (đã sang ngày 23)
    const earlyMorning = '2026-10-22T17:01:00Z';
    expect(formatDateTimeVN(earlyMorning)).toBe('00:01 23/10/2026');
    expect(formatDateVN(earlyMorning)).toBe('23/10/2026');
  });

  it('xử lý an toàn khi đầu vào là null, undefined hoặc ngày không hợp lệ', () => {
    expect(formatDateTimeVN(null)).toBe('—');
    expect(formatDateTimeVN(undefined)).toBe('—');
    expect(formatDateTimeVN('invalid-date')).toBe('—');
    expect(formatDateVN(null)).toBe('—');
  });
});

describe('toVnTimestamptz', () => {
  it('thêm offset +07:00 cho chuỗi từ thẻ input datetime-local', () => {
    expect(toVnTimestamptz('2026-10-22T14:30')).toBe('2026-10-22T14:30:00+07:00');
  });

  it('giữ nguyên chuỗi đã có offset hoặc Z', () => {
    expect(toVnTimestamptz('2026-10-22T14:30:00+07:00')).toBe('2026-10-22T14:30:00+07:00');
    expect(toVnTimestamptz('2026-10-22T07:30:00Z')).toBe('2026-10-22T07:30:00Z');
  });

  it('xử lý giá trị rỗng hoặc undefined', () => {
    expect(toVnTimestamptz(null)).toBeUndefined();
    expect(toVnTimestamptz('')).toBeUndefined();
    expect(toVnTimestamptz(undefined)).toBeUndefined();
  });
});

describe('getVnDateString & getVnDateRange', () => {
  it('trả về chuỗi ngày YYYY-MM-DD chuẩn múi giờ Việt Nam', () => {
    // 2026-10-22 17:30 UTC = 2026-10-23 00:30 VN
    const d = new Date('2026-10-22T17:30:00Z');
    expect(getVnDateString(d)).toBe('2026-10-23');
  });

  it('tạo đúng khoảng ngày cho 7days, 30days và thisMonth', () => {
    const range7 = getVnDateRange('7days');
    expect(range7.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(range7.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(range7.from <= range7.to).toBe(true);

    const range30 = getVnDateRange('30days');
    expect(range30.from <= range30.to).toBe(true);

    const rangeMonth = getVnDateRange('thisMonth');
    expect(rangeMonth.from.endsWith('-01')).toBe(true);
  });
});
