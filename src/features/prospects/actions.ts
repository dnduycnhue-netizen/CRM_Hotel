"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/shared/auth/server";
import { type ActionResult, fail, ok, toFieldErrors } from "@/shared/errors";
import { messages } from "@/shared/i18n/vi";
import { parseProspectImportFile } from "./data/import-file";
import { callRpc as rpc, type RpcError } from "./data/rpc";
import {
  type CheckDuplicatesInput,
  type CommitImportInput,
  type ImportRow,
  type LogInteractionInput,
  type SaveProspectData,
  type SaveProspectRequest,
  type SetProspectStatusInput,
  assignProspectSchema,
  checkDuplicatesSchema,
  commitImportSchema,
  logInteractionSchema,
  mergeProspectSchema,
  previewImportSchema,
  prospectFiltersSchema,
  prospectIdSchema,
  saveProspectRequestSchema,
  setProspectStatusSchema,
} from "./schemas";
import type {
  ConvertProspectOutcome,
  DuplicateCandidate,
  ImportCommitReport,
  ImportPreviewRow,
  Prospect,
  ProspectDetail,
  ProspectFilters,
  ProspectsOverview,
  SaveProspectOutcome,
} from "./types";

/** RPC raise exception P04xx kèm thông báo tiếng Việt cụ thể → trả nguyên văn */
function failFromRpc(error: RpcError): ActionResult<never> {
  const isBusiness = /^P04\d\d$/.test(error.code ?? "");
  return fail(
    error.code ?? "UNKNOWN",
    undefined,
    isBusiness ? error.message : messages.prospects.GENERIC,
  );
}

function parseDuplicateDetail(
  details: string | null | undefined,
): { source: "prospect" | "partner"; id: string; name: string } | null {
  if (!details) return null;
  try {
    const parsed = JSON.parse(details) as {
      source?: string;
      id?: string;
      name?: string;
    };
    if (
      (parsed.source === "prospect" || parsed.source === "partner") &&
      parsed.id &&
      parsed.name
    ) {
      return { source: parsed.source, id: parsed.id, name: parsed.name };
    }
  } catch {
    // details không phải JSON → bỏ qua
  }
  return null;
}

const nz = (v: string | null | undefined): string | null => {
  const t = (v ?? "").trim();
  return t === "" ? null : t;
};

function toPayload(d: SaveProspectData): Record<string, unknown> {
  return {
    id: nz(d.id),
    company_name: d.company_name,
    kind: d.kind,
    tax_code: nz(d.tax_code),
    phone: nz(d.phone),
    email: nz(d.email),
    website: nz(d.website),
    address: nz(d.address),
    province: nz(d.province),
    contact_name: nz(d.contact_name),
    contact_title: nz(d.contact_title),
    contact_phone: nz(d.contact_phone),
    source: nz(d.source),
    estimated_groups_per_year: d.estimated_groups_per_year,
    estimated_guests_per_year: d.estimated_guests_per_year,
    assigned_to: nz(d.assigned_to),
    priority: d.priority,
    next_follow_up_at: nz(d.next_follow_up_at),
    note: nz(d.note),
  };
}

// ---------------------------------------------------------------------------
// Đọc
// ---------------------------------------------------------------------------

export async function listProspectsAction(
  rawFilters: ProspectFilters = {},
): Promise<ActionResult<Prospect[]>> {
  const parsed = prospectFiltersSchema.safeParse(rawFilters);
  if (!parsed.success) return fail("VALIDATION", toFieldErrors(parsed.error));
  const auth = await requirePermission("prospect.view");
  if (!auth.ok) return auth;

  const f = parsed.data;
  const { data, error } = await rpc<Prospect[]>("get_prospects", {
    p_search: nz(f.search),
    p_status: nz(f.status),
    p_kind: nz(f.kind),
    p_province: nz(f.province),
    p_assigned_to: nz(f.assigned_to),
    p_overdue_only: f.overdue_only ?? false,
    p_dup_pending: f.dup_pending ?? false,
  });
  if (error) return failFromRpc(error);
  return ok(data ?? []);
}

