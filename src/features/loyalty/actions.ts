"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/shared/auth/server";
import { type ActionResult, fail, ok, toFieldErrors } from "@/shared/errors";
import type {
  GuestTierInfo,
  LoyaltyPolicy,
  LoyaltyTierItem,
  PolicyPreviewResult,
} from "./domain/types";
import {
  guestTierOverrideSchema,
  loyaltyPolicySchema,
  loyaltyTierItemSchema,
} from "./schemas";

export async function upsertLoyaltyPolicyAction(
  rawInput: unknown,
): Promise<ActionResult<LoyaltyPolicy>> {
  const auth = await requirePermission("loyalty.configure");
  if (!auth.ok) return auth;

  const parsed = loyaltyPolicySchema.safeParse(rawInput);
  if (!parsed.success) {
    return fail("VALIDATION", toFieldErrors(parsed.error));
  }

  const { data } = parsed;
  const supabase = await createClient();

  const { data: res, error } = await supabase.rpc("upsert_loyalty_policy", {
    p: {
      id: data.id || null,
      name: data.name,
      valid_from: data.validFrom,
      valid_to: data.validTo || null,
      basis: data.basis,
      window_months: data.windowMonths,
      count_current_stay: data.countCurrentStay,
      companions_count_default: data.companionsCountDefault,
      note: data.note || null,
    },
  });

  if (error) {
    let customMsg = "Không thể lưu chính sách hạng";
    if (error.message?.includes("invalid policy name")) {
      customMsg = "Tên chính sách không hợp lệ (2 - 100 ký tự)";
    } else if (error.message?.includes("cannot edit archived policy")) {
      customMsg = "Không thể chỉnh sửa chính sách đã lưu trữ";
    } else if (error.message?.includes("valid_to cannot be in the past")) {
      customMsg = "Ngày kết thúc không được ở trong quá khứ";
    } else if (error.message?.includes("loyalty_policies_no_overlap")) {
      customMsg =
        "Khoảng thời gian hiệu lực bị trùng lặp với chính sách đang hiệu lực khác";
    }
    return fail(error.code, undefined, customMsg);
  }

  revalidatePath("/settings/loyalty");
  return ok(res as LoyaltyPolicy);
}

export async function upsertLoyaltyTierAction(
  rawInput: unknown,
): Promise<ActionResult<LoyaltyTierItem>> {
  const auth = await requirePermission("loyalty.configure");
  if (!auth.ok) return auth;

  const parsed = loyaltyTierItemSchema.safeParse(rawInput);
  if (!parsed.success) {
    return fail("VALIDATION", toFieldErrors(parsed.error));
  }

  const { data } = parsed;
  const supabase = await createClient();

  const { data: res, error } = await supabase.rpc("upsert_loyalty_tier", {
    p: {
      id: data.id || null,
      policy_id: data.policyId,
      code: data.code,
      name: data.name,
      min_value: data.minValue,
      discount_pct: data.discountPct,
      benefits: data.benefits || null,
      color: data.color || "#64748B",
      sort: data.sort || 0,
    },
  });

  if (error) {
    let customMsg = "Không thể lưu hạng thành viên";
    if (error.message?.includes("tiers can only be edited on draft policies")) {
      customMsg = "Chỉ có thể chỉnh sửa hạng trong chính sách bản nháp (Draft)";
    } else if (error.message?.includes("loyalty_tiers_policy_code_uq")) {
      customMsg = `Mã hạng "${data.code}" đã tồn tại trong chính sách này`;
    } else if (error.message?.includes("loyalty_tiers_policy_min_value_uq")) {
      customMsg = `Ngưỡng ${data.minValue} đã tồn tại cho một hạng khác trong chính sách này`;
    }
    return fail(error.code, undefined, customMsg);
  }

  revalidatePath("/settings/loyalty");
  return ok(res as LoyaltyTierItem);
}

export async function deleteLoyaltyTierAction(
  tierId: string,
): Promise<ActionResult<void>> {
  const auth = await requirePermission("loyalty.configure");
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_loyalty_tier", {
    p_id: tierId,
  });

  if (error) {
    let customMsg = "Không thể xóa hạng thành viên";
    if (error.message?.includes("can only delete tiers from draft policy")) {
      customMsg = "Chỉ có thể xóa hạng trong chính sách bản nháp";
    } else if (error.message?.includes("policy must have at least one tier")) {
      customMsg = "Chính sách phải có tối thiểu 1 hạng thành viên";
    }
    return fail(error.code, undefined, customMsg);
  }

  revalidatePath("/settings/loyalty");
  return ok(undefined);
}

