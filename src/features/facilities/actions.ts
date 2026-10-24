"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/shared/auth/server";
import { type ActionResult, fail, ok, toFieldErrors } from "@/shared/errors";
import { getComplianceHistory } from "./data/compliance";
import {
  type CreateAssetInput,
  type CreatePmPlanInput,
  checklistTemplateSchema,
  createAssetSchema,
  createPmPlanSchema,
  type ReportIssueInput,
  type RoomBlockInput,
  reportIssueSchema,
  roomBlockSchema,
  submitInspectionSchema,
  type TransitionWorkOrderInput,
  transitionWorkOrderSchema,
  type UpdateAssetStatusInput,
  type UpsertComplianceDocInput,
  updateAssetStatusSchema,
  updatePmPlanSchema,
  upsertComplianceDocSchema,
} from "./schemas";
import type { ComplianceHistoryItem } from "./types";

export async function createWorkOrderAction(
  rawInput: ReportIssueInput,
): Promise<ActionResult<{ id: string; number: number; due_at: string }>> {
  try {
    const parsed = reportIssueSchema.safeParse(rawInput);
    if (!parsed.success) {
      return fail("VALIDATION", toFieldErrors(parsed.error));
    }

    const hasPerm = await requirePermission("wo.create", parsed.data.branch_id);
    if (!hasPerm.ok) {
      return hasPerm;
    }

    if (parsed.data.blocks_room) {
      const canBlock = await requirePermission(
        "room.block",
        parsed.data.branch_id,
      );
      if (!canBlock.ok) {
        return canBlock;
      }
    }

    const supabase = await createClient();
    const payload = {
      branch_id: parsed.data.branch_id,
      kind: parsed.data.kind,
      title: parsed.data.title,
      description: parsed.data.description || null,
      priority: parsed.data.priority,
      room_id: parsed.data.room_id || null,
      location_id: parsed.data.location_id || null,
      asset_id: parsed.data.asset_id || null,
      blocks_room: parsed.data.blocks_room,
      photo_paths: parsed.data.photo_paths || [],
      due_at: parsed.data.due_at || null,
    };

    const { data, error } = await supabase.rpc("create_work_order", {
      p: payload,
    });

    if (error) {
      return fail(error.code);
    }

    revalidatePath("/facilities/work-orders");
    revalidatePath("/facilities/room-blocks");
    return ok(data as { id: string; number: number; due_at: string });
  } catch (_err: unknown) {
    return fail("UNKNOWN");
  }
}

export async function transitionWorkOrderAction(
  rawInput: TransitionWorkOrderInput,
): Promise<ActionResult<void>> {
  try {
    const parsed = transitionWorkOrderSchema.safeParse(rawInput);
    if (!parsed.success) {
      return fail("VALIDATION", toFieldErrors(parsed.error));
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("transition_work_order", {
      p_id: parsed.data.id,
      p_to: parsed.data.to,
      p_comment: parsed.data.comment || null,
      p_patch: parsed.data.patch || {},
      p_expected_status: parsed.data.expected_status || null,
    });

    if (error) {
      return fail(error.code);
    }

    revalidatePath("/facilities/work-orders");
    revalidatePath("/facilities/room-blocks");
    return ok(undefined);
  } catch (_err: unknown) {
    return fail("UNKNOWN");
  }
}

export async function setRoomBlockAction(
  rawInput: RoomBlockInput,
): Promise<ActionResult<{ block_id: string }>> {
  try {
    const parsed = roomBlockSchema.safeParse(rawInput);
    if (!parsed.success) {
      return fail("VALIDATION", toFieldErrors(parsed.error));
    }

    const hasPerm = await requirePermission("room.block");
    if (!hasPerm.ok) return hasPerm;

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("set_room_block", {
      p_room_id: parsed.data.room_id,
      p_reason: parsed.data.reason,
      p_ends_at: parsed.data.ends_at || null,
    });

    if (error) {
      return fail(error.code);
    }

    revalidatePath("/facilities/room-blocks");
    revalidatePath("/check-in");
    return ok({ block_id: data as string });
  } catch (_err: unknown) {
    return fail("UNKNOWN");
  }
}

export async function releaseRoomBlockAction(
  blockId: string,
): Promise<ActionResult<void>> {
  try {
    const hasPerm = await requirePermission("room.block");
    if (!hasPerm.ok) return hasPerm;

    const supabase = await createClient();
    const { error } = await supabase.rpc("release_room_block", {
      p_block_id: blockId,
    });

    if (error) {
      return fail(error.code);
    }

    revalidatePath("/facilities/room-blocks");
    revalidatePath("/check-in");
    return ok(undefined);
  } catch (_err: unknown) {
    return fail("UNKNOWN");
  }
}

export async function createPmPlanAction(
  rawInput: CreatePmPlanInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    if (!rawInput.name || rawInput.name.trim().length < 3) {
      return fail("VALIDATION");
    }
    const hasPerm = await requirePermission("pm.manage", rawInput.branch_id);
    if (!hasPerm.ok) {
      const altPerm = await requirePermission(
        "facility.view",
        rawInput.branch_id,
      );
      if (!altPerm.ok) return hasPerm;
    }

    const supabase = await createClient();
    const dueDate =
      rawInput.next_due_date ||
      new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

    const { data, error } = await (supabase.from("pm_plans") as any)
      .insert({
        branch_id: rawInput.branch_id,
        name: rawInput.name.trim(),
        interval_days: rawInput.interval_days || 30,
        lead_days: rawInput.lead_days || 7,
        checklist:
          rawInput.checklist && rawInput.checklist.length > 0
            ? rawInput.checklist
            : [
                "Kiểm tra vận hành kỹ thuật",
                "Vệ sinh chi tiết",
                "Bảo dưỡng định kỳ",
              ],
        next_due_date: dueDate,
        is_active: true,
      })
      .select("id")
      .single();

    if (error) {
      return fail(error.code);
    }

    revalidatePath("/facilities/maintenance");
    return ok({ id: (data as any)?.id || "" });
  } catch (_err: unknown) {
    return fail("UNKNOWN");
  }
}

