"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/shared/auth/server";
import { type ActionResult, fail, ok, toFieldErrors } from "@/shared/errors";
import {
  type ApproveMergeInput,
  approveMergeSchema,
  type DecideFlagInput,
  decideFlagSchema,
  type ProposeFlagInput,
  type ProposeMergeInput,
  proposeFlagSchema,
  proposeMergeSchema,
  type RejectMergeInput,
  type RemoveFlagInput,
  rejectMergeSchema,
  removeFlagSchema,
} from "./schemas";

export async function proposeMergeAction(
  rawInput: ProposeMergeInput,
): Promise<ActionResult<{ request_id: string }>> {
  try {
    const parsed = proposeMergeSchema.safeParse(rawInput);
    if (!parsed.success) {
      return fail("VALIDATION", toFieldErrors(parsed.error));
    }

    const hasPerm = await requirePermission("merge.propose");
    if (!hasPerm.ok) return hasPerm;

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("propose_merge", {
      p_keep: parsed.data.keep_guest_id,
      p_drop: parsed.data.drop_guest_id,
      p_reason: parsed.data.reason,
    });

    if (error) return fail(error.code);

    revalidatePath("/approvals");
    return ok({ request_id: data as string });
  } catch (err: unknown) {
    return fail("UNKNOWN");
  }
}

export async function approveMergeAction(
  rawInput: ApproveMergeInput,
): Promise<ActionResult<void>> {
  try {
    const parsed = approveMergeSchema.safeParse(rawInput);
    if (!parsed.success) {
      return fail("VALIDATION", toFieldErrors(parsed.error));
    }

    const hasPerm = await requirePermission("merge.approve");
    if (!hasPerm.ok) return hasPerm;

    const supabase = await createClient();
    const { error } = await supabase.rpc("approve_merge", {
      p_request_id: parsed.data.request_id,
      p_field_choices: parsed.data.field_choices,
    });

    if (error) return fail(error.code);

    revalidatePath("/approvals");
    revalidatePath("/guests");
    return ok(undefined);
  } catch (err: unknown) {
    return fail("UNKNOWN");
  }
}

export async function rejectMergeAction(
  rawInput: RejectMergeInput,
): Promise<ActionResult<void>> {
  try {
    const parsed = rejectMergeSchema.safeParse(rawInput);
    if (!parsed.success) {
      return fail("VALIDATION", toFieldErrors(parsed.error));
    }

    const hasPerm = await requirePermission("merge.approve");
    if (!hasPerm.ok) return hasPerm;

    const supabase = await createClient();
    const { error } = await supabase.rpc("reject_merge", {
      p_request_id: parsed.data.request_id,
      p_note: parsed.data.note || "",
    });

    if (error) return fail(error.code);

    revalidatePath("/approvals");
    return ok(undefined);
  } catch (err: unknown) {
    return fail("UNKNOWN");
  }
}

export async function proposeFlagAction(
  rawInput: ProposeFlagInput,
): Promise<ActionResult<{ flag_id: string }>> {
  try {
    const parsed = proposeFlagSchema.safeParse(rawInput);
    if (!parsed.success) {
      return fail("VALIDATION", toFieldErrors(parsed.error));
    }

    const hasPerm = await requirePermission(
      "blacklist.propose",
      parsed.data.branch_id,
    );
    if (!hasPerm.ok) return hasPerm;

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("propose_flag", {
      p_guest_id: parsed.data.guest_id,
      p_branch_id: parsed.data.branch_id,
      p_type: parsed.data.flag_type,
      p_reason: parsed.data.reason,
      p_evidence: parsed.data.evidence_paths || [],
    });

    if (error) return fail(error.code);

    revalidatePath("/approvals");
    revalidatePath(`/guests/${parsed.data.guest_id}`);
    return ok({ flag_id: data as string });
  } catch (err: unknown) {
    return fail("UNKNOWN");
  }
}

export async function decideFlagAction(
  rawInput: DecideFlagInput,
): Promise<ActionResult<void>> {
  try {
    const parsed = decideFlagSchema.safeParse(rawInput);
    if (!parsed.success) {
      return fail("VALIDATION", toFieldErrors(parsed.error));
    }

    const hasPerm = await requirePermission("blacklist.approve");
    if (!hasPerm.ok) return hasPerm;

    const supabase = await createClient();
    const { error } = await supabase.rpc("decide_flag", {
      p_id: parsed.data.id,
      p_approve: parsed.data.approve,
      p_note: parsed.data.note || null,
    });

    if (error) return fail(error.code);

    revalidatePath("/approvals");
    revalidatePath("/guests");
    return ok(undefined);
  } catch (err: unknown) {
    return fail("UNKNOWN");
  }
}

export async function removeFlagAction(
  rawInput: RemoveFlagInput,
): Promise<ActionResult<void>> {
  try {
    const parsed = removeFlagSchema.safeParse(rawInput);
    if (!parsed.success) {
      return fail("VALIDATION", toFieldErrors(parsed.error));
    }

    const hasPerm = await requirePermission("blacklist.remove");
    if (!hasPerm.ok) return hasPerm;

    const supabase = await createClient();
    const { error } = await supabase.rpc("remove_flag", {
      p_id: parsed.data.id,
      p_reason: parsed.data.reason,
    });

    if (error) return fail(error.code);

    revalidatePath("/approvals");
    revalidatePath("/guests");
    return ok(undefined);
  } catch (err: unknown) {
    return fail("UNKNOWN");
  }
}
