import { z } from 'zod';

export const createGuestSchema = z.object({
  full_name: z.string().min(2, 'Họ tên tối thiểu 2 ký tự').max(100, 'Họ tên tối đa 100 ký tự'),
  gender: z.enum(['male', 'female', 'other']).default('other'),
  nationality: z.string().length(2, 'Mã quốc gia 2 ký tự (VD: VN)').default('VN'),
  phone: z.string().optional().nullable(),
  email: z.string().email('Email không đúng định dạng').optional().nullable().or(z.literal('')),
  address_line: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  document: z
    .object({
      type: z.enum(['cccd', 'cmnd', 'passport', 'other']),
      number: z.string().min(4, 'Số giấy tờ tối thiểu 4 ký tự'),
      country: z.string().default('VN'),
    })
    .optional()
    .nullable(),
});

export const updateGuestSchema = z.object({
  full_name: z.string().min(2).max(100).optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  dob: z.string().optional().nullable(),
  nationality: z.string().length(2).optional(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  address_line: z.string().optional().nullable(),
  province_code: z.string().optional().nullable(),
  ward_code: z.string().optional().nullable(),
});

export const addGuestNoteSchema = z.object({
  guest_id: z.string().uuid(),
  branch_id: z.string().uuid().optional().nullable(),
  kind: z.enum(['general', 'preference', 'allergy', 'complaint', 'incident']).default('general'),
  body: z.string().min(1, 'Nội dung ghi chú không được trống').max(2000, 'Tối đa 2000 ký tự'),
});

export type CreateGuestInput = z.infer<typeof createGuestSchema>;
export type UpdateGuestInput = z.infer<typeof updateGuestSchema>;
export type AddGuestNoteInput = z.infer<typeof addGuestNoteSchema>;