export async function createAssetAction(
  rawInput: CreateAssetInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = createAssetSchema.safeParse(rawInput);
    if (!parsed.success) {
      return fail("VALIDATION", toFieldErrors(parsed.error));
    }

    const hasPerm = await requirePermission(
      "facility.manage",
      parsed.data.branch_id,
    );
    if (!hasPerm.ok) return hasPerm;

    const supabase = await createClient();
    const payload: any = {
      branch_id: parsed.data.branch_id,
      code: parsed.data.code.trim().toUpperCase(),
      name: parsed.data.name.trim(),
      category_id: parsed.data.category_id,
      room_id: parsed.data.room_id || null,
      location_id: parsed.data.location_id || null,
      brand: parsed.data.brand?.trim() || null,
      model: parsed.data.model?.trim() || null,
      serial_no: parsed.data.serial_no?.trim() || null,
      purchase_date: parsed.data.purchase_date || null,
      purchase_cost: parsed.data.purchase_cost ?? null,
      warranty_until: parsed.data.warranty_until || null,
      quantity: parsed.data.quantity,
      status: parsed.data.status,
      note: parsed.data.note?.trim() || null,
    };

    if (parsed.data.status === "disposed") {
      payload.disposed_on = new Date().toISOString().slice(0, 10);
      payload.disposed_reason = parsed.data.note || "Thanh lý";
    }

    const { data, error } = await (supabase.from("assets") as any)
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      return fail(error.code);
    }

    revalidatePath("/facilities/assets");
    return ok({ id: data.id });
  } catch (_err: unknown) {
    return fail("UNKNOWN");
  }
}

export async function updateAssetStatusAction(
  rawInput: UpdateAssetStatusInput,
): Promise<ActionResult<void>> {
  try {
    const parsed = updateAssetStatusSchema.safeParse(rawInput);
    if (!parsed.success) {
      return fail("VALIDATION", toFieldErrors(parsed.error));
    }

    const hasPerm = await requirePermission(
      "facility.manage",
      parsed.data.branch_id,
    );
    if (!hasPerm.ok) return hasPerm;

    const supabase = await createClient();
    const patch: any = {
      status: parsed.data.status,
      note: parsed.data.note || null,
    };

    if (parsed.data.status === "disposed") {
      patch.disposed_on = new Date().toISOString().slice(0, 10);
      patch.disposed_reason = parsed.data.disposed_reason || "Đã thanh lý";
    } else {
      patch.disposed_on = null;
      patch.disposed_reason = null;
    }

    const { error } = await (supabase.from("assets") as any)
      .update(patch)
      .eq("id", parsed.data.id)
      .eq("branch_id", parsed.data.branch_id);

    if (error) {
      return fail(error.code);
    }

    revalidatePath("/facilities/assets");
    return ok(undefined);
  } catch (_err: unknown) {
    return fail("UNKNOWN");
  }
}

