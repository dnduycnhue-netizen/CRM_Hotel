import { createClient } from "@/lib/supabase/server";
import type { AuditFilterParams, AuditLogItem } from "../types";

export async function getAuditLogs(
  params: AuditFilterParams = {},
): Promise<AuditLogItem[]> {
  const supabase = await createClient();

  let query = supabase
    .from("audit_logs")
    .select(`
      id,
      occurred_at,
      actor_id,
      branch_id,
      action,
      entity,
      entity_id,
      before,
      after,
      meta,
      actor:profiles!audit_logs_actor_id_fkey(full_name),
      branch:branches!audit_logs_branch_id_fkey(name)
    `)
    .order("occurred_at", { ascending: false })
    .limit(params.limit || 100);

  if (params.branchId) {
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
  if (error || !data) {
    // If foreign key relationship alias fails, fallback to simple select
    const { data: fallbackData } = await supabase
      .from("audit_logs")
      .select(
        "id, occurred_at, actor_id, branch_id, action, entity, entity_id, before, after, meta",
      )
      .order("occurred_at", { ascending: false })
      .limit(params.limit || 100);

    return (fallbackData || []).map((row: any) => ({
      id: Number(row.id),
      occurred_at: row.occurred_at,
      actor_id: row.actor_id,
      actor_name: null,
      branch_id: row.branch_id,
      branch_name: null,
      action: row.action,
      entity: row.entity,
      entity_id: row.entity_id,
      before: row.before,
      after: row.after,
      meta: row.meta,
    }));
  }

  return data.map((row: any) => ({
    id: Number(row.id),
    occurred_at: row.occurred_at,
    actor_id: row.actor_id,
    actor_name: row.actor?.full_name || null,
    branch_id: row.branch_id,
    branch_name: row.branch?.name || null,
    action: row.action,
    entity: row.entity,
    entity_id: row.entity_id,
    before: row.before,
    after: row.after,
    meta: row.meta,
  }));
}
