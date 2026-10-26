// Ánh xạ cột / loại hình / SĐT khi import Excel-CSV — TypeScript thuần (domain).

import { normalizePhone } from "./normalize";

export const IMPORT_FIELDS = [
  "company_name",
  "kind",
  "phone",
  "email",
  "address",
  "province",
  "website",
  "source",
  "contact_name",
  "tax_code",
  "note",
] as const;

export type ImportField = (typeof IMPORT_FIELDS)[number];

// Tiêu đề cột đã bỏ dấu, thường, bỏ ký tự đặc biệt
const HEADER_ALIASES: Record<ImportField, string[]> = {
  company_name: [
    "ten to chuc",
    "ten cong ty",
    "ten",
    "cong ty",
    "ten doanh nghiep",
    "company",
    "company name",
    "name",
  ],
  kind: ["loai hinh", "loai", "phan loai", "kind", "type"],
  phone: ["sdt", "so dien thoai", "dien thoai", "phone", "tel", "hotline"],
  email: ["email", "e mail", "mail"],
  address: ["dia chi", "address"],
  province: [
    "tinh vung",
    "tinh thanh",
    "tinh",
    "vung",
    "khu vuc",
    "province",
    "city",
  ],
  website: ["website", "web", "trang web", "url"],
  source: ["nguon", "nguon url", "nguon tim duoc", "source"],
  contact_name: ["nguoi lien he", "lien he", "contact", "contact name"],
  tax_code: ["mst", "ma so thue", "tax code", "tax"],
  note: ["ghi chu", "note", "notes"],
};

