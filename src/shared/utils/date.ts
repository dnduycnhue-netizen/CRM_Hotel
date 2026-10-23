const VN_TIMEZONE = "Asia/Ho_Chi_Minh";

export type DateTimeFormatType =
  | "full"
  | "short"
  | "datetime"
  | "dateOnly"
  | "isoLike";

/**
 * Định dạng ngày giờ theo chuẩn múi giờ Việt Nam (UTC+7).
 * Đảm bảo hiển thị chính xác bất kể máy tính client/server đang chạy múi giờ nào.
 */
export function formatDateTimeVN(
  dateInput: string | Date | null | undefined,
  formatType: DateTimeFormatType = "datetime",
): string {
  if (!dateInput) return "—";
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (Number.isNaN(d.getTime())) return "—";

  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: VN_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: formatType === "full" ? "2-digit" : undefined,
    hour12: false,
  });

  const parts = formatter.formatToParts(d);
  const partMap: Record<string, string> = {};
  for (const p of parts) {
    partMap[p.type] = p.value;
  }

  const { day, month, year, hour, minute, second } = partMap;

  if (formatType === "dateOnly") {
    return `${day}/${month}/${year}`;
  }
  if (formatType === "full") {
    return `${hour}:${minute}:${second} ${day}/${month}/${year}`;
  }
  if (formatType === "short") {
    return `${hour}:${minute}`;
  }
  if (formatType === "isoLike") {
    return `${year}-${month}-${day} ${hour}:${minute}`;
  }
  // Default: "HH:mm DD/MM/YYYY"
  return `${hour}:${minute} ${day}/${month}/${year}`;
}

/**
 * Định dạng ngày theo chuẩn Việt Nam DD/MM/YYYY
 */
export function formatDateVN(
  dateInput: string | Date | null | undefined,
): string {
  return formatDateTimeVN(dateInput, "dateOnly");
}

/**
 * Lấy chuỗi ngày YYYY-MM-DD theo múi giờ Việt Nam
 */
export function getVnDateString(dateInput: Date | string = new Date()): string {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: VN_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(d);
}

/**
 * Lấy khoảng thời gian từ ngày bắt đầu đến ngày kết thúc theo giờ Việt Nam
 */
export function getVnDateRange(
  rangeType: "today" | "7days" | "30days" | "thisMonth",
): { from: string; to: string } {
  const now = new Date();
  const to = getVnDateString(now);

  if (rangeType === "today") {
    return { from: to, to };
  }

  if (rangeType === "7days") {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    return { from: getVnDateString(d), to };
  }

  if (rangeType === "thisMonth") {
    const yearMonth = to.slice(0, 7);
    return { from: `${yearMonth}-01`, to };
  }

  // Mặc định 30 ngày qua
  const d = new Date(now);
  d.setDate(d.getDate() - 29);
  return { from: getVnDateString(d), to };
}

/**
 * Chuyển chuỗi datetime-local (YYYY-MM-DDTHH:mm) từ thẻ input sang timestamptz có offset +07:00
 */
export function toVnTimestamptz(dtStr?: string | null): string | undefined {
  if (!dtStr) return undefined;
  if (dtStr.includes("+") || dtStr.endsWith("Z")) return dtStr;
  return dtStr.length === 16 ? `${dtStr}:00+07:00` : dtStr;
}
