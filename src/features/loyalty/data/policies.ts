import { createClient } from "@/lib/supabase/server";
import type { LoyaltyPolicy, LoyaltyTierItem } from "../domain/types";

export async function getLoyaltyPolicies(): Promise<LoyaltyPolicy[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await (supabase.from("loyalty_policies") as any)
      .select("*")
      .order("valid_from", { ascending: false });

    if (error || !data) {
      console.error("getLoyaltyPolicies error:", error);
      return [];
    }

    return (data as any[]).map(mapPolicy);
  } catch (err) {
    console.error("getLoyaltyPolicies exception:", err);
    return [];
  }
}

export async function getActiveLoyaltyPolicy(): Promise<LoyaltyPolicy | null> {
  try {
    const supabase = await createClient();
    const today = new Date().toISOString().split("T")[0];

    // Tìm chính sách active phù hợp ngày hôm nay
    const { data, error } = await (supabase.from("loyalty_policies") as any)
      .select("*")
      .eq("status", "active")
      .lte("valid_from", today)
      .or(`valid_to.is.null,valid_to.gte.${today}`)
      .order("valid_from", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      return mapPolicy(data);
    }

    // Fallback: chính sách active bất kỳ
    const { data: fallback } = await (supabase.from("loyalty_policies") as any)
      .select("*")
      .eq("status", "active")
      .order("valid_from", { ascending: false })
      .limit(1)
      .maybeSingle();

    return fallback ? mapPolicy(fallback) : null;
  } catch (err) {
    console.error("getActiveLoyaltyPolicy exception:", err);
    return null;
  }
}

export async function getPolicyTiers(
  policyId: string,
): Promise<LoyaltyTierItem[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await (supabase.from("loyalty_tiers") as any)
      .select("*")
      .eq("policy_id", policyId)
      .order("min_value", { ascending: true });

    if (error || !data) {
      console.error("getPolicyTiers error:", error);
      return [];
    }

    return (data as any[]).map(mapTier);
  } catch (err) {
    console.error("getPolicyTiers exception:", err);
    return [];
  }
}

export async function getPolicyWithTiers(policyId: string): Promise<{
  policy: LoyaltyPolicy | null;
  tiers: LoyaltyTierItem[];
}> {
  try {
    const supabase = await createClient();
    const [{ data: policyData }, { data: tiersData }] = await Promise.all([
      (supabase.from("loyalty_policies") as any)
        .select("*")
        .eq("id", policyId)
        .maybeSingle(),
      (supabase.from("loyalty_tiers") as any)
        .select("*")
        .eq("policy_id", policyId)
        .order("min_value", { ascending: true }),
    ]);

    return {
      policy: policyData ? mapPolicy(policyData) : null,
      tiers: (tiersData || []).map(mapTier),
    };
  } catch (err) {
    console.error("getPolicyWithTiers exception:", err);
    return { policy: null, tiers: [] };
  }
}

function mapPolicy(row: any): LoyaltyPolicy {
  return {
    id: row.id,
    name: row.name,
    validFrom:
      typeof row.valid_from === "string"
        ? row.valid_from.split("T")[0]
        : row.valid_from,
    validTo: row.valid_to
      ? typeof row.valid_to === "string"
        ? row.valid_to.split("T")[0]
        : row.valid_to
      : null,
    basis: row.basis || "stays",
    windowMonths: Number(row.window_months ?? 24),
    countCurrentStay: Boolean(row.count_current_stay),
    companionsCountDefault: Boolean(row.companions_count_default ?? true),
    status: row.status || "draft",
    note: row.note ?? null,
    createdBy: row.created_by ?? null,
    approvedBy: row.approved_by ?? null,
    approvedAt: row.approved_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTier(row: any): LoyaltyTierItem {
  return {
    id: row.id,
    policyId: row.policy_id,
    code: row.code,
    name: row.name,
    minValue: Number(row.min_value ?? 0),
    discountPct: Number(row.discount_pct ?? 0),
    benefits: row.benefits ?? null,
    color: row.color ?? "#64748B",
    sort: Number(row.sort ?? 0),
    isActive: Boolean(row.is_active ?? true),
  };
}