export async function getProspectDetailAction(
  id: string,
): Promise<ActionResult<ProspectDetail>> {
  const parsed = prospectIdSchema.safeParse({ id });
  if (!parsed.success) return fail("VALIDATION", toFieldErrors(parsed.error));
  const auth = await requirePermission("prospect.view");
  if (!auth.ok) return auth;

  const { data, error } = await rpc<ProspectDetail>("get_prospect_detail", {
    p_id: parsed.data.id,
  });
  if (error) return failFromRpc(error);
  if (!data) return fail("NOT_FOUND");
  return ok(data);
}

export async function getProspectsOverviewAction(): Promise<
  ActionResult<ProspectsOverview>
> {
  const auth = await requirePermission("prospect.view");
  if (!auth.ok) return auth;
  const { data, error } = await rpc<ProspectsOverview>(
    "get_prospects_overview",
    {},
  );
  if (error) return failFromRpc(error);
  if (!data) return fail("UNKNOWN");
  return ok(data);
}

export async function checkProspectDuplicatesAction(
  raw: CheckDuplicatesInput,
): Promise<ActionResult<DuplicateCandidate[]>> {
  const parsed = checkDuplicatesSchema.safeParse(raw);
  if (!parsed.success) return fail("VALIDATION", toFieldErrors(parsed.error));
  const auth = await requirePermission("prospect.view");
  if (!auth.ok) return auth;

  const d = parsed.data;
  const { data, error } = await rpc<DuplicateCandidate[]>(
    "check_prospect_duplicates",
    {
      p_name: nz(d.name),
      p_phone: nz(d.phone),
      p_tax_code: nz(d.tax_code),
      p_website: nz(d.website),
      p_province: nz(d.province),
      p_exclude_id: nz(d.exclude_id),
    },
  );
  if (error) return failFromRpc(error);
  return ok(data ?? []);
}

// ---------------------------------------------------------------------------
// Ghi (mọi thao tác đi qua RPC security definer)
// ---------------------------------------------------------------------------

export async function saveProspectAction(
  raw: SaveProspectRequest,
): Promise<ActionResult<SaveProspectOutcome>> {
  const parsed = saveProspectRequestSchema.safeParse(raw);
  if (!parsed.success) return fail("VALIDATION", toFieldErrors(parsed.error));
  const auth = await requirePermission("prospect.manage");
  if (!auth.ok) return auth;

  const { prospect, force, force_reason } = parsed.data;
  const { data, error } = await rpc<
    | { status: "saved"; id: string; notices?: DuplicateCandidate[] }
    | { status: "possible_duplicates"; candidates: DuplicateCandidate[] }
  >("save_prospect", {
    p_payload: toPayload(prospect),
    p_force: force,
    p_force_reason: nz(force_reason),
  });

  if (error) {
    // Chặn cứng: trả dạng dữ liệu để UI hiện link tới bản ghi trùng
    if (error.code === "P0450" || error.code === "P0451") {
      return ok({
        status: "blocked",
        reason: error.code === "P0450" ? "tax" : "phone",
        message: error.message,
        duplicate: parseDuplicateDetail(error.details),
      });
    }
    return failFromRpc(error);
  }
  if (!data) return fail("UNKNOWN");

  if (data.status === "possible_duplicates") {
    return ok({ status: "possible_duplicates", candidates: data.candidates });
  }
  revalidatePath("/prospects");
  return ok({ status: "saved", id: data.id, notices: data.notices ?? [] });
}

export async function logProspectInteractionAction(
  raw: LogInteractionInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = logInteractionSchema.safeParse(raw);
  if (!parsed.success) return fail("VALIDATION", toFieldErrors(parsed.error));
  const auth = await requirePermission("prospect.manage");
  if (!auth.ok) return auth;

  const d = parsed.data;
  const { data, error } = await rpc<{ id: string }>(
    "log_prospect_interaction",
    {
      p_prospect_id: d.prospect_id,
      p_channel: d.channel,
      p_outcome: d.outcome,
      p_note: nz(d.note),
      p_next_follow_up_at: nz(d.next_follow_up_at),
    },
  );
  if (error) return failFromRpc(error);
  revalidatePath("/prospects");
  return ok({ id: data?.id ?? "" });
}

