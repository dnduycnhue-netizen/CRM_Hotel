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
  template_id?: string | null;
  default_assignee_id?: string | null;
  vendor_id?: string | null;
}

export interface ChecklistItemDef {
  key: string;
  label: string;
  critical?: boolean;
  hint?: string | null;
}

export interface ChecklistTemplateItem {
  id: string;
  name: string;
  scope: "room" | "area" | "fire_safety" | "other";
  items: ChecklistItemDef[];
  is_active: boolean;
  created_at: string;
  usage_count?: number;
}

export interface InspectionItem {
  id: string;
  branch_id: string;
  branch_name: string;
  template_id?: string;
  template_name: string;
  room_id?: string | null;
  room_number?: string | null;
  location_id?: string | null;
  location_name?: string | null;
  inspector_name: string;
  performed_at: string;
  passed: number;
  failed: number;
  score?: number | null;
  note?: string | null;
  results?: Array<{
    key: string;
    status: "pass" | "fail" | "na";
    note?: string | null;
    photo_path?: string | null;
  }>;
  work_order_count?: number;
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
      template_id,
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
    template_id: row.template_id || null,
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

export async function getChecklistTemplates(
  scope?: string,
): Promise<ChecklistTemplateItem[]> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase.rpc("get_checklist_templates", {
      p_scope: scope || null,
    });

    if (error || !data) return [];
    return (data as any[]).map((row) => ({
      id: row.id,
      name: row.name,
      scope: row.scope,
      items: row.items || [],
      is_active: row.is_active,
      created_at: row.created_at,
      usage_count: Number(row.usage_count || 0),
    }));
  } catch {
    return [];
  }
}

export async function getInspectionsList(
  branchId?: string,
  limit: number = 50,
): Promise<InspectionItem[]> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase.rpc("get_inspections_list", {
      p_branch_id: branchId || null,
      p_limit: limit,
    });

    if (error || !data) return [];
    return (data as any[]).map((row) => ({
      id: row.id,
      branch_id: row.branch_id,
      branch_name: row.branch_name,
      template_id: row.template_id,
      template_name: row.template_name,
      room_id: row.room_id,
      room_number: row.room_number,
      location_id: row.location_id,
      location_name: row.location_name,
      inspector_name: row.inspector_name || "Kỹ thuật viên",
      performed_at: row.performed_at,
      passed: row.passed,
      failed: row.failed,
      score: row.score !== null ? Number(row.score) : null,
      note: row.note,
      results: row.results,
      work_order_count: Number(row.work_order_count || 0),
    }));
  } catch {
    return [];
  }
}
