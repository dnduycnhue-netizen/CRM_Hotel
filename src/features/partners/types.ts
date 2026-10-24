// src/features/partners/types.ts
// Các định nghĩa kiểu dữ liệu cho module Đối tác lữ hành & Khách đoàn (§7)

export type PartnerKind =
  | "travel_agency"
  | "tour_operator"
  | "corporate"
  | "ota"
  | "guide_driver"
  | "other";

export interface Partner {
  id: string;
  name: string;
  kind: PartnerKind;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  tax_code: string | null;
  address: string | null;
  bank_name: string | null;
  bank_account: string | null;
  bank_holder: string | null;
  credit_limit: number;
  payment_terms: string | null;
  note: string | null;
  is_active: boolean;
  created_at: string;
  // Computed / Joined
  active_contracts_count?: number;
  total_groups_count?: number;
  unpaid_commission_amount?: number;
}

export type ContractStatus = "active" | "expired" | "terminated";

export interface PartnerContract {
  id: string;
  partner_id: string;
  partner_name?: string;
  partner_kind?: PartnerKind;
  contract_number: string;
  valid_from: string; // YYYY-MM-DD
  valid_to: string; // YYYY-MM-DD
  discount_pct: number;
  commission_rate_pct: number;
  payment_terms: string | null;
  status: ContractStatus;
  attachment_url: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export type GroupBookingStatus =
  | "draft"
  | "confirmed"
  | "in_house"
  | "completed"
  | "cancelled";

export interface GroupBooking {
  id: string;
  code: string;
  branch_id: string;
  branch_name?: string;
  partner_id: string | null;
  partner_name?: string;
  group_name: string;
  leader_name: string;
  leader_phone: string | null;
  leader_email: string | null;
  expected_check_in_at: string;
  expected_check_out_at: string;
  actual_check_in_at: string | null;
  actual_check_out_at: string | null;
  rooms_count: number;
  guests_count: number;
  status: GroupBookingStatus;
  estimated_amount: number;
  deposit_amount: number;
  billing_note: string | null;
  note: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export type CommissionStatus = "pending" | "approved" | "paid" | "cancelled";

export interface PartnerCommission {
  id: string;
  partner_id: string;
  partner_name?: string;
  branch_id: string;
  branch_name?: string;
  stay_id: string | null;
  group_booking_id: string | null;
  group_code?: string;
  amount: number;
  rate_pct: number | null;
  base_revenue: number;
  status: CommissionStatus;
  paid_at: string | null;
  paid_by: string | null;
  paid_by_name?: string;
  note: string | null;
  created_at: string;
}

export interface PartnersOverviewStats {
  totalPartners: number;
  activePartners: number;
  activeContracts: number;
  activeGroups: number;
  totalRoomsInGroups: number;
  pendingCommissionAmount: number;
  paidCommissionAmount: number;
}

export interface BranchOption {
  id: string;
  name: string;
  code: string;
}