export async function setProspectStatusAction(
  raw: SetProspectStatusInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = setProspectStatusSchema.safeParse(raw);
  if (!parsed.success) return fail("VALIDATION", toFieldErrors(parsed.error));
  const auth = await requirePermission("prospect.manage");
  if (!auth.ok) return auth;

  const d = parsed.data;
  const { error } = await rpc("set_prospect_status", {
    p_id: d.id,
    p_status: d.status,
    p_note: nz(d.note),
    p_next_follow_up: nz(d.next_follow_up_at),
    p_duplicate_of: nz(d.duplicate_of),
  });
  if (error) return failFromRpc(error);
  revalidatePath("/prospects");
  return ok({ id: d.id });
}

export async function assignProspectAction(raw: {
  id: string;
  assignee: string;
}): Promise<ActionResult<{ id: string }>> {
  const parsed = assignProspectSchema.safeParse(raw);
  if (!parsed.success) return fail("VALIDATION", toFieldErrors(parsed.error));
  const auth = await requirePermission("prospect.assign");
  if (!auth.ok) return auth;

  const { error } = await rpc("assign_prospect", {
    p_id: parsed.data.id,
    p_assignee: parsed.data.assignee,
  });
  if (error) return failFromRpc(error);
  revalidatePath("/prospects");
  return ok({ id: parsed.data.id });
}

/** Sales tự nhận prospect chưa có người phụ trách (không cần prospect.assign) */
export async function claimProspectAction(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const parsed = prospectIdSchema.safeParse({ id });
  if (!parsed.success) return fail("VALIDATION", toFieldErrors(parsed.error));
  const auth = await requirePermission("prospect.manage");
  if (!auth.ok) return auth;

  const { error } = await rpc("claim_prospect", { p_id: parsed.data.id });
  if (error) return failFromRpc(error);
  revalidatePath("/prospects");
  return ok({ id: parsed.data.id });
}

export async function resolveProspectDuplicateAction(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const parsed = prospectIdSchema.safeParse({ id });
  if (!parsed.success) return fail("VALIDATION", toFieldErrors(parsed.error));
  const auth = await requirePermission("prospect.manage");
  if (!auth.ok) return auth;

  const { error } = await rpc("resolve_prospect_duplicate", {
    p_id: parsed.data.id,
  });
  if (error) return failFromRpc(error);
  revalidatePath("/prospects");
  return ok({ id: parsed.data.id });
}

export async function mergeProspectInfoAction(raw: {
  target_id: string;
  payload: SaveProspectRequest["prospect"];
}): Promise<ActionResult<{ id: string }>> {
  const parsed = mergeProspectSchema.safeParse(raw);
  if (!parsed.success) return fail("VALIDATION", toFieldErrors(parsed.error));
  const auth = await requirePermission("prospect.manage");
  if (!auth.ok) return auth;

  const { error } = await rpc("merge_prospect_info", {
    p_target_id: parsed.data.target_id,
    p_payload: toPayload(parsed.data.payload),
  });
  if (error) return failFromRpc(error);
  revalidatePath("/prospects");
  return ok({ id: parsed.data.target_id });
}

export async function convertProspectAction(
  id: string,
): Promise<ActionResult<ConvertProspectOutcome>> {
  const parsed = prospectIdSchema.safeParse({ id });
  if (!parsed.success) return fail("VALIDATION", toFieldErrors(parsed.error));
  const auth = await requirePermission("prospect.convert");
  if (!auth.ok) return auth;

  const { data, error } = await rpc<{
    partner_id: string;
    already_converted: boolean;
  }>("convert_prospect_to_partner", { p_prospect_id: parsed.data.id });

  if (error) {
    if (error.code === "P0452") {
      const dup = parseDuplicateDetail(error.details);
      return ok({
        status: "duplicate_partner",
        message: error.message,
        partner: dup ? { id: dup.id, name: dup.name } : null,
      });
    }
    return failFromRpc(error);
  }
  if (!data) return fail("UNKNOWN");

  revalidatePath("/prospects");
  revalidatePath("/partners");
  return ok({
    status: "converted",
    partner_id: data.partner_id,
    already_converted: data.already_converted,
  });
}

// ---------------------------------------------------------------------------
// Import Excel / CSV (GĐ2): đọc file → dry-run → ghi các dòng đã chọn
// ---------------------------------------------------------------------------

