import { z } from "zod";

export const partnerKinds = [
  "travel_agency",
  "tour_operator",
  "corporate",
  "ota",
  "guide_driver",
  "other",
] as const;

export const partnerKindLabels: Record<(typeof partnerKinds)[number], string> =
  {
    travel_agency: "Đại lý du lịch (Travel Agency)",
    tour_operator: "Công ty lữ hành (Tour Operator)",
    corporate: "Khách hàng doanh nghiệp (Corporate)",
    ota: "Đại lý trực tuyến (OTA)",
    guide_driver: "Hướng dẫn viên / Lái xe",
    other: "Khác",
  };

export const savePartnerSchema = z.object({
  id: z.string().uuid().optional().nullable().or(z.literal("")),
  name: z
    .string()
    .min(2, "Tên đối tác tối thiểu 2 ký tự")
    .max(150, "Tên đối tác tối đa 150 ký tự"),
  kind: z.enum(partnerKinds),
  contact_name: z.string().optional().nullable().or(z.literal("")),
  phone: z.string().optional().nullable().or(z.literal("")),
  email: z
    .string()
    .email("Email không đúng định dạng")
    .optional()
    .nullable()
    .or(z.literal("")),
  tax_code: z.string().optional().nullable().or(z.literal("")),
  address: z.string().optional().nullable().or(z.literal("")),
  bank_name: z.string().optional().nullable().or(z.literal("")),
  bank_account: z.string().optional().nullable().or(z.literal("")),
  bank_holder: z.string().optional().nullable().or(z.literal("")),
  credit_limit: z.coerce
    .number()
    .min(0, "Hạn mức công nợ không được âm")
    .default(0),
  payment_terms: z.string().optional().nullable().or(z.literal("")),
  note: z.string().optional().nullable().or(z.literal("")),
  is_active: z.boolean().default(true),
});

export type SavePartnerInput = z.infer<typeof savePartnerSchema>;

export const contractStatuses = ["active", "expired", "terminated"] as const;

export const contractStatusLabels: Record<
  (typeof contractStatuses)[number],
  string
> = {
  active: "Đang hiệu lực",
  expired: "Đã hết hạn",
  terminated: "Đã thanh lý",
};

export const savePartnerContractSchema = z
  .object({
    id: z.string().uuid().optional().nullable().or(z.literal("")),
    partner_id: z.string().uuid("Vui lòng chọn đối tác hợp lệ"),
    contract_number: z
      .string()
      .min(2, "Số hợp đồng tối thiểu 2 ký tự")
      .max(100, "Số hợp đồng tối đa 100 ký tự"),
    valid_from: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày hiệu lực định dạng YYYY-MM-DD"),
    valid_to: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày hết hạn định dạng YYYY-MM-DD"),
    discount_pct: z.coerce
      .number()
      .int("Tỷ lệ chiết khấu phải là số nguyên")
      .min(0, "Chiết khấu tối thiểu 0%")
      .max(100, "Chiết khấu tối đa 100%")
      .default(0),
    commission_rate_pct: z.coerce
      .number()
      .int("Tỷ lệ hoa hồng phải là số nguyên")
      .min(0, "Hoa hồng tối thiểu 0%")
      .max(100, "Hoa hồng tối đa 100%")
      .default(0),
    payment_terms: z.string().optional().nullable().or(z.literal("")),
    status: z.enum(contractStatuses).default("active"),
    attachment_url: z.string().optional().nullable().or(z.literal("")),
    note: z.string().optional().nullable().or(z.literal("")),
  })
  .refine((data) => data.valid_to >= data.valid_from, {
    message: "Ngày hết hạn hợp đồng phải sau hoặc cùng ngày hiệu lực",
    path: ["valid_to"],
  });

export type SavePartnerContractInput = z.infer<
  typeof savePartnerContractSchema
>;

export const groupBookingStatuses = [
  "draft",
  "confirmed",
  "in_house",
  "completed",
  "cancelled",
] as const;

export const groupBookingStatusLabels: Record<
  (typeof groupBookingStatuses)[number],
  string
> = {
  draft: "Báo giá / Dự thảo",
  confirmed: "Đã xác nhận",
  in_house: "Đang lưu trú",
  completed: "Đã hoàn thành",
  cancelled: "Đã hủy",
};

export const saveGroupBookingSchema = z
  .object({
    id: z.string().uuid().optional().nullable().or(z.literal("")),
    branch_id: z.string().uuid("Vui lòng chọn chi nhánh cơ sở"),
    partner_id: z.string().uuid().optional().nullable().or(z.literal("")),
    group_name: z
      .string()
      .min(2, "Tên đoàn tối thiểu 2 ký tự")
      .max(150, "Tên đoàn tối đa 150 ký tự"),
    leader_name: z
      .string()
      .min(2, "Họ tên trưởng đoàn/HDV tối thiểu 2 ký tự")
      .max(100, "Họ tên trưởng đoàn tối đa 100 ký tự"),
    leader_phone: z.string().optional().nullable().or(z.literal("")),
    leader_email: z
      .string()
      .email("Email không đúng định dạng")
      .optional()
      .nullable()
      .or(z.literal("")),
    expected_check_in_at: z
      .string()
      .min(1, "Vui lòng chọn ngày giờ đến dự kiến"),
    expected_check_out_at: z
      .string()
      .min(1, "Vui lòng chọn ngày giờ đi dự kiến"),
    rooms_count: z.coerce
      .number()
      .int("Số phòng phải là số nguyên")
      .min(1, "Số phòng tối thiểu là 1")
      .default(1),
    guests_count: z.coerce
      .number()
      .int("Số lượng khách phải là số nguyên")
      .min(1, "Số khách tối thiểu là 1")
      .default(1),
    status: z.enum(groupBookingStatuses).default("confirmed"),
    estimated_amount: z.coerce
      .number()
      .min(0, "Dự toán doanh thu không được âm")
      .default(0),
    deposit_amount: z.coerce
      .number()
      .min(0, "Tiền tạm ứng không được âm")
      .default(0),
    billing_note: z.string().optional().nullable().or(z.literal("")),
    note: z.string().optional().nullable().or(z.literal("")),
  })
  .refine(
    (data) =>
      new Date(data.expected_check_out_at) >=
      new Date(data.expected_check_in_at),
    {
      message: "Ngày giờ trả phòng phải sau ngày giờ nhận phòng",
      path: ["expected_check_out_at"],
    },
  );

export type SaveGroupBookingInput = z.infer<typeof saveGroupBookingSchema>;

export const commissionStatuses = [
  "pending",
  "approved",
  "paid",
  "cancelled",
] as const;

export const commissionStatusLabels: Record<
  (typeof commissionStatuses)[number],
  string
> = {
  pending: "Chờ phê duyệt",
  approved: "Đã duyệt, chờ chi",
  paid: "Đã thanh toán",
  cancelled: "Đã hủy bỏ",
};

export const decideCommissionSchema = z.object({
  id: z.string().uuid("ID hoa hồng không hợp lệ"),
  action: z.enum(["approve", "pay", "cancel"]),
  note: z.string().optional().nullable().or(z.literal("")),
});

export type DecideCommissionInput = z.infer<typeof decideCommissionSchema>;
