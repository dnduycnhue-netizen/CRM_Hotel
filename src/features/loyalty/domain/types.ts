export type LoyaltyBasis = "stays" | "nights";
export type LoyaltyPolicyStatus = "draft" | "active" | "archived";

export interface LoyaltyPolicy {
  id: string;
  name: string;
  validFrom: string;
  validTo: string | null;
  basis: LoyaltyBasis;
  windowMonths: number;
  countCurrentStay: boolean;
  companionsCountDefault: boolean;
  status: LoyaltyPolicyStatus;
  note: string | null;
  createdBy?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoyaltyTierItem {
  id?: string;
  policyId: string;
  code: string;
  name: string;
  minValue: number;
  discountPct: number;
  benefits?: string | null;
  color?: string | null;
  sort?: number;
  isActive?: boolean;
}

export interface PolicyPreviewResult {
  totalGuests: number;
  upgrades: number;
  downgrades: number;
  unchanged: number;
  countsByTier: Record<string, number>;
  error?: string;
}

export interface GuestTierInfo {
  policyId?: string;
  policyName?: string;
  tierId: string | null;
  tier: string;
  name: string;
  discountPct: number;
  benefits?: string | null;
  color?: string | null;
  source: "earned" | "manual" | "none";
  value: number;
  basis: LoyaltyBasis;
  next?: {
    name: string;
    remaining: number;
    discountPct: number;
  } | null;
}
