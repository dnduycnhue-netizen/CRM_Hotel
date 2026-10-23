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
