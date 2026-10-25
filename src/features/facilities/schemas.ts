import { z } from "zod";

export const reportIssueSchema = z.object({
  branch_id: z.string().uuid("Vui lòng chọn cơ sở"),
  kind: z.enum(["corrective", "request"]).default("corrective"),
  title: z
    .string()
    .min(3, "Tiêu đề tối thiểu 3 ký tự")
    .max(200, "Tiêu đề tối đa 200 ký tự"),
  description: z.string().max(4000).optional().nullable(),
  priority: z.enum(["urgent", "high", "normal", "low"]).default("normal"),
  room_id: z.string().uuid().optional().nullable(),
  location_id: z.string().uuid().optional().nullable(),
  asset_id: z.string().uuid().optional().nullable(),
  blocks_room: z.boolean().default(false),
  photo_paths: z.array(z.string()).default([]),
  due_at: z.string().optional().nullable(),
});

export const transitionWorkOrderSchema = z.object({
  id: z.string().uuid(),
  to: z.enum([
    "new",
    "assigned",
    "in_progress",
    "on_hold",
    "done",
    "closed",
    "cancelled",
  ]),
  comment: z.string().optional().nullable(),
  expected_status: z
    .enum([
      "new",
      "assigned",
      "in_progress",
      "on_hold",
      "done",
      "closed",
      "cancelled",
    ])
    .optional()
    .nullable(),
  patch: z
    .object({
      assignee_id: z.string().uuid().optional().nullable(),
      vendor_id: z.string().uuid().optional().nullable(),
      resolution: z.string().optional().nullable(),
      labor_cost: z.number().min(0).optional().nullable(),
      parts_cost: z.number().min(0).optional().nullable(),
      vendor_cost: z.number().min(0).optional().nullable(),
    })
    .optional()
    .default({}),
});

export const roomBlockSchema = z.object({
  room_id: z.string().uuid("Vui lòng chọn phòng cần khóa"),
  reason: z.string().min(5, "Lý do khóa tối thiểu 5 ký tự").max(500),
  ends_at: z.string().optional().nullable(),
});

export const createAssetSchema = z.object({
  branch_id: z.string().uuid("Vui lòng chọn cơ sở"),
  code: z
    .string()
    .min(3, "Mã tài sản tối thiểu 3 ký tự")
    .max(30, "Mã tài sản tối đa 30 ký tự")
    .regex(
      /^[A-Z0-9-]+$/,
      "Mã tài sản chỉ gồm chữ in hoa, số và dấu gạch ngang",
    ),
  name: z
    .string()
    .min(2, "Tên thiết bị tối thiểu 2 ký tự")
    .max(160, "Tên thiết bị tối đa 160 ký tự"),
  category_id: z.string().uuid("Vui lòng chọn nhóm phân loại"),
  room_id: z.string().uuid().optional().nullable(),
  location_id: z.string().uuid().optional().nullable(),
  brand: z.string().max(80).optional().nullable(),
  model: z.string().max(80).optional().nullable(),
  serial_no: z.string().max(80).optional().nullable(),
  purchase_date: z.string().optional().nullable(),
  purchase_cost: z.number().min(0).optional().nullable(),
  warranty_until: z.string().optional().nullable(),
  quantity: z.number().int().min(1, "Số lượng tối thiểu là 1").default(1),
  status: z
    .enum(["in_use", "in_storage", "broken", "under_repair", "disposed"])
    .default("in_use"),
  note: z.string().max(500).optional().nullable(),
});

export const updateAssetStatusSchema = z.object({
  id: z.string().uuid("ID thiết bị không hợp lệ"),
  branch_id: z.string().uuid("Cơ sở không hợp lệ"),
  status: z.enum([
    "in_use",
    "in_storage",
    "broken",
    "under_repair",
    "disposed",
  ]),
  note: z.string().max(500).optional().nullable(),
  disposed_reason: z.string().max(500).optional().nullable(),
});

export type ReportIssueInput = z.infer<typeof reportIssueSchema>;
export type TransitionWorkOrderInput = z.input<
  typeof transitionWorkOrderSchema
>;
export type RoomBlockInput = z.infer<typeof roomBlockSchema>;
export type CreateAssetInput = z.infer<typeof createAssetSchema>;
export type UpdateAssetStatusInput = z.infer<typeof updateAssetStatusSchema>;

