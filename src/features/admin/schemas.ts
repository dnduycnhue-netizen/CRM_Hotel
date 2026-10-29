import { z } from "zod";

export const sourceChannelSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  code: z
    .string()
    .min(2, "Mã kênh tối thiểu 2 ký tự")
    .max(30, "Mã kênh tối đa 30 ký tự")
    .regex(
      /^[a-z0-9_]{2,30}$/,
      "Mã kênh chỉ gồm chữ thường không dấu, số và gạch dưới (vd: direct, booking_com)",
    ),
  name: z
    .string()
    .min(2, "Tên kênh tối thiểu 2 ký tự")
    .max(100, "Tên kênh tối đa 100 ký tự"),
  kind: z.enum(["direct", "ota", "partner", "corporate", "other"], {
    message: "Loại kênh không hợp lệ",
  }),
  requires_partner: z.boolean().default(false),
  is_active: z.boolean().default(true),
  sort: z.coerce.number().int().min(0, "Thứ tự sắp xếp phải >= 0").default(0),
});

export type SourceChannelInput = z.infer<typeof sourceChannelSchema>;

export const partnerSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  name: z
    .string()
    .min(2, "Tên đối tác tối thiểu 2 ký tự")
    .max(160, "Tên đối tác tối đa 160 ký tự"),
  kind: z.enum(
    ["tour_operator", "travel_agency", "corporate", "guide_driver", "other"],
    {
      message: "Phân loại đối tác không hợp lệ",
    },
  ),
  contact_name: z.string().max(100).optional().nullable(),
  phone: z
    .string()
    .regex(/^(0|\+84)[0-9]{9,10}$/, "Số điện thoại không đúng định dạng VN")
    .optional()
    .nullable()
    .or(z.literal("")),
  email: z
    .string()
    .email("Email không đúng định dạng")
    .optional()
    .nullable()
    .or(z.literal("")),
  tax_code: z.string().max(30).optional().nullable(),
  note: z.string().max(1000).optional().nullable(),
  is_active: z.boolean().default(true),
});

export type PartnerInput = z.infer<typeof partnerSchema>;

export const createRoomSchema = z.object({
  branch_id: z.string().uuid("Vui lòng chọn cơ sở hợp lệ"),
  number: z
    .string()
    .trim()
    .min(1, "Số phòng tối thiểu 1 ký tự")
    .max(10, "Số phòng tối đa 10 ký tự"),
  floor: z.coerce.number().int().min(1, "Tầng phải >= 1").optional().nullable(),
  room_type: z.string().trim().max(50).optional().nullable(),
  opened_on: z.string().optional().nullable(),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;

export const updateRoomSchema = z.object({
  number: z
    .string()
    .trim()
    .min(1, "Số phòng tối thiểu 1 ký tự")
    .max(10, "Số phòng tối đa 10 ký tự"),
  floor: z.coerce.number().int().min(1, "Tầng phải >= 1").optional().nullable(),
  room_type: z.string().trim().max(50).optional().nullable(),
  opened_on: z.string().optional().nullable(),
});

export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
