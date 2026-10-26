// Chuẩn hóa dữ liệu để so trùng — TypeScript thuần (domain), phản chiếu đúng các hàm
// private.normalize_* trong migration 52 (nguồn chuẩn để so trùng nằm ở SQL; bản này
// dùng cho hiển thị, kiểm tra nhanh phía client, parse file import và test).

const LEGAL_WORDS = [
  "trach nhiem huu han",
  "co phan",
  "cong ty",
  "tnhh",
  "mtv",
  "cp",
  "jsc",
  "ltd",
];

function stripDiacritics(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

/** SĐT: chỉ giữ chữ số, +84 / 0084 → 0. Không có chữ số → null. */
export function normalizePhone(
  input: string | null | undefined,
): string | null {
  const digits = (input ?? "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("0084") && digits.length >= 13) {
    return `0${digits.slice(4)}`;
  }
  if (digits.startsWith("84") && digits.length >= 11) {
    return `0${digits.slice(2)}`;
  }
  return digits;
}

/** Tên công ty: thường, bỏ dấu, bỏ từ pháp nhân, bỏ ký tự đặc biệt. */
export function normalizeCompanyName(
  input: string | null | undefined,
): string | null {
  let s = stripDiacritics((input ?? "").toLowerCase()).replace(
    /[^a-z0-9]+/g,
    " ",
  );
  const legal = new RegExp(`\\b(${LEGAL_WORDS.join("|")})\\b`, "g");
  s = s.replace(legal, " ").replace(/\s+/g, " ").trim();
  return s || null;
}

/** Website: chỉ giữ domain (bỏ scheme, www., cổng, đường dẫn, query). */
export function normalizeDomain(
  input: string | null | undefined,
): string | null {
  let s = (input ?? "").trim().toLowerCase();
  if (!s) return null;
  s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//, "");
  s = s.split("/")[0].split("?")[0].split("#")[0].split(":")[0];
  s = s.replace(/^www\./, "").trim();
  return s || null;
}

/** MST: bỏ khoảng trắng, dấu gạch ngang, dấu chấm. */
export function normalizeTaxCode(
  input: string | null | undefined,
): string | null {
  const s = (input ?? "").toLowerCase().replace(/[\s\-.]/g, "");
  return s || null;
}

/** Che SĐT: giữ 3 số đầu + 3 số cuối (090****232). */
export function maskPhone(input: string | null | undefined): string | null {
  if (!input || !input.trim()) return null;
  const n = normalizePhone(input);
  if (n && n.length >= 8) return `${n.slice(0, 3)}****${n.slice(-3)}`;
  return "***";
}