export async function updatePmPlanAction(
  rawInput: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = updatePmPlanSchema.safeParse(rawInput);
    if (!parsed.success) {
      return fail("VALIDATION", toFieldErrors(parsed.error));
    }

    const supabase = await createClient();
    const { data: plan } = await (supabase.from("pm_plans") as any)
      .select("branch_id")
      .eq("id", parsed.data.id)
      .single();

    if (!plan)
      return fail("NOT_FOUND", undefined, "Kế hoạch bảo trì không tồn tại");

    const auth = await requirePermission("pm.manage", plan.branch_id);
    if (!auth.ok) return auth;

    const { data, error } = await supabase.rpc("update_pm_plan", {
      p_id: parsed.data.id,
      p_patch: parsed.data,
    });

    if (error) {
      return fail(
        error.code,
        undefined,
        error.message || "Không thể cập nhật kế hoạch bảo trì",
      );
    }

    revalidatePath("/facilities/maintenance");
    return ok(data as { id: string });
  } catch (err: unknown) {
    return fail(
      "UNKNOWN",
      undefined,
      (err as Error)?.message || "Không thể cập nhật kế hoạch bảo trì",
    );
  }
}

export async function deletePmPlanAction(
  id: string,
): Promise<ActionResult<{ action: string }>> {
  try {
    const supabase = await createClient();
    const { data: plan } = (await supabase
      .from("pm_plans")
      .select("branch_id")
      .eq("id", id)
      .single()) as unknown as {
      data: { branch_id: string } | null;
      error: unknown;
    };

    if (!plan)
      return fail("NOT_FOUND", undefined, "Kế hoạch bảo trì không tồn tại");

    const auth = await requirePermission("pm.manage", plan.branch_id);
    if (!auth.ok) return auth;

    const { data, error } = await supabase.rpc("delete_pm_plan", {
      p_id: id,
    });

    if (error) {
      return fail(
        error.code,
        undefined,
        error.message || "Không thể xóa kế hoạch bảo trì",
      );
    }

    revalidatePath("/facilities/maintenance");
    return ok(data as { action: string });
  } catch (err: unknown) {
    return fail(
      "UNKNOWN",
      undefined,
      (err as Error)?.message || "Không thể xóa kế hoạch bảo trì",
    );
  }
}

export async function triggerPmPlanNowAction(
  planId: string,
): Promise<ActionResult<{ work_order_id: string; work_order_number: number }>> {
  try {
    const supabase = await createClient();
    const { data: plan } = (await supabase
      .from("pm_plans")
      .select("branch_id")
      .eq("id", planId)
      .single()) as unknown as {
      data: { branch_id: string } | null;
      error: unknown;
    };

    if (!plan)
      return fail("NOT_FOUND", undefined, "Kế hoạch bảo trì không tồn tại");

    const auth = await requirePermission("pm.manage", plan.branch_id);
    if (!auth.ok) return auth;

    const { data, error } = await supabase.rpc("trigger_pm_now", {
      p_plan_id: planId,
    });

    if (error) {
      return fail(
        error.code,
        undefined,
        error.message || "Không thể tạo phiếu bảo trì",
      );
    }

    revalidatePath("/facilities/maintenance");
    revalidatePath("/facilities/work-orders");
    return ok(data as { work_order_id: string; work_order_number: number });
  } catch (err: unknown) {
    return fail(
      "UNKNOWN",
      undefined,
      (err as Error)?.message || "Không thể tạo phiếu bảo trì",
    );
  }
}

export async function upsertChecklistTemplateAction(
  rawInput: unknown,
): Promise<ActionResult<{ id: string; versioned?: boolean }>> {
  try {
    const parsed = checklistTemplateSchema.safeParse(rawInput);
    if (!parsed.success) {
      return fail("VALIDATION", toFieldErrors(parsed.error));
    }

    const auth = await requirePermission("inspection.manage");
    if (!auth.ok) return auth;

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("upsert_checklist_template", {
      p: parsed.data,
    });

    if (error) {
      return fail(
        error.code,
        undefined,
        error.message || "Không thể lưu mẫu checklist",
      );
    }

    revalidatePath("/settings/checklists");
    revalidatePath("/facilities/inspections/new");
    revalidatePath("/facilities/maintenance");
    return ok(data as { id: string; versioned?: boolean });
  } catch (err: unknown) {
    return fail(
      "UNKNOWN",
      undefined,
      (err as Error)?.message || "Không thể lưu mẫu checklist",
    );
  }
}

