import { z } from 'zod';

export const checkInSchema = z.object({
  branchId: z.string().uuid('Cơ sở phải là UUID hợp lệ'),
  roomId: z.string().uuid('Phòng phải là UUID hợp lệ'),
  guestId: z.string().uuid('Mã khách phải là UUID hợp lệ').optional().or(z.literal('')),
  fullName: z.string().min(2, 'Họ tên tối thiểu 2 ký tự').max(100),
  gender: z.enum(['male', 'female', 'other']).default('male'),
  dob: z.string().optional(),
  nationality: z.string().default('VN'),
  phone: z.string().min(10, 'SĐT tối thiểu 10 số').optional().or(z.literal('')),
  email: z.string().email('Email không đúng định dạng').optional().or(z.literal('')),
  documentType: z.enum(['cccd', 'passport']).default('cccd'),
  documentNumber: z.string().min(6, 'Số giấy tờ tối thiểu 6 ký tự').optional().or(z.literal('')),

  // Nguồn khách (bắt buộc)
  sourceChannelCode: z.string().min(1, 'Vui lòng chọn nguồn khách'),
  partnerId: z.string().uuid('Đối tác phải là UUID hợp lệ').optional().or(z.literal('')),

  // Thời gian
  expectedCheckOutAt: z.string().min(1, 'Ngày giờ dự kiến trả phòng không được để trống'),

  // Nhập bù quá khứ (dành riêng cho Quản lý)
  isBackdated: z.boolean().default(false),
  actualCheckInAt: z.string().optional(),
  actualCheckOutAt: z.string().optional(),

  // Xác nhận cảnh báo blacklist
  blacklistAck: z.boolean().default(false),

  notes: z.string().optional(),
});

export type CheckInInput = z.infer<typeof checkInSchema>;
