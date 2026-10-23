export interface MergeGuestSummary {
  id: string;
  full_name: string;
  phone: string | null;
  dob: string | null;
  email: string | null;
  nationality: string | null;
  address_line: string | null;
  tags: string[] | null;
  total_stays: number;
  total_nights: number;
  doc_masked: string | null;
}

export interface MergeRequestItem {
  id: string;
  keep_guest_id: string;
  drop_guest_id: string;
  source: "system" | "user";
  match_reason: "same_name_dob" | "cccd_one_digit" | "same_phone" | "manual";
  status: "pending" | "approved" | "rejected";
  created_at: string;
  proposed_by_name?: string | null;
  keep_guest: MergeGuestSummary;
  drop_guest: MergeGuestSummary;
}

export interface PendingFlagItem {
  id: string;
  guest_id: string;
  guest_name: string;
  guest_phone?: string | null;
  guest_doc_masked?: string | null;
  flag_type: "blacklist" | "attention";
  status: "proposed" | "approved" | "removed";
  reason: string;
  evidence_paths: string[];
  branch_id: string;
  branch_name: string;
  proposed_at: string;
  proposed_by_name?: string | null;
}
