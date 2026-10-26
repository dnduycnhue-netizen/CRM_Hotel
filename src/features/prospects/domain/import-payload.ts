// Dựng payload gửi RPC save_prospect cho một dòng import — TypeScript thuần (domain).

export interface ImportPayloadRow {
  company_name: string;
  kind?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  province?: string | null;
  website?: string | null;
  source?: string | null;
  contact_name?: string | null;
  tax_code?: string | null;
  note?: string | null;
}

const nz = (v: string | null | undefined): string | null => {
  const t = (v ?? "").trim();
  return t === "" ? null : t;
};

/**
 * `leaveUnassigned = true`: payload mang key `assigned_to` = null TƯỜNG MINH, vì
 * save_prospect phân biệt "key vắng mặt" (gán người import) với "key = null"
 * (cố ý không gán). `false`: KHÔNG có key assigned_to (giữ hành vi mặc định).
 * `note` (đã nối "SĐT khác: ...") luôn được giữ.
 */
export function buildImportSavePayload(
  row: ImportPayloadRow,
  leaveUnassigned: boolean,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    company_name: row.company_name,
    kind: row.kind ?? "other",
    phone: nz(row.phone),
    email: nz(row.email),
    address: nz(row.address),
    province: nz(row.province),
    website: nz(row.website),
    source: nz(row.source),
    contact_name: nz(row.contact_name),
    tax_code: nz(row.tax_code),
    note: nz(row.note),
    priority: "medium",
  };
  if (leaveUnassigned) {
    payload.assigned_to = null;
  }
  return payload;
}
