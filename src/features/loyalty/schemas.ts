import { z } from "zod";

export const loyaltyPolicySchema = z.object({
  id: z.string().uuid().optional(),
  name: z
    .string()
    .min(2, "Tên chính sách tối thiểu 2 ký tự")
    .max(100, "Tối đa 100 ký tự"),
  validFrom: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      "Ngày bắt đầu không đúng định dạng YYYY-MM-DD",
    ),
  validTo: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      "Ngày kết thúc không đúng định dạng YYYY-MM-DD",
    )
    .optional()
    .nullable()
    .or(z.literal("")),
  basis: z.enum(["stays", "nights"]),
  windowMonths: z.coerce
    .number()
    .int()
    .min(0, "Cửa sổ tháng phải từ 0 trở lên")
    .max(120, "Tối đa 120 tháng"),
  countCurrentStay: z.boolean().default(false),
  companionsCountDefault: z.boolean().default(true),
  note: z
    .string()
    .max(1000, "Ghi chú tối đa 1000 ký tự")
    .optional()
    .nullable()
    .or(z.literal("")),
});

export type LoyaltyPolicyInput = z.infer<typeof loyaltyPolicySchema>;

export const loyaltyTierItemSchema = z.object({
  id: z.string().uuid().optional(),
  policyId: z.string().uuid("Policy ID phải là UUID hợp lệ"),
  code: z
    .string()
    .regex(
      /^[a-z0-9_]{2,30}$/,
      "Mã hạng chỉ gồm 2-30 ký tự thường, số và gạch dưới (vd: silver, gold)",
    ),
  name: z
    .string()
    .min(2, "Tên hạng tối thiểu 2 ký tự")
    .max(40, "Tên hạng tối đa 40 ký tự"),
  minValue: z.coerce.number().int().min(0, "Ngưỡng phải là số nguyên không âm"),
  discountPct: z.coerce
    .number()
    .min(0, "% giảm giá tối thiểu 0%")
    .max(100, "% giảm giá tối đa 100%"),
  benefits: z
    .string()
    .max(500, "Quyền lợi tối đa 500 ký tự")
    .optional()
    .nullable()
    .or(z.literal("")),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Mã màu phải ở định dạng hex (vd: #CA8A04)")
    .default("#64748B"),
  sort: z.coerce.number().int().default(0),
});

export type LoyaltyTierItemInput = z.infer<typeof loyaltyTierItemSchema>;

export const guestTierOverrideSchema = z.object({
  guestId: z.string().uuid("Guest ID phải là UUID hợp lệ"),
  tierCode: z.string().optional().nullable().or(z.literal("")),
  tierId: z.string().uuid().optional().nullable().or(z.literal("")),
  reason: z.string().min(10, "Lý do gán hạng tối thiểu 10 ký tự"),
  until: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      "Ngày hết hạn không đúng định dạng YYYY-MM-DD",
    )
    .optional()
    .nullable()
    .or(z.literal("")),
});

export type GuestTierOverrideInput = z.infer<typeof guestTierOverrideSchema>;
