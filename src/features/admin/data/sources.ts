import { createClient } from "@/lib/supabase/server";

export interface SourceChannelItem {
  id: string;
  code: string;
  name: string;
  kind: "direct" | "ota" | "partner" | "corporate" | "other";
  requires_partner: boolean;
  is_active: boolean;
  sort: number;
}

export interface PartnerItem {
  id: string;
  name: string;
  kind:
    | "tour_operator"
    | "travel_agency"
    | "corporate"
    | "guide_driver"
    | "other";
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  tax_code: string | null;
  is_active: boolean;
}

export async function getSourceChannels(): Promise<SourceChannelItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("source_channels")
    .select("*")
    .order("sort", { ascending: true });

  if (error || !data) return [];
  return data as unknown as SourceChannelItem[];
}

export async function getPartnersList(): Promise<PartnerItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("partners")
    .select("*")
    .order("name", { ascending: true });

  if (error || !data) return [];
  return data as unknown as PartnerItem[];
}
