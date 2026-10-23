export interface GuestDocument {
  type: "cccd" | "cmnd" | "passport" | "other";
  country: string;
  number: string;
}

export interface GuestTierInfo {
  id: string;
  name: string;
  code: string;
  discount_pct: number;
  min_value: number;
  color?: string;
  benefits?: string[];
}

export interface GuestStats {
  total_stays: number;
  total_nights: number;
  total_spend?: number;
  first_stay_at: string | null;
  last_stay_at: string | null;
  last_branch_id: string | null;
  fav_branch_id: string | null;
}

export interface GuestStayItem {
  id: string;
  branch: string;
  room: string;
  status: "active" | "completed" | "cancelled";
  check_in_at: string;
  check_out_at: string;
  nights: number;
  source: string;
  partner?: string | null;
  entry_mode: string;
  is_primary: boolean;
}

export interface GuestCompanionItem {
  id: string;
  full_name: string;
  times: number;
}

export interface GuestNoteItem {
  id: string;
  kind: "general" | "preference" | "allergy" | "complaint" | "incident";
  body: string;
  branch?: string | null;
  author: string;
  author_id: string;
  at: string;
}

export interface GuestFlagItem {
  id: string;
  type: "blacklist" | "attention";
  status: "proposed" | "approved" | "removed";
  reason: string;
  branch: string;
  proposed_at: string;
  decided_at?: string | null;
}

export interface GuestPermissions {
  view_full: boolean;
  update: boolean;
  assign_owner: boolean;
  note: boolean;
  tag: boolean;
  propose_flag: boolean;
  propose_merge: boolean;
}

export interface GuestProfile {
  guest: {
    id: string;
    full_name: string;
    gender: "male" | "female" | "other";
    dob?: string | null;
    birth_year?: number | null;
    nationality: string;
    phone: string | null;
    phone_intl?: string | null;
    email: string | null;
    address_line?: string | null;
    province_code?: string | null;
    ward_code?: string | null;
    tags: string[] | null;
    created_at: string;
    updated_at: string;
    sales_owner?: {
      id: string;
      name: string;
    } | null;
    source_channel?: {
      id: string;
      name: string;
      kind: string;
    } | null;
  };
  tier?: GuestTierInfo | null;
  documents: GuestDocument[];
  stats?: GuestStats | null;
  stays: GuestStayItem[];
  companions: GuestCompanionItem[];
  notes: GuestNoteItem[];
  flags: GuestFlagItem[];
  consents: Record<string, boolean>;
  can: GuestPermissions;
  redirect_to?: string;
}

export interface GuestListItem {
  id: string;
  full_name: string;
  gender: "male" | "female" | "other";
  birth_year: number | null;
  phone: string | null;
  doc_masked: string | null;
  email: string | null;
  total_stays: number;
  total_nights: number;
  last_stay_at: string | null;
  last_branch_name: string | null;
  tier: string | null;
  tags: string[] | null;
  sales_owner_name: string | null;
  source_channel_name?: string | null;
  has_blacklist: boolean;
  has_attention: boolean;
}

export interface SalesUser {
  id: string;
  full_name: string;
  email: string;
}
