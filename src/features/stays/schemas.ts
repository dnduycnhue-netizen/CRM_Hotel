import { z } from "zod";

export const moveReasonCategories = [
  "maintenance",
  "guest_request",
  "upgrade",
  "operational",
  "other",
] as const;

export type MoveReasonCategory = (typeof moveReasonCategories)[number];

export const MOVE_REASON_LABELS: Record<MoveReasonCategory, string> = {
  maintenance: "Sự cố cơ sở vật chất (Máy lạnh, nước, điện, ồn...)",
  guest_request: "Khách yêu cầu đổi (View, tầng, loại giường...)",
  upgrade: "Nâng hạng phòng (VIP / Hội viên / Bù tiền)",
  operational: "Điều phối vận hành (Dồn phòng, ghép đoàn)",
  other: "Lý do khác",
};

export const changeRoomSchema = z.object({
  stayId: z.string().uuid("ID lượt ở không hợp lệ"),
  branchId: z.string().uuid("ID cơ sở không hợp lệ"),
  toRoomId: z.string().uuid("Vui lòng chọn phòng chuyển đến"),
  reasonCategory: z.enum(moveReasonCategories, {
    message: "Vui lòng chọn lý do đổi phòng",
  }),
  reasonNote: z
    .string()
    .trim()
    .min(5, "Lý do chi tiết cần tối thiểu 5 ký tự")
    .max(500, "Lý do chi tiết tối đa 500 ký tự"),
  createWorkOrder: z.boolean().default(false),
  workOrderTitle: z.string().trim().max(200).optional(),
  workOrderPriority: z
    .enum(["urgent", "high", "normal", "low"])
    .default("high"),
});

export type ChangeRoomInput = z.infer<typeof changeRoomSchema>;
