// src/features/prospects/types.ts
// Kiểu dữ liệu cho module Khách hàng tiềm năng B2B (công ty tour chưa hợp tác)

import type {
  prospectChannels,
  prospectKinds,
  prospectOutcomes,
  prospectPriorities,
  prospectStatuses,
} from "./schemas";

export type ProspectKind = (typeof prospectKinds)[number];
export type ProspectStatus = (typeof prospectStatuses)[number];
export type ProspectPriority = (typeof prospectPriorities)[number];
export type ProspectChannel = (typeof prospectChannels)[number];
export type ProspectOutcome = (typeof prospectOutcomes)[number];

/** Một dòng từ RPC get_prospects / get_prospect_detail (SĐT đã che theo luật). */
export interface Prospect {
  id: string;
  company_name: string;
  kind: ProspectKind;
  tax_code: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  province: string | null;
  /** SĐT hiển thị: đầy đủ nếu là người phụ trách / quản lý, ngược lại dạng che */
  phone_display: string | null;
  contact_phone_display: string | null;
  is_masked: boolean;
  contact_name: string | null;
  contact_title: string | null;
  source: string | null;
  estimated_groups_per_year: number | null;
  estimated_guests_per_year: number | null;
  assigned_to: string | null;
  assigned_to_name: string | null;
  status: ProspectStatus;
  lost_reason: string | null;
  duplicate_of_id: string | null;
  priority: ProspectPriority;
  note: string | null;
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
  dup_override_reason: string | null;
  dup_reviewed: boolean;
  converted_partner_id: string | null;
  converted_partner_name: string | null;
  converted_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
  is_overdue: boolean;
  can_edit: boolean;
  /** Chưa có người phụ trách và người xem được phép tự nhận chăm sóc */
  can_claim: boolean;
  interaction_count: number;
}

export interface ProspectInteraction {
  id: string;
  entry_type: "contact" | "status_change" | "system";
  channel: ProspectChannel | null;
  outcome: ProspectOutcome | null;
  note: string | null;
  next_follow_up_at: string | null;
  created_at: string;
  created_by_name: string | null;
}

export interface ProspectDetail {
  prospect: Prospect;
  duplicate_of: { id: string; name: string } | null;
  interactions: ProspectInteraction[];
}

export interface ProspectAssignee {
  id: string;
  name: string;
}

export interface ProspectsOverview {
  total: number;
  in_trash?: number;
  by_status: Partial<Record<ProspectStatus, number>>;
  overdue: number;
  dup_pending: number;
  /** % chuyển đổi trên tổng đã kết thúc (converted / (converted + lost)); null nếu chưa có */
  conversion_rate: number | null;
  top_sales: Array<{ user_id: string; name: string; converted: number }>;
  assignees: ProspectAssignee[];
}

export type DuplicateMatchType =
  | "hard_tax"
  | "hard_phone"
  | "soft_name"
  | "soft_domain"
  | "soft_guest_phone";

export interface DuplicateCandidate {
  match_type: DuplicateMatchType;
  source: "prospect" | "partner" | "guest" | "file";
  id?: string;
  name: string;
  status?: string | null;
  phone?: string | null;
}

export interface ProspectFilters {
  search?: string;
  status?: ProspectStatus | "";
  kind?: ProspectKind | "";
  province?: string;
  assigned_to?: string;
  overdue_only?: boolean;
  dup_pending?: boolean;
  in_trash?: boolean;
}

export type SaveProspectOutcome =
  | { status: "saved"; id: string; notices: DuplicateCandidate[] }
  | { status: "possible_duplicates"; candidates: DuplicateCandidate[] }
  | {
      status: "blocked";
      reason: "tax" | "phone";
      message: string;
      duplicate: {
        source: "prospect" | "partner";
        id: string;
        name: string;
      } | null;
    };

export type ConvertProspectOutcome =
  | { status: "converted"; partner_id: string; already_converted: boolean }
  | {
      status: "duplicate_partner";
      message: string;
      partner: { id: string; name: string } | null;
    };

export type ImportClassification = "new" | "soft" | "hard" | "invalid";

export interface ImportPreviewRow {
  row_id: string;
  classification: ImportClassification;
  message: string | null;
  hard: {
    match_type: DuplicateMatchType;
    source: "prospect" | "partner" | "file";
    id?: string;
    name: string;
  } | null;
  candidates: DuplicateCandidate[];
}

export interface ImportCommitReport {
  created: number;
  skipped_hard: number;
  skipped_needs_reason: number;
  failed: number;
  results: Array<{
    row_id: string;
    result: "created" | "hard" | "needs_reason" | "failed";
    message?: string;
  }>;
}
