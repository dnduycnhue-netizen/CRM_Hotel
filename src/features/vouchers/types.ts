// src/features/vouchers/types.ts
// Các định nghĩa kiểu dữ liệu cho module Sinh nhật & Voucher ưu đãi (§9)

export type DiscountType = "percent" | "fixed_amount";
export type VoucherStatus = "active" | "disabled" | "expired";
export type GreetingChannel =
  | "phone"
  | "sms"
  | "zalo"
  | "email"
  | "in_person"
  | "gift";
export type GreetingStatus = "planned" | "sent" | "cancelled";

export interface Voucher {
  id: string;
  code: string;
  title: string;
  discount_type: DiscountType;
  discount_value: number;
  max_discount_amount: number | null;
  min_spend_amount: number;
  valid_from: string; // YYYY-MM-DD
  valid_to: string; // YYYY-MM-DD
  usage_limit: number;
  used_count: number;
  target_guest_id: string | null;
  target_guest_name?: string | null;
  applicable_branch_id: string | null;
  applicable_branch_name?: string | null;
  status: VoucherStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface VoucherRedemption {
  id: string;
  voucher_id: string;
  voucher_code?: string;
  voucher_title?: string;
  guest_id: string;
  guest_name?: string;
  stay_id: string | null;
  branch_id: string;
  branch_name?: string;
  discount_applied: number;
  redeemed_at: string;
  note: string | null;
}

export interface UpcomingBirthdayGuest {
  guest_id: string;
  full_name: string;
  dob: string;
  phone: string | null;
  email: string | null;
  gender: string;
  days_until: number;
  birthday_this_year: string;
  age: number;
  marketing_consent: boolean;
  tier_code: string | null;
  tier_name: string | null;
  total_stays: number;
  last_stay_date: string | null;
  last_branch_name: string | null;
  greeting_status: GreetingStatus | null;
  greeting_channel: GreetingChannel | null;
  greeting_gift: string | null;
  greeting_voucher_code: string | null;
}

export interface RewardsOverviewStats {
  birthdaysNext7Days: number;
  birthdaysNext30Days: number;
  greetingsSentThisMonth: number;
  activeVouchersCount: number;
  totalVouchersRedeemed: number;
  totalDiscountGiven: number;
}