export async function submitInspectionAction(rawInput: unknown): Promise<
  ActionResult<{
    inspection_id: string;
    score: number;
    work_order_ids: string[];
  }>
> {
  try {
    const parsed = submitInspectionSchema.safeParse(rawInput);
    if (!parsed.success) {
      return fail("VALIDATION", toFieldErrors(parsed.error));
    }

    const auth = await requirePermission(
      "inspection.perform",
      parsed.data.branch_id,
    );
    if (!auth.ok) return auth;

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("submit_inspection", {
      p: parsed.data,
    });

    if (error) {
      return fail(
        error.code,
        undefined,
        error.message || "Không thể gửi kết quả kiểm tra",
      );
    }

    revalidatePath("/facilities/maintenance");
    revalidatePath("/facilities/work-orders");
    return ok(
      data as {
        inspection_id: string;
        score: number;
        work_order_ids: string[];
      },
    );
  } catch (err: unknown) {
    return fail(
      "UNKNOWN",
      undefined,
      (err as Error)?.message || "Không thể gửi kết quả kiểm tra",
    );
  }
}

export async function upsertComplianceDocAction(
  rawInput: unknown,
): Promise<ActionResult<{ id: string; action: string }>> {
  try {
    const parsed = upsertComplianceDocSchema.safeParse(rawInput);
    if (!parsed.success) {
      return fail("VALIDATION", toFieldErrors(parsed.error));
    }

    const auth = await requirePermission(
      "compliance.manage",
      parsed.data.branch_id,
    );
    if (!auth.ok) return auth;

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("upsert_compliance_doc", {
      p: parsed.data,
    });

    if (error) {
      return fail(
        error.code,
        undefined,
        error.message || "Không thể lưu hồ sơ pháp lý",
      );
    }

    revalidatePath("/facilities/compliance");
    revalidatePath("/facilities/alerts");
    return ok(data as { id: string; action: string });
  } catch (err: unknown) {
    return fail(
      "UNKNOWN",
      undefined,
      (err as Error)?.message || "Không thể lưu hồ sơ pháp lý",
    );
  }
}

export async function getComplianceHistoryAction(
  docId: string,
): Promise<ActionResult<ComplianceHistoryItem[]>> {
  try {
    const history = await getComplianceHistory(docId);
    return ok(history);
  } catch (err: unknown) {
    return fail(
      "UNKNOWN",
      undefined,
      (err as Error)?.message || "Không thể tải lịch sử hồ sơ",
    );
  }
}

export async function createComplianceUploadSignedUrlAction(
  branchId: string,
  fileName: string,
): Promise<ActionResult<{ signedUrl: string; token: string; path: string }>> {
  try {
    const auth = await requirePermission("compliance.manage", branchId);
    if (!auth.ok) return auth;

    const supabase = await createClient();
    const cleanName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `${branchId}/${Date.now()}_${cleanName}`;

    const { data, error } = await supabase.storage
      .from("compliance")
      .createSignedUploadUrl(filePath);

    if (error || !data) {
      return fail(
        "STORAGE_ERROR",
        undefined,
        error?.message || "Không thể tạo URL tải tệp lên",
      );
    }

    return ok({
      signedUrl: data.signedUrl,
      token: data.token,
      path: filePath,
    });
  } catch (err: unknown) {
    return fail(
      "UNKNOWN",
      undefined,
      (err as Error)?.message || "Không thể tạo URL tải tệp lên",
    );
  }
}

export async function getComplianceSignedUrlAction(
  filePath: string,
): Promise<ActionResult<{ signedUrl: string }>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.storage
      .from("compliance")
      .createSignedUrl(filePath, 300);

    if (error || !data) {
      return fail(
        "NOT_FOUND",
        undefined,
        error?.message || "Không tìm thấy file hoặc link đã hết hạn",
      );
    }

    return ok({ signedUrl: data.signedUrl });
  } catch (err: unknown) {
    return fail(
      "UNKNOWN",
      undefined,
      (err as Error)?.message || "Không thể lấy link file",
    );
  }
}
