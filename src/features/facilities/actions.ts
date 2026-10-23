"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/shared/auth/server";
import { type ActionResult, fail, ok, toFieldErrors } from "@/shared/errors";
import {
  type CreateAssetInput,
  createAssetSchema,
  type ReportIssueInput,
  type RoomBlockInput,
  reportIssueSchema,
  roomBlockSchema,
  type TransitionWorkOrderInput,
  transitionWorkOrderSchema,
  type UpdateAssetStatusInput,
  updateAssetStatusSchema,
} from "./schemas";

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

export interface CreatePmPlanInput {
  branch_id: string;
  name: string;
  interval_days: number;
  lead_days?: number;
  checklist?: string[];
  next_due_date?: string;
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
