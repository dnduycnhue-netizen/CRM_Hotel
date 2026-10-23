import { createClient } from "@/lib/supabase/server";

export interface PmPlanItem {
  id: string;
  branch_id: string;
  branch_name: string;
  name: string;
  asset_name?: string | null;
  interval_days: number;
  lead_days: number;
  checklist: string[];
  vendor_name?: string | null;
  assignee_name?: string | null;
  next_due_date: string;
  last_done_date?: string | null;
  is_active: boolean;
}

export interface InspectionItem {
  id: string;
  branch_id: string;
  branch_name: string;
  template_name: string;
  room_number?: string | null;
  inspector_name: string;
  performed_at: string;
  passed: number;
  failed: number;
  score?: number | null;
  note?: string | null;
}

export async function getPmPlans(branchId?: string): Promise<PmPlanItem[]> {
  const supabase = await createClient();

  let query = supabase
    .from("pm_plans")
    .select(`
      id,
      branch_id,
      name,
      interval_days,
      lead_days,
      checklist,
      next_due_date,
      last_done_date,
      is_active,
      branch:branches(name),
      asset:assets(name),
      vendor:vendors(name),
      assignee:profiles!pm_plans_default_assignee_id_fkey(full_name)
    `)
    .order("next_due_date", { ascending: true });

  if (branchId) {
    query = query.eq("branch_id", branchId);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map((row: any) => ({
    id: row.id,
    branch_id: row.branch_id,
    branch_name: row.branch?.name || "",
    name: row.name,
    asset_name: row.asset?.name || null,
    interval_days: row.interval_days,
    lead_days: row.lead_days,
    checklist: row.checklist || [],
    vendor_name: row.vendor?.name || null,
    assignee_name: row.assignee?.full_name || null,
    next_due_date: row.next_due_date,
    last_done_date: row.last_done_date,
    is_active: row.is_active,
  }));
}

export async function getInspections(
  branchId?: string,
): Promise<InspectionItem[]> {
  const supabase = await createClient();

  let query = supabase
    .from("inspections")
    .select(`
      id,
      branch_id,
      performed_at,
      passed,
      failed,
      score,
      note,
      branch:branches(name),
      template:checklist_templates(name),
      room:rooms(number),
      inspector:profiles(full_name)
    `)
    .order("performed_at", { ascending: false })
    .limit(50);

  if (branchId) {
    query = query.eq("branch_id", branchId);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map((row: any) => ({
    id: row.id,
    branch_id: row.branch_id,
    branch_name: row.branch?.name || "",
    template_name: row.template?.name || "Mẫu kiểm tra",
    room_number: row.room?.number || null,
    inspector_name: row.inspector?.full_name || "Kỹ thuật viên",
    performed_at: row.performed_at,
    passed: row.passed,
    failed: row.failed,
    score: row.score ? Number(row.score) : null,
    note: row.note,
  }));
}
