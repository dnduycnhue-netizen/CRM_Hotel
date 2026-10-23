import { createClient } from "@/lib/supabase/server";
import type { AuditFilterParams, AuditLogItem } from "../types";

export async function getAuditLogs(
  params: AuditFilterParams = {},
): Promise<AuditLogItem[]> {
  const supabase = await createClient();

  let query = supabase
    .from("audit_logs")
    .select(
      "id, occurred_at, actor_id, branch_id, action, entity, entity_id, before, after, meta",
    )
    .order("occurred_at", { ascending: false })
    .limit(params.limit || 100);

  if (params.branchId && params.branchId !== "all") {
    query = query.eq("branch_id", params.branchId);
  }
  if (params.actorId) {
    query = query.eq("actor_id", params.actorId);
  }
  if (params.entity) {
    query = query.eq("entity", params.entity);
  }
  if (params.action) {
    query = query.eq("action", params.action);
  }

  const { data, error } = await query;
  if (error || !data || data.length === 0) {
    return [];
  }

  const actorIds = [
    ...new Set(data.map((r: any) => r.actor_id).filter(Boolean)),
  ];
  const branchIds = [
    ...new Set(data.map((r: any) => r.branch_id).filter(Boolean)),
  ];

  const [{ data: profiles }, { data: branches }] = await Promise.all([
    actorIds.length > 0
      ? supabase.from("profiles").select("id, full_name").in("id", actorIds)
      : Promise.resolve({ data: [] }),
    branchIds.length > 0
      ? supabase.from("branches").select("id, name").in("id", branchIds)
      : Promise.resolve({ data: [] }),
  ]);

  const profileMap = new Map(
    (profiles || []).map((p: any) => [p.id, p.full_name]),
  );
  const branchMap = new Map((branches || []).map((b: any) => [b.id, b.name]));

  return data.map((row: any) => ({
    id: Number(row.id),
    occurred_at: row.occurred_at,
    actor_id: row.actor_id,
    actor_name: profileMap.get(row.actor_id) || null,
    branch_id: row.branch_id,
    branch_name: branchMap.get(row.branch_id) || null,
    action: row.action,
    entity: row.entity,
    entity_id: row.entity_id,
    before: row.before,
    after: row.after,
    meta: row.meta,
  }));
}
