import { z } from "zod";
import { normalizePhone } from "./domain/normalize";

// ---------------------------------------------------------------------------
// Hằng số + nhãn tiếng Việt
// ---------------------------------------------------------------------------

export const prospectKinds = [
  "tour_operator",
  "travel_agency",
  "mice",
  "pilgrimage",
  "school",
  "corporate",
  "small_tour",
  "other",
] as const;

export const prospectKindLabels: Record<
  (typeof prospectKinds)[number],
  string
> = {
  tour_operator: "Công ty lữ hành",
  travel_agency: "Đại lý du lịch",
  mice: "MICE / Sự kiện",
  pilgrimage: "Hành hương",
  school: "Trường học",
  corporate: "Doanh nghiệp",
  small_tour: "Tour nhỏ / Lẻ",
  other: "Khác",
};

export const prospectStatuses = [
  "new",
  "contacted",
  "nurturing",
  "negotiating",
  "converted",
  "lost",
  "duplicate",
] as const;

export const prospectStatusLabels: Record<
  (typeof prospectStatuses)[number],
  string
> = {
  new: "Mới tìm được",
  contacted: "Đã liên hệ",
  nurturing: "Đang chăm sóc",
  negotiating: "Đang đàm phán",
  converted: "Đã chuyển đổi",
  lost: "Không tiềm năng",
  duplicate: "Trùng lặp",
};

/** Trạng thái được đổi tay (chuyển đổi chỉ đi qua nút "Chuyển thành đối tác") */
export const manualProspectStatuses = [
  "new",
  "contacted",
  "nurturing",
  "negotiating",
  "lost",
  "duplicate",
] as const;

export const prospectPriorities = ["high", "medium", "low"] as const;
export const prospectPriorityLabels: Record<
  (typeof prospectPriorities)[number],
  string
> = {
  high: "Cao",
  medium: "Trung bình",
  low: "Thấp",
};

export const prospectChannels = [
  "call",
  "zalo",
  "email",
  "meeting",
  "quotation",
  "other",
] as const;
export const prospectChannelLabels: Record<
  (typeof prospectChannels)[number],
  string
> = {
  call: "Gọi điện",
  zalo: "Zalo",
  email: "Email",
  meeting: "Gặp trực tiếp",
  quotation: "Gửi báo giá",
  other: "Khác",
};

export const prospectOutcomes = [
  "interested",
  "rejected",
  "no_answer",
  "callback",
  "quotation_sent",
  "met",
  "other",
] as const;
export const prospectOutcomeLabels: Record<
  (typeof prospectOutcomes)[number],
  string
> = {
  interested: "Nghe máy — quan tâm",
  rejected: "Nghe máy — từ chối",
  no_answer: "Không nghe máy",
  callback: "Hẹn gọi lại",
  quotation_sent: "Đã gửi báo giá",
  met: "Đã gặp",
  other: "Khác",
};

export const prospectSourceSuggestions = [
  "Website / tìm kiếm",
  "Hội chợ du lịch",
  "Giới thiệu",
  "Danh sách mua",
  "Mạng xã hội",
  "Khác",
] as const;

export const MAX_IMPORT_ROWS = 500;

// ---------------------------------------------------------------------------
// Zod dùng chung cho form client + Server Action
// ---------------------------------------------------------------------------

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không đúng định dạng");

const optionalText = z.string().trim().optional().nullable().or(z.literal(""));
const optionalDate = dateString.optional().nullable().or(z.literal(""));
const optionalCount = z
  .union([z.number(), z.string()])
  .optional()
  .nullable()
  .transform((v) => {
    if (v === undefined || v === null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : Number.NaN;
  })
  .refine((v) => v === null || (!Number.isNaN(v) && v >= 0), {
    message: "Phải là số không âm",
  });

export const saveProspectSchema = z
  .object({
    id: z.string().uuid().optional().nullable().or(z.literal("")),
    company_name: z
      .string()
      .trim()
      .min(2, "Tên công ty tối thiểu 2 ký tự")
      .max(160, "Tên công ty tối đa 160 ký tự"),
    kind: z.enum(prospectKinds),
    tax_code: optionalText,
    phone: optionalText,
    email: z
      .string()
      .trim()
      .email("Email không đúng định dạng")
      .optional()
      .nullable()
      .or(z.literal("")),
    website: optionalText,
    address: optionalText,
    province: optionalText,
    contact_name: optionalText,
    contact_title: optionalText,
    contact_phone: optionalText,
    source: optionalText,
    estimated_groups_per_year: optionalCount,
    estimated_guests_per_year: optionalCount,
    // undefined / "" = mặc định (người tạo); null = CỐ Ý không gán (chỉ quản lý/owner);
    // uuid = gán cho người đó. Server Action phân biệt null với undefined.
    assigned_to: z.string().uuid().nullable().optional().or(z.literal("")),
    priority: z.enum(prospectPriorities).default("medium"),
    next_follow_up_at: optionalDate,
    note: optionalText,
  })
  .superRefine((v, ctx) => {
    const hasPhone = Boolean(v.phone?.trim());
    const hasEmail = Boolean(v.email?.trim());
    if (!hasPhone && !hasEmail) {
      ctx.addIssue({
        code: "custom",
        path: ["phone"],
        message: "Cần ít nhất số điện thoại hoặc email để chống trùng",
      });
    }
    if (hasPhone && (normalizePhone(v.phone)?.length ?? 0) < 8) {
      ctx.addIssue({
        code: "custom",
        path: ["phone"],
        message: "Số điện thoại không hợp lệ",
      });
    }
  });

export type SaveProspectInput = z.input<typeof saveProspectSchema>;
export type SaveProspectData = z.output<typeof saveProspectSchema>;

export const saveProspectRequestSchema = z.object({
  prospect: saveProspectSchema,
  force: z.boolean().default(false),
  force_reason: z.string().trim().max(500).optional().nullable(),
});
export type SaveProspectRequest = z.input<typeof saveProspectRequestSchema>;

export const logInteractionSchema = z.object({
  prospect_id: z.string().uuid(),
  channel: z.enum(prospectChannels),
  outcome: z.enum(prospectOutcomes),
  note: z.string().trim().max(2000).optional().nullable().or(z.literal("")),
  next_follow_up_at: optionalDate,
});
export type LogInteractionInput = z.input<typeof logInteractionSchema>;

export const setProspectStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(manualProspectStatuses),
  note: z.string().trim().max(1000).optional().nullable().or(z.literal("")),
  next_follow_up_at: optionalDate,
  duplicate_of: z.string().uuid().optional().nullable().or(z.literal("")),
});
export type SetProspectStatusInput = z.input<typeof setProspectStatusSchema>;

