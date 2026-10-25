import { z } from "zod";

export const discountTypes = ["percent", "fixed_amount"] as const;
export const discountTypeLabels: Record<
  (typeof discountTypes)[number],
  string
> = {
  percent: "Giảm theo phần trăm (%)",
  fixed_amount: "Giảm số tiền cố định (VNĐ)",
};

export const greetingChannels = [
  "phone",
  "sms",
  "zalo",
  "email",
  "in_person",
  "gift",
] as const;

export const greetingChannelLabels: Record<
  (typeof greetingChannels)[number],
  string
> = {
  phone: "Gọi điện thoại chúc mừng",
  sms: "Tin nhắn SMS",
  zalo: "Tin nhắn Zalo",
  email: "Thư điện tử (Email)",
  in_person: "Chúc mừng trực tiếp tại quầy",
  gift: "Gửi quà / Set hoa / Bánh kem",
};

export const createVoucherSchema = z
  .object({
    code: z
      .string()
      .min(3, "Mã voucher tối thiểu 3 ký tự")
      .max(30, "Mã voucher tối đa 30 ký tự")
      .regex(
        /^[A-Za-z0-9_-]+$/,
        "Mã voucher chỉ chứa chữ cái, chữ số, dấu gạch ngang hoặc gạch dưới",
      ),
    title: z
      .string()
      .min(3, "Tên chương trình voucher tối thiểu 3 ký tự")
      .max(150, "Tên chương trình tối đa 150 ký tự"),
    discount_type: z.enum(discountTypes),
    discount_value: z.coerce
      .number()
      .positive("Giá trị giảm giá phải lớn hơn 0"),
    max_discount_amount: z.coerce
      .number()
      .positive("Mức giảm tối đa phải lớn hơn 0")
      .optional()
      .nullable()
      .or(z.literal("")),
    min_spend_amount: z.coerce
      .number()
      .min(0, "Giá trị hóa đơn tối thiểu không được âm")
      .default(0),
    valid_from: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày hiệu lực định dạng YYYY-MM-DD"),
    valid_to: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày hết hạn định dạng YYYY-MM-DD"),
    usage_limit: z.coerce
      .number()
      .int("Số lượt dùng phải là số nguyên")
      .min(1, "Số lượt dùng tối thiểu là 1")
      .default(1),
    target_guest_id: z
      .string()
      .uuid("ID khách hàng không hợp lệ")
      .optional()
      .nullable()
      .or(z.literal("")),
    applicable_branch_id: z
      .string()
      .uuid("ID cơ sở không hợp lệ")
      .optional()
      .nullable()
      .or(z.literal("")),
    note: z.string().optional().nullable().or(z.literal("")),
  })
  .refine((data) => data.valid_to >= data.valid_from, {
    message: "Ngày hết hạn voucher phải sau hoặc cùng ngày hiệu lực",
    path: ["valid_to"],
  })
  .refine(
    (data) =>
      data.discount_type !== "percent" || Number(data.discount_value) <= 100,
    {
      message: "Giảm giá phần trăm không được vượt quá 100%",
      path: ["discount_value"],
    },
  );

export type CreateVoucherInput = z.infer<typeof createVoucherSchema>;

export const redeemVoucherSchema = z.object({
  code: z
    .string()
    .min(3, "Mã voucher tối thiểu 3 ký tự")
    .max(30, "Mã voucher tối đa 30 ký tự"),
  guest_id: z.string().uuid("Vui lòng chọn khách hàng hợp lệ"),
  branch_id: z.string().uuid("Vui lòng chọn cơ sở áp dụng"),
  stay_id: z
    .string()
    .uuid("Lượt ở không hợp lệ")
    .optional()
    .nullable()
    .or(z.literal("")),
  bill_amount: z.coerce
    .number()
    .min(0, "Số tiền thanh toán không được âm")
    .default(0),
  note: z.string().optional().nullable().or(z.literal("")),
});

export type RedeemVoucherInput = z.infer<typeof redeemVoucherSchema>;

export const recordBirthdayGreetingSchema = z.object({
  guest_id: z.string().uuid("Vui lòng chọn khách hàng hợp lệ"),
  branch_id: z.string().uuid("Vui lòng chọn cơ sở chăm sóc"),
  year: z.coerce
    .number()
    .int()
    .min(2020)
    .max(2100)
    .default(() => new Date().getFullYear()),
  channel: z.enum(greetingChannels),
  gift_description: z.string().optional().nullable().or(z.literal("")),
  auto_issue_voucher: z.boolean().default(false),
  voucher_discount_pct: z.coerce
    .number()
    .int()
    .min(1, "Chiết khấu tối thiểu 1%")
    .max(100, "Chiết khấu tối đa 100%")
    .default(15),
  note: z.string().optional().nullable().or(z.literal("")),
});

export type RecordBirthdayGreetingInput = z.infer<
  typeof recordBirthdayGreetingSchema
>;