export const createPmPlanSchema = z.object({
  branch_id: z.string().uuid("Vui lòng chọn cơ sở"),
  name: z.string().min(3, "Tên kế hoạch tối thiểu 3 ký tự").max(160),
  asset_id: z.string().uuid().optional().nullable(),
  interval_days: z
    .number()
    .int()
    .min(1, "Chu kỳ tối thiểu 1 ngày")
    .max(3650)
    .default(30),
  lead_days: z.number().int().min(0).max(90).optional().default(7),
  checklist: z.array(z.string()).optional().default([]),
  default_assignee_id: z.string().uuid().optional().nullable(),
  vendor_id: z.string().uuid().optional().nullable(),
  template_id: z.string().uuid().optional().nullable(),
  next_due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày đến hạn phải có định dạng YYYY-MM-DD")
    .optional()
    .nullable(),
});
export type CreatePmPlanInput = z.input<typeof createPmPlanSchema>;

export const updatePmPlanSchema = z.object({
  id: z.string().uuid("ID kế hoạch không hợp lệ"),
  name: z.string().min(3, "Tên kế hoạch tối thiểu 3 ký tự").max(160).optional(),
  interval_days: z.number().int().min(1).max(3650).optional(),
  lead_days: z.number().int().min(0).max(90).optional(),
  checklist: z.array(z.string()).optional(),
  default_assignee_id: z.string().uuid().optional().nullable(),
  vendor_id: z.string().uuid().optional().nullable(),
  template_id: z.string().uuid().optional().nullable(),
  next_due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày đến hạn phải có định dạng YYYY-MM-DD")
    .optional(),
  is_active: z.boolean().optional(),
});

export const checklistItemSchema = z.object({
  key: z.string().min(1, "Mã tiêu chí không được trống").max(50),
  label: z.string().min(2, "Tên tiêu chí tối thiểu 2 ký tự").max(200),
  critical: z.boolean().default(false),
  hint: z.string().max(300).optional().nullable(),
});

export const checklistTemplateSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  name: z.string().min(3, "Tên mẫu checklist tối thiểu 3 ký tự").max(150),
  scope: z.enum(["room", "area", "fire_safety", "other"]),
  items: z
    .array(checklistItemSchema)
    .min(1, "Mẫu checklist phải có ít nhất 1 mục kiểm tra"),
  is_active: z.boolean().default(true),
});

export const inspectionResultItemSchema = z
  .object({
    key: z.string(),
    status: z.enum(["pass", "fail", "na"]),
    note: z.string().max(1000).optional().nullable(),
    photo_path: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      if (
        data.status === "fail" &&
        (!data.note || data.note.trim().length === 0)
      ) {
        return false;
      }
      return true;
    },
    {
      message: "Mục không đạt bắt buộc phải ghi rõ lý do/mô tả hỏng hóc",
      path: ["note"],
    },
  );

export const submitInspectionSchema = z.object({
  branch_id: z.string().uuid("Vui lòng chọn cơ sở"),
  template_id: z.string().uuid("Vui lòng chọn mẫu checklist"),
  room_id: z.string().uuid().optional().nullable(),
  location_id: z.string().uuid().optional().nullable(),
  note: z.string().max(2000).optional().nullable(),
  results: z
    .array(inspectionResultItemSchema)
    .min(1, "Phải có kết quả kiểm tra"),
});

export type UpdatePmPlanInput = z.infer<typeof updatePmPlanSchema>;
export type ChecklistItemInput = z.infer<typeof checklistItemSchema>;
export type ChecklistTemplateInput = z.infer<typeof checklistTemplateSchema>;
export type SubmitInspectionInput = z.infer<typeof submitInspectionSchema>;

export const upsertComplianceDocSchema = z
  .object({
    id: z.string().uuid().optional().nullable(),
    branch_id: z.string().uuid("Vui lòng chọn cơ sở khách sạn"),
    doc_type_id: z.string().uuid("Vui lòng chọn loại hồ sơ pháp lý"),
    asset_id: z.string().uuid().optional().nullable(),
    number: z
      .string()
      .trim()
      .max(100, "Số văn bản tối đa 100 ký tự")
      .optional()
      .nullable(),
    issuer: z
      .string()
      .trim()
      .max(200, "Cơ quan cấp tối đa 200 ký tự")
      .optional()
      .nullable(),
    issued_on: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày cấp phải có định dạng YYYY-MM-DD")
      .optional()
      .nullable(),
    expires_on: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày hết hạn phải có định dạng YYYY-MM-DD")
      .optional()
      .nullable(),
    file_paths: z.array(z.string()).optional().default([]),
    note: z
      .string()
      .trim()
      .max(1000, "Ghi chú tối đa 1000 ký tự")
      .optional()
      .nullable(),
    is_renew: z.boolean().optional().default(false),
  })
  .refine(
    (data) => {
      if (data.issued_on && data.expires_on) {
        return data.expires_on >= data.issued_on;
      }
      return true;
    },
    {
      message: "Ngày hết hạn không được trước ngày cấp",
      path: ["expires_on"],
    },
  );

export type UpsertComplianceDocInput = z.input<
  typeof upsertComplianceDocSchema
>;