/** Bước 0: đọc file thành các dòng (chưa kiểm tra trùng, chưa ghi) */
export async function parseProspectImportAction(
  formData: FormData,
): Promise<ActionResult<{ rows: ImportRow[]; ignoredColumns: string[] }>> {
  const auth = await requirePermission("prospect.import");
  if (!auth.ok) return auth;

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return fail("VALIDATION", undefined, messages.prospects.NO_FILE);
  }
  const res = await parseProspectImportFile(file);
  if (!res.ok) return fail("VALIDATION", undefined, res.message);
  return ok({ rows: res.rows, ignoredColumns: res.ignoredColumns });
}

/** Bước 1: dry-run — phân loại Mới / Nghi trùng / Trùng cứng, KHÔNG ghi gì */
export async function previewProspectImportAction(raw: {
  rows: ImportRow[];
}): Promise<ActionResult<ImportPreviewRow[]>> {
  const parsed = previewImportSchema.safeParse(raw);
  if (!parsed.success) return fail("VALIDATION", toFieldErrors(parsed.error));
  const auth = await requirePermission("prospect.import");
  if (!auth.ok) return auth;

  const { data, error } = await rpc<ImportPreviewRow[]>(
    "preview_prospect_import",
    { p_rows: parsed.data.rows },
  );
  if (error) return failFromRpc(error);
  return ok(data ?? []);
}

/**
 * Bước 2: ghi thật các dòng đã chọn. Mỗi dòng đi qua đúng save_prospect (tái dùng
 * chống trùng); dòng nghi trùng không có lý do bị từ chối, trùng cứng bị loại.
 */
export async function commitProspectImportAction(
  raw: CommitImportInput,
): Promise<ActionResult<ImportCommitReport>> {
  const parsed = commitImportSchema.safeParse(raw);
  if (!parsed.success) return fail("VALIDATION", toFieldErrors(parsed.error));
  const importAuth = await requirePermission("prospect.import");
  if (!importAuth.ok) return importAuth;
  const manageAuth = await requirePermission("prospect.manage");
  if (!manageAuth.ok) return manageAuth;

  const report: ImportCommitReport = {
    created: 0,
    skipped_hard: 0,
    skipped_needs_reason: 0,
    failed: 0,
    results: [],
  };

  const items = parsed.data.rows;
  const CHUNK = 5;
  for (let i = 0; i < items.length; i += CHUNK) {
    const chunk = items.slice(i, i + CHUNK);
    const outcomes = await Promise.all(
      chunk.map(async ({ row, force, force_reason }) => {
        const payload = {
          company_name: row.company_name,
          kind: row.kind,
          phone: nz(row.phone),
          email: nz(row.email),
          address: nz(row.address),
          province: nz(row.province),
          website: nz(row.website),
          source: nz(row.source),
          contact_name: nz(row.contact_name),
          tax_code: nz(row.tax_code),
          note: nz(row.note),
          priority: "medium",
        };
        const { data, error } = await rpc<{
          status: "saved" | "possible_duplicates";
        }>("save_prospect", {
          p_payload: payload,
          p_force: force,
          p_force_reason: force ? nz(force_reason) : null,
        });
        if (error) {
          if (error.code === "P0450" || error.code === "P0451") {
            return {
              row_id: row.row_id,
              result: "hard" as const,
              message: error.message,
            };
          }
          // Ép tạo nhưng thiếu lý do → coi như chưa được xác nhận
          if (force && error.code === "P0422" && !nz(force_reason)) {
            return {
              row_id: row.row_id,
              result: "needs_reason" as const,
              message: "Cần ghi lý do khi vẫn tạo dù nghi trùng",
            };
          }
          return {
            row_id: row.row_id,
            result: "failed" as const,
            message: /^P04\d\d$/.test(error.code ?? "")
              ? error.message
              : messages.prospects.GENERIC,
          };
        }
        if (data?.status === "possible_duplicates") {
          return {
            row_id: row.row_id,
            result: "needs_reason" as const,
            message: "Nghi trùng: cần ghi lý do mới được tạo",
          };
        }
        return { row_id: row.row_id, result: "created" as const };
      }),
    );
    for (const o of outcomes) {
      report.results.push(o);
      if (o.result === "created") report.created++;
      else if (o.result === "hard") report.skipped_hard++;
      else if (o.result === "needs_reason") report.skipped_needs_reason++;
      else report.failed++;
    }
  }

  revalidatePath("/prospects");
  return ok(report);
}
