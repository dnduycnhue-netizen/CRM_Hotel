export interface AuditLogItem {
  id: number;
  occurred_at: string;
  actor_id: string | null;
  actor_name: string | null;
  branch_id: string | null;
  branch_name: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  meta: Record<string, unknown> | null;
}

export interface AuditFilterParams {
  branchId?: string;
  actorId?: string;
  entity?: string;
  action?: string;
  limit?: number;
  offset?: number;
}
