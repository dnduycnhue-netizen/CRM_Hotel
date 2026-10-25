import { z } from "zod";

export const companionSchema = z.object({
  guestId: z
    .string()
    .uuid("Mã khách phải là UUID hợp lệ")
    .optional()
    .or(z.literal("")),
  fullName: z
    .string()
    .min(2, "Họ tên người đi cùng tối thiểu 2 ký tự")
    .max(100),
  gender: z.enum(["male", "female", "other"]).default("male"),
  dob: z.string().optional().or(z.literal("")),
  nationality: z.string().default("VN"),
  phone: z.string().min(10, "SĐT tối thiểu 10 số").optional().or(z.literal("")),
  documentType: z.enum(["cccd", "passport"]).default("cccd"),
  documentNumber: z.string().optional().or(z.literal("")),
  isChild: z.boolean().default(false),
  countsForLoyalty: z.boolean().default(true),
  notes: z.string().optional().or(z.literal("")),
});

export type CompanionInput = z.infer<typeof companionSchema>;

export const checkInSchema = z
  .object({
    branchId: z.string().uuid("Cơ sở phải là UUID hợp lệ"),
    roomId: z.string().uuid("Phòng phải là UUID hợp lệ"),
    guestId: z
      .string()
      .uuid("Mã khách phải là UUID hợp lệ")
      .optional()
      .or(z.literal("")),
    fullName: z.string().min(2, "Họ tên tối thiểu 2 ký tự").max(100),
    gender: z.enum(["male", "female", "other"]).default("male"),
    dob: z.string().optional(),
    nationality: z.string().default("VN"),
    phone: z
      .string()
      .min(10, "SĐT tối thiểu 10 số")
      .optional()
      .or(z.literal("")),
    email: z
      .string()
      .email("Email không đúng định dạng")
      .optional()
      .or(z.literal("")),
    documentType: z.enum(["cccd", "passport"]).default("cccd"),
    documentNumber: z
      .string()
      .min(6, "Số giấy tờ tối thiểu 6 ký tự")
      .optional()
      .or(z.literal("")),

    // Nguồn khách (bắt buộc)
    sourceChannelCode: z.string().min(1, "Vui lòng chọn nguồn khách"),
    partnerId: z
      .string()
      .uuid("Đối tác phải là UUID hợp lệ")
      .optional()
      .or(z.literal("")),

    // Thời gian
    expectedCheckOutAt: z
      .string()
      .min(1, "Ngày giờ dự kiến trả phòng không được để trống"),

    // Nhập bù quá khứ (dành riêng cho Quản lý)
    isBackdated: z.boolean().default(false),
    actualCheckInAt: z.string().optional(),
    actualCheckOutAt: z.string().optional(),

    // Xác nhận cảnh báo blacklist
    blacklistAck: z.boolean().default(false),

    // Người đi cùng
    companions: z
      .array(companionSchema)
      .max(10, "Tối đa 10 người đi cùng mỗi lượt ở")
      .default([]),

    // Đồng ý nhận tin & CSKH (Nghị định 13/2023 - mặc định không tick)
    consents: z
      .object({
        zalo: z.boolean().default(false),
        sms: z.boolean().default(false),
        email: z.boolean().default(false),
        phone: z.boolean().default(false),
      })
      .default({
        zalo: false,
        sms: false,
        email: false,
        phone: false,
      }),

    // Giá phòng và tiền cọc
    roomPrice: z.coerce
      .number()
      .min(0, "Giá phòng không được âm")
      .optional()
      .default(0),
    depositAmount: z.coerce
      .number()
      .min(0, "Tiền cọc không được âm")
      .optional()
      .default(0),

    notes: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    // Validate duplicate documents
    const seenDocs = new Set<string>();
    const cleanPrimaryDoc = val.documentNumber?.trim().toUpperCase();
    if (cleanPrimaryDoc) {
      seenDocs.add(cleanPrimaryDoc);
    }

    val.companions.forEach((c, idx) => {
      const cleanDoc = c.documentNumber?.trim().toUpperCase();
      if (!c.isChild && cleanDoc && cleanDoc.length < 6) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Số giấy tờ người đi cùng tối thiểu 6 ký tự",
          path: ["companions", idx, "documentNumber"],
        });
      }

      if (cleanDoc) {
        if (seenDocs.has(cleanDoc)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Trùng số giấy tờ "${cleanDoc}" với khách chính hoặc người đi cùng khác`,
            path: ["companions", idx, "documentNumber"],
          });
        }
        seenDocs.add(cleanDoc);
      }
    });
  });

export type CheckInInput = z.infer<typeof checkInSchema>;
