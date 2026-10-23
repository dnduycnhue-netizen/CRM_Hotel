import { createClient } from "@/lib/supabase/server";
import type { GuestListItem, GuestProfile, SalesUser } from "../types";

export async function getGuestProfile(
  id: string,
): Promise<GuestProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_guest_profile", {
    p_guest_id: id,
  });

  if (error || !data) {
    return null;
  }

  // Handle merged guest redirection if any
  if (data.redirect_to) {
    return getGuestProfile(data.redirect_to);
  }

  return data as GuestProfile;
}

export async function getGuestsList(options?: {
  tier?: string;
  salesOwnerId?: string;
  tag?: string;
  limit?: number;
  branchId?: string;
}): Promise<GuestListItem[]> {
  const supabase = await createClient();
  const limit = options?.limit || 50;

  const { data, error } = await (supabase.rpc as any)("get_guests_list", {
    p_limit: limit,
    p_sales_owner_id: options?.salesOwnerId || null,
    p_tag: options?.tag || null,
    p_branch_id: options?.branchId || null,
  });

  if (error || !data) {
    return [];
  }

  return (data as any[]).map((g) => ({
    id: g.id,
    full_name: g.full_name,
    gender: g.gender,
    birth_year:
      g.dob && !isNaN(new Date(g.dob).getTime())
        ? new Date(g.dob).getFullYear()
        : null,
    phone: g.phone,
    doc_masked: g.doc_number || null,
    email: g.email,
    total_stays: g.total_stays || 0,
    total_nights: g.total_nights || 0,
    last_stay_at: g.last_stay_at || null,
    last_branch_name: g.last_branch_name || null,
    tier: null,
    tags: g.tags || [],
    sales_owner_name: g.sales_owner_name || null,
    has_blacklist: false,
    has_attention: false,
  }));
}

export async function getSalesUsers(): Promise<SalesUser[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("is_active", true)
    .order("full_name");

  if (error || !data) return [];
  return data as unknown as SalesUser[];
}
