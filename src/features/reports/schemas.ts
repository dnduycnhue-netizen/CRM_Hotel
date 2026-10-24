import { z } from "zod";

export const monthlyFiguresRowSchema = z
  .object({
    branch_id: z.string().uuid("branch_id phải là UUID hợp lệ"),
    month: z
      .string()
      .regex(/^\d{4}-\d{2}-01$/, "Tháng phải có định dạng YYYY-MM-01"),
    arrivals: z.number().int().min(0, "Lượt đến không được âm").nullable(),
    guests: z.number().int().min(0, "Số khách không được âm").nullable(),
    room_nights: z
      .number()
      .int()
      .min(0, "Đêm phòng đã bán không được âm")
      .nullable(),
    available_room_nights: z
      .number()
      .int()
      .min(1, "Đêm phòng khả dụng phải lớn hơn 0")
      .nullable(),
    room_revenue: z
      .number()
      .min(0, "Doanh thu phòng không được âm")
      .nullable(),
    other_revenue: z
      .number()
      .min(0, "Doanh thu khác không được âm")
      .nullable(),
    note: z.string().max(1000, "Ghi chú tối đa 1000 ký tự").nullable().optional(),
  })
  .refine(
    (data) => {
      if (
        data.room_nights !== null &&
        data.available_room_nights !== null &&
        data.room_nights > data.available_room_nights
      ) {
        return false;
      }
      return true;
    },
    {
      message: "Số đêm phòng bán không được lớn hơn số đêm phòng khả dụng",
      path: ["room_nights"],
    },
  );

export const saveMonthlyFiguresSchema = z.object({
  rows: z
    .array(monthlyFiguresRowSchema)
    .min(1, "Phải có ít nhất 1 cơ sở để lưu số liệu"),
});

export const lockMonthlyFiguresSchema = z.object({
  branch_id: z.string().uuid("branch_id phải là UUID hợp lệ"),
  month: z
    .string()
    .regex(/^\d{4}-\d{2}-01$/, "Tháng phải có định dạng YYYY-MM-01"),
});

export const unlockMonthlyFiguresSchema = z.object({
  branch_id: z.string().uuid("branch_id phải là UUID hợp lệ"),
  month: z
    .string()
    .regex(/^\d{4}-\d{2}-01$/, "Tháng phải có định dạng YYYY-MM-01"),
  reason: z
    .string()
    .trim()
    .min(10, "Lý do mở khóa phải từ 10 ký tự trở lên")
    .max(500, "Lý do tối đa 500 ký tự"),
});

export type MonthlyFiguresRowInput = z.infer<typeof monthlyFiguresRowSchema>;
export type SaveMonthlyFiguresInput = z.infer<typeof saveMonthlyFiguresSchema>;
export type LockMonthlyFiguresInput = z.infer<typeof lockMonthlyFiguresSchema>;
export type UnlockMonthlyFiguresInput = z.infer<typeof unlockMonthlyFiguresSchema>;
