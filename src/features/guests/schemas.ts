import { z } from "zod";

export const createGuestSchema = z.object({
  full_name: z
    .string()
    .min(2, "Họ tên tối thiểu 2 ký tự")
    .max(100, "Họ tên tối đa 100 ký tự"),
  gender: z.enum(["male", "female", "other"]).default("other"),
  nationality: z
    .string()
    .length(2, "Mã quốc gia 2 ký tự (VD: VN)")
    .default("VN"),
  phone: z.string().optional().nullable(),
  email: z
    .string()
    .email("Email không đúng định dạng")
    .optional()
    .nullable()
    .or(z.literal("")),
  address_line: z.string().optional().nullable(),
  province_code: z.string().optional().nullable(),
  source_channel_id: z
    .string()
    .uuid("Nguồn khách phải là UUID hợp lệ")
    .optional()
    .nullable()
    .or(z.literal("")),
  tags: z.array(z.string()).default([]),
  document: z
    .object({
      type: z.enum(["cccd", "cmnd", "passport", "other"]),
      number: z.string().min(4, "Số giấy tờ tối thiểu 4 ký tự"),
      country: z.string().default("VN"),
    })
    .optional()
    .nullable(),
});

export const updateGuestSchema = z.object({
  full_name: z.string().min(2).max(100).optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  dob: z.string().optional().nullable(),
  nationality: z.string().length(2).optional(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  address_line: z.string().optional().nullable(),
  province_code: z.string().optional().nullable(),
  ward_code: z.string().optional().nullable(),
  source_channel_id: z
    .string()
    .uuid("Nguồn khách phải là UUID hợp lệ")
    .optional()
    .nullable()
    .or(z.literal("")),
});

export const addGuestNoteSchema = z.object({
  guest_id: z.string().uuid(),
  branch_id: z.string().uuid().optional().nullable(),
  kind: z
    .enum(["general", "preference", "allergy", "complaint", "incident"])
    .default("general"),
  body: z
    .string()
    .min(1, "Nội dung ghi chú không được trống")
    .max(2000, "Tối đa 2000 ký tự"),
});

export const guestTierOverrideSchema = z.object({
  guestId: z.string().uuid("guestId phải là UUID hợp lệ"),
  tierId: z.string().uuid().optional().nullable(),
  tierCode: z.string().optional().nullable(),
  reason: z.string().min(10, "Lý do gán hạng tối thiểu 10 ký tự").max(500),
  until: z.string().optional().nullable(),
});

export const setGuestConsentSchema = z.object({
  guestId: z.string().uuid("Mã khách phải là UUID hợp lệ"),
  channel: z.enum(["zalo", "sms", "email", "phone"], {
    message: "Kênh liên lạc không hợp lệ",
  }),
  granted: z.boolean(),
  source: z.string().default("front_desk"),
  note: z.string().max(500, "Ghi chú tối đa 500 ký tự").optional().nullable(),
});

export type CreateGuestInput = z.infer<typeof createGuestSchema>;
export type UpdateGuestInput = z.infer<typeof updateGuestSchema>;
export type AddGuestNoteInput = z.infer<typeof addGuestNoteSchema>;
export type GuestTierOverrideInput = z.infer<typeof guestTierOverrideSchema>;
export type SetGuestConsentInput = z.infer<typeof setGuestConsentSchema>;