export async function cloneLoyaltyPolicyAction(
  fromId: string,
  name: string,
  validFrom: string,
): Promise<ActionResult<{ newId: string }>> {
  const auth = await requirePermission("loyalty.configure");
  if (!auth.ok) return auth;

  if (!name || name.trim().length < 2) {
    return fail("VALIDATION", undefined, "Tên chính sách tối thiểu 2 ký tự");
  }
  if (!validFrom || !/^\d{4}-\d{2}-\d{2}$/.test(validFrom)) {
    return fail(
      "VALIDATION",
      undefined,
      "Ngày bắt đầu không đúng định dạng YYYY-MM-DD",
    );
  }

  const supabase = await createClient();
  const { data: newId, error } = await supabase.rpc("clone_loyalty_policy", {
    p_from_id: fromId,
    p_name: name.trim(),
    p_valid_from: validFrom,
  });

  if (error) {
    return fail(
      error.code,
      undefined,
      "Không thể nhân bản chính sách: " + error.message,
    );
  }

  revalidatePath("/settings/loyalty");
  return ok({ newId: newId as string });
}

export async function previewLoyaltyPolicyAction(
  policyId: string,
): Promise<ActionResult<PolicyPreviewResult>> {
  const auth = await requirePermission("loyalty.configure");
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("preview_loyalty_policy", {
    p_id: policyId,
  });

  if (error || !data) {
    return fail(
      error?.code,
      undefined,
      "Không thể mô phỏng xem trước chính sách",
    );
  }

  return ok({
    totalGuests: Number((data as any).total_guests ?? 0),
    upgrades: Number((data as any).upgrades ?? 0),
    downgrades: Number((data as any).downgrades ?? 0),
    unchanged: Number((data as any).unchanged ?? 0),
    countsByTier: (data as any).counts_by_tier || {},
    error: (data as any).error,
  });
}

export async function activateLoyaltyPolicyAction(
  policyId: string,
): Promise<ActionResult<LoyaltyPolicy>> {
  const auth = await requirePermission("loyalty.configure");
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("activate_loyalty_policy", {
    p_id: policyId,
  });

  if (error) {
    let customMsg = "Không thể kích hoạt chính sách";
    if (error.message?.includes("cannot activate policy in the past")) {
      customMsg =
        "Không thể kích hoạt chính sách có ngày bắt đầu trong quá khứ";
    } else if (
      error.message?.includes(
        "policy must have a baseline tier with min_value = 0",
      )
    ) {
      customMsg = "Chính sách phải có hạng cơ sở ban đầu với ngưỡng = 0";
    } else if (
      error.message?.includes("policy must have at least one active tier")
    ) {
      customMsg = "Chính sách phải có ít nhất 1 hạng thành viên";
    } else if (error.message?.includes("loyalty_policies_no_overlap")) {
      customMsg =
        "Khoảng thời gian hiệu lực bị trùng lặp với chính sách đang hiệu lực khác";
    }
    return fail(error.code, undefined, customMsg);
  }

  revalidatePath("/settings/loyalty");
  revalidatePath("/guests");
  return ok(data as LoyaltyPolicy);
}

export async function archiveLoyaltyPolicyAction(
  policyId: string,
): Promise<ActionResult<LoyaltyPolicy>> {
  const auth = await requirePermission("loyalty.configure");
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("archive_loyalty_policy", {
    p_id: policyId,
  });

  if (error) {
    let customMsg = "Không thể lưu trữ chính sách";
    if (error.message?.includes("only expired policies can be archived")) {
      customMsg = "Chỉ có thể lưu trữ chính sách đã hết hạn hiệu lực";
    }
    return fail(error.code, undefined, customMsg);
  }

  revalidatePath("/settings/loyalty");
  return ok(data as LoyaltyPolicy);
}

export async function setGuestTierOverrideAction(
  rawInput: unknown,
): Promise<ActionResult<GuestTierInfo>> {
  const auth = await requirePermission("loyalty.override");
  if (!auth.ok) return auth;

  const parsed = guestTierOverrideSchema.safeParse(rawInput);
  if (!parsed.success) {
    return fail("VALIDATION", toFieldErrors(parsed.error));
  }

  const { data } = parsed;
  const supabase = await createClient();

  const { data: res, error } = await supabase.rpc("set_guest_tier_override", {
    p_guest_id: data.guestId,
    p_tier_id: data.tierId || null,
    p_reason: data.reason,
    p_until: data.until || null,
    p_tier_code: data.tierCode || null,
  });

  if (error) {
    let customMsg = "Không thể gán hạng thủ công cho khách";
    if (error.message?.includes("reason required")) {
      customMsg = "Lý do gán hạng bắt buộc và tối thiểu 10 ký tự";
    }
    return fail(error.code, undefined, customMsg);
  }

  revalidatePath(`/guests/${data.guestId}`);
  revalidatePath("/guests");
  return ok(res as GuestTierInfo);
}