export const assignProspectSchema = z.object({
  id: z.string().uuid(),
  /** null = "Không gán": prospect về trạng thái chưa gán, sales tự nhận sau */
  assignee: z.string().uuid().nullable(),
});

export const MAX_BULK_UNASSIGN = 500;
export const unassignProspectsSchema = z.object({
  ids: z
    .array(z.string().uuid())
    .min(1, "Chưa chọn khách tiềm năng nào")
    .max(MAX_BULK_UNASSIGN, `Mỗi lần bỏ gán tối đa ${MAX_BULK_UNASSIGN} dòng`),
});

/** Giá trị đặc biệt của bộ lọc "Sales phụ trách" */
export const UNASSIGNED_FILTER = "unassigned" as const;

export const prospectIdSchema = z.object({ id: z.string().uuid() });

export const mergeProspectSchema = z.object({
  target_id: z.string().uuid(),
  payload: saveProspectSchema,
});

export const checkDuplicatesSchema = z.object({
  name: z.string().trim().max(160).optional().nullable(),
  phone: z.string().trim().max(60).optional().nullable(),
  tax_code: z.string().trim().max(60).optional().nullable(),
  website: z.string().trim().max(200).optional().nullable(),
  province: z.string().trim().max(100).optional().nullable(),
  exclude_id: z.string().uuid().optional().nullable().or(z.literal("")),
});
export type CheckDuplicatesInput = z.input<typeof checkDuplicatesSchema>;

export const prospectFiltersSchema = z.object({
  search: z.string().trim().max(160).optional(),
  status: z.enum(prospectStatuses).optional().or(z.literal("")),
  kind: z.enum(prospectKinds).optional().or(z.literal("")),
  province: z.string().trim().max(100).optional(),
  assigned_to: z
    .union([z.string().uuid(), z.literal(UNASSIGNED_FILTER), z.literal("")])
    .optional(),
  overdue_only: z.boolean().optional(),
  dup_pending: z.boolean().optional(),
});

// ---- Import ---------------------------------------------------------------

export const importRowSchema = z.object({
  row_id: z.string().min(1).max(20),
  company_name: z.string().trim().max(200),
  kind: z.enum(prospectKinds).default("other"),
  phone: optionalText,
  email: optionalText,
  address: optionalText,
  province: optionalText,
  website: optionalText,
  source: optionalText,
  contact_name: optionalText,
  tax_code: optionalText,
  note: optionalText,
});
export type ImportRow = z.input<typeof importRowSchema>;

export const previewImportSchema = z.object({
  rows: z
    .array(importRowSchema)
    .min(1, "File không có dòng dữ liệu")
    .max(MAX_IMPORT_ROWS, `Mỗi lần nhập tối đa ${MAX_IMPORT_ROWS} dòng`),
});

export const commitImportSchema = z.object({
  /** true = mọi dòng ghi ra đều chưa gán (sales tự nhận sau). Chỉ quản lý/owner. */
  leave_unassigned: z.boolean().default(false),
  rows: z
    .array(
      z.object({
        row: importRowSchema,
        force: z.boolean().default(false),
        force_reason: z.string().trim().max(500).optional().nullable(),
      }),
    )
    .min(1, "Chưa chọn dòng nào để ghi")
    .max(MAX_IMPORT_ROWS, `Mỗi lần nhập tối đa ${MAX_IMPORT_ROWS} dòng`),
});
export type CommitImportInput = z.input<typeof commitImportSchema>;