function plain(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Nhận diện tiêu đề cột của file → trường chuẩn (null nếu không nhận ra). */
export function matchImportHeader(header: string): ImportField | null {
  const h = plain(header);
  if (!h) return null;
  for (const field of IMPORT_FIELDS) {
    if (HEADER_ALIASES[field].includes(h)) return field;
  }
  return null;
}

export type ImportKind =
  | "tour_operator"
  | "travel_agency"
  | "mice"
  | "pilgrimage"
  | "school"
  | "corporate"
  | "small_tour"
  | "other";

/** Chuyển nhãn loại hình trong file (tiếng Việt/Anh) sang mã chuẩn. */
export function mapKindText(text: string | null | undefined): ImportKind {
  const t = plain(text ?? "");
  if (!t) return "other";
  if (t.includes("tour nho") || t.includes("small")) return "small_tour";
  if (t.includes("hanh huong") || t.includes("pilgrim")) return "pilgrimage";
  if (t.includes("mice") || t.includes("su kien")) return "mice";
  if (t.includes("truong") || t.includes("school")) return "school";
  if (t.includes("dai ly") || t.includes("agency")) return "travel_agency";
  if (
    t.includes("lu hanh") ||
    t.includes("lua hanh") ||
    t.includes("tour operator")
  ) {
    return "tour_operator";
  }
  if (t.includes("doanh nghiep") || t.includes("corporate")) return "corporate";
  return "other";
}

export interface ImportRowInput {
  company_name: string;
  kind: ImportKind;
  phone: string | null;
  email: string | null;
  address: string | null;
  province: string | null;
  website: string | null;
  source: string | null;
  contact_name: string | null;
  tax_code: string | null;
  note: string | null;
}

// Số di động VN: 10 chữ số, đầu 03 / 05 / 07 / 08 / 09
const MOBILE_PHONE = /^0[35789]\d{8}$/;
const EMAIL_FORMAT = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export interface ParsedPhoneCell {
  /** SĐT chính (đã chuẩn hóa) hoặc null nếu ô không có số hợp lệ */
  primary: string | null;
  /** Các số còn lại (đã chuẩn hóa; đoạn không phải số đầy đủ giữ nguyên văn) */
  others: string[];
}

/**
 * Một ô SĐT có thể chứa nhiều số ("0973 615 595 / 0237 326 8368"). Tách theo "/"
 * (và ; | – —), chuẩn hóa từng số rồi chọn số chính:
 *
 *  1. Số hợp lệ = 8–11 chữ số sau chuẩn hóa (+84 → 0). Ngắn hơn / dài hơn coi là đoạn
 *     cụt ("386 2017") và đưa nguyên văn vào `others`.
 *  2. Ưu tiên SỐ DI ĐỘNG: đúng 10 chữ số, đầu 03 / 05 / 07 / 08 / 09 (yêu cầu "10 số"
 *     CHỈ áp cho di động).
 *  3. Không có di động thì lấy số hợp lệ ĐẦU TIÊN, dù là máy bàn 10–11 số có mã vùng
 *     (0237 386 2013), tổng đài 1800/1900 (8 số) hay mã vùng cũ 9 số (054 850164).
 *     Các số này vẫn được chấp nhận làm số chính; ô có số hợp lệ thì dòng không bị
 *     coi là thiếu SĐT.
 *
 * Số còn lại trả về trong `others` (import nối vào cuối ghi chú: "SĐT khác: ...").
 */
export function parsePhoneCell(
  cell: string | null | undefined,
): ParsedPhoneCell {
  const segments = (cell ?? "")
    .split(/[/;|–—]/)
    .map((x) => x.trim())
    .filter((x) => x !== "");

  const items = segments.map((raw) => {
    const norm = normalizePhone(raw);
    const valid = norm !== null && norm.length >= 8 && norm.length <= 11;
    return { raw, value: valid ? (norm as string) : null };
  });

  const primaryItem =
    items.find((i) => i.value && MOBILE_PHONE.test(i.value)) ??
    items.find((i) => i.value) ??
    null;

  const others: string[] = [];
  for (const item of items) {
    if (item === primaryItem) continue;
    const text = item.value ?? item.raw;
    if (text === primaryItem?.value || others.includes(text)) continue;
    others.push(text);
  }
  return { primary: primaryItem?.value ?? null, others };
}

/**
 * Excel lưu SĐT dạng số nên mất số 0 đầu (0909123456 → 909123456). Khôi phục khi
 * chuỗi chỉ gồm chữ số và đúng dạng số VN thiếu 0: di động 9 số (đầu 3/5/7/8/9),
 * cố định 10 số (đầu 2).
 */
export function restoreLeadingZero(phone: string | null): string | null {
  if (!phone || !/^\d+$/.test(phone)) return phone;
  if (phone.length === 9 && /^[35789]/.test(phone)) return `0${phone}`;
  if (phone.length === 10 && phone.startsWith("2")) return `0${phone}`;
  return phone;
}

/** Dựng 1 dòng import từ mảng giá trị theo bản đồ cột. */
export function buildImportRow(
  values: ReadonlyArray<string | null | undefined>,
  columnMap: ReadonlyArray<ImportField | null>,
): ImportRowInput {
  const get = (field: ImportField): string | null => {
    const idx = columnMap.indexOf(field);
    if (idx < 0) return null;
    const v = (values[idx] ?? "").toString().trim();
    return v === "" ? null : v;
  };

  const phone = parsePhoneCell(restoreLeadingZero(get("phone")));
  const rawEmail = get("email")?.toLowerCase() ?? null;
  const emailOk = rawEmail !== null && EMAIL_FORMAT.test(rawEmail);

  // Thông tin không đưa vào trường riêng được thì giữ lại trong ghi chú
  const noteParts = [get("note")];
  if (phone.others.length > 0) {
    noteParts.push(`SĐT khác: ${phone.others.join(", ")}`);
  }
  if (rawEmail !== null && !emailOk) {
    noteParts.push(`Email trong file không hợp lệ: ${rawEmail}`);
  }
  const note = noteParts.filter((x): x is string => Boolean(x)).join("\n");

  return {
    company_name: get("company_name") ?? "",
    kind: mapKindText(get("kind")),
    phone: phone.primary,
    email: emailOk ? rawEmail : null,
    address: get("address"),
    province: get("province"),
    website: get("website"),
    source: get("source"),
    contact_name: get("contact_name"),
    tax_code: get("tax_code"),
    note: note === "" ? null : note,
  };
}

// File mẫu: đúng các cột của file leads hiện có
export const IMPORT_TEMPLATE_HEADERS = [
  "Tên công ty",
  "Loại hình",
  "SĐT",
  "Email",
  "Địa chỉ",
  "Tỉnh/Vùng",
  "Website",
  "Nguồn",
] as const;

export const IMPORT_TEMPLATE_EXAMPLE = [
  "Công ty Du lịch Biển Xanh",
  "Lữ hành",
  "0909 123 456",
  "booking@bienxanh.vn",
  "12 Lê Lợi, Quy Nhơn",
  "Bình Định",
  "https://bienxanh.vn",
  "Hội chợ du lịch 2026",
] as const;
