import { createClient } from "@/lib/supabase/server";
import type {
  MergeGuestSummary,
  MergeRequestItem,
  PendingFlagItem,
} from "../types";

export async function getPendingMergeRequests(): Promise<MergeRequestItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("merge_requests")
    .select(`
      id,
      keep_guest_id,
      drop_guest_id,
      source,
      match_reason,
      status,
      created_at,
      proposer:profiles!merge_requests_proposed_by_fkey(full_name),
      keep_guest:guests!merge_requests_keep_guest_id_fkey(
        id, full_name, phone, dob, email, nationality, address_line, tags,
        stats:guest_stats(total_stays, total_nights)
      ),
      drop_guest:guests!merge_requests_drop_guest_id_fkey(
        id, full_name, phone, dob, email, nationality, address_line, tags,
        stats:guest_stats(total_stays, total_nights)
      )
    `)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  const mapGuest = (g: any): MergeGuestSummary => {
    const stats = Array.isArray(g?.stats) ? g.stats[0] : g?.stats;
    const doc = Array.isArray(g?.documents) ? g.documents[0] : g?.documents;
    return {
      id: g?.id || "",
      full_name: g?.full_name || "",
      phone: g?.phone || null,
      dob: g?.dob || null,
      email: g?.email || null,
      nationality: g?.nationality || "VN",
      address_line: g?.address_line || null,
      tags: g?.tags || [],
      total_stays: stats?.total_stays || 0,
      total_nights: stats?.total_nights || 0,
      doc_masked: doc?.doc_number
        ? doc.doc_number.length > 6
          ? `${doc.doc_number.slice(0, 3)}******${doc.doc_number.slice(-3)}`
          : "***"
        : null,
    };
  };

  return data.map((r: any) => {
    const proposer = Array.isArray(r.proposer) ? r.proposer[0] : r.proposer;
    return {
      id: r.id,
      keep_guest_id: r.keep_guest_id,
      drop_guest_id: r.drop_guest_id,
      source: r.source,
      match_reason: r.match_reason,
      status: r.status,
      created_at: r.created_at,
      proposed_by_name: proposer?.full_name || "Hệ thống tự quét",
      keep_guest: mapGuest(r.keep_guest),
      drop_guest: mapGuest(r.drop_guest),
    };
  });
}

export async function getPendingFlags(): Promise<PendingFlagItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("guest_flags")
    .select(`
      id,
      guest_id,
      guest:guests!guest_flags_guest_id_fkey(full_name, phone),
      flag_type,
      status,
      reason,
      evidence_paths,
      branch_id,
      branch:branches!guest_flags_branch_id_fkey(name),
      proposed_at,
      proposer:profiles!guest_flags_proposed_by_fkey(full_name)
    `)
    .eq("status", "proposed")
    .order("proposed_at", { ascending: false });

  if (error || !data) return [];

  return data.map((f: any) => {
    const guest = Array.isArray(f.guest) ? f.guest[0] : f.guest;
    const branch = Array.isArray(f.branch) ? f.branch[0] : f.branch;
    const proposer = Array.isArray(f.proposer) ? f.proposer[0] : f.proposer;

    return {
      id: f.id,
      guest_id: f.guest_id,
      guest_name: guest?.full_name || "Khách",
      guest_phone: guest?.phone || null,
      guest_doc_masked: null,
      flag_type: f.flag_type,
      status: f.status,
      reason: f.reason,
      evidence_paths: f.evidence_paths || [],
      branch_id: f.branch_id,
      branch_name: branch?.name || "",
      proposed_at: f.proposed_at,
      proposed_by_name: proposer?.full_name || "Nhân viên",
    };
  });
}

export async function getActiveBlacklist(): Promise<PendingFlagItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("guest_flags")
    .select(`
      id,
      guest_id,
      guest:guests!guest_flags_guest_id_fkey(full_name, phone),
      flag_type,
      status,
      reason,
      evidence_paths,
      branch_id,
      branch:branches!guest_flags_branch_id_fkey(name),
      proposed_at,
      proposer:profiles!guest_flags_proposed_by_fkey(full_name)
    `)
    .eq("status", "approved")
    .order("proposed_at", { ascending: false });

  if (error || !data) return [];

  return data.map((f: any) => {
    const guest = Array.isArray(f.guest) ? f.guest[0] : f.guest;
    const doc = Array.isArray(guest?.documents)
      ? guest.documents[0]
      : guest?.documents;
    const branch = Array.isArray(f.branch) ? f.branch[0] : f.branch;
    const proposer = Array.isArray(f.proposer) ? f.proposer[0] : f.proposer;

    return {
      id: f.id,
      guest_id: f.guest_id,
      guest_name: guest?.full_name || "Khách",
      guest_phone: guest?.phone || null,
      guest_doc_masked: doc?.doc_number
        ? doc.doc_number.length > 6
          ? `${doc.doc_number.slice(0, 3)}******${doc.doc_number.slice(-3)}`
          : "***"
        : null,
      flag_type: f.flag_type,
      status: f.status,
      reason: f.reason,
      evidence_paths: f.evidence_paths || [],
      branch_id: f.branch_id,
      branch_name: branch?.name || "",
      proposed_at: f.proposed_at,
      proposed_by_name: proposer?.full_name || "Nhân viên",
    };
  });
}
