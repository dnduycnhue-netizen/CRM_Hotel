export interface GuestDocument {
  type: "cccd" | "cmnd" | "passport" | "other";
  country: string;
  number: string;
}

export interface GuestTierInfo {
  tier_id?: string;
  id?: string;
  name: string;
  code?: string;
  tier?: string;
  discount_pct: number;
  min_value?: number;
  color?: string;
  benefits?: string[] | null;
  policy_id?: string;
  policy_name?: string;
  basis?: "stays" | "nights";
  current_value?: number;
  value?: number;
  next_tier_name?: string | null;
  next_tier_min?: number | null;
  value_needed?: number | null;
  next?: {
    name: string;
    remaining: number;
    discount_pct: number;
  } | null;
  is_override?: boolean;
  source?: string;
}

export interface GuestTierEventItem {
  id: string;
  from_tier: string | null;
  to_tier: string;
  kind:
    | "upgrade"
    | "downgrade"
    | "manual_override"
    | "override_expired"
    | "policy_change";
  policy_name: string;
  actor: string | null;
  note: string | null;
  at: string;
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
  branch_id?: string;
  room: string;
  room_number?: string;
  status: "active" | "completed" | "cancelled" | "in_house" | "checked_out";
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
  last_stay_at?: string | null;
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
  override_tier?: boolean;
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
    tier_override_code?: string | null;
    tier_override_until?: string | null;
    tier_override_reason?: string | null;
  };
  tier?: GuestTierInfo | null;
  tier_events?: GuestTierEventItem[];
  documents: GuestDocument[];
  stats?: GuestStats | null;
  stays: GuestStayItem[];
  companions: GuestCompanionItem[];
  notes: GuestNoteItem[];
  flags: GuestFlagItem[];
  consents: Record<string, boolean>;
  consent_events?: ConsentHistoryItem[];
  can: GuestPermissions;
  redirect_to?: string;
}

export type ConsentChannel = "zalo" | "sms" | "email" | "phone";

export interface ConsentHistoryItem {
  id: number;
  channel: ConsentChannel;
  granted: boolean;
  source: string;
  recorded_by?: string | null;
  recorded_by_name?: string | null;
  recorded_at: string;
  note?: string | null;
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
  sales_owner_id?: string | null;
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
