"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/shared/auth/server";
import { type ActionResult, fail, ok, toFieldErrors } from "@/shared/errors";
import {
  createVoucherSchema,
  recordBirthdayGreetingSchema,
  redeemVoucherSchema,
} from "./schemas";

export interface CreateVoucherResult {
  voucher_id: string;
}

export interface RedeemVoucherResult {
  redemption_id: string;
  voucher_id: string;
  voucher_code: string;
  discount_applied: number;
  final_amount: number;
}

export interface RecordGreetingResult {
  greeting_id: string;
  guest_id: string;
  year: number;
  channel: string;
  voucher_code?: string;
  voucher_id?: string;
}

/**
 * Server Action: Phát hành voucher mới
 * Quyền yêu cầu: voucher.issue (cơ sở hoặc toàn chuỗi)
 */
export async function createVoucherAction(
  rawInput: unknown,
): Promise<ActionResult<CreateVoucherResult>> {
  const parsed = createVoucherSchema.safeParse(rawInput);
  if (!parsed.success) {
    return fail("VALIDATION", toFieldErrors(parsed.error));
  }

  const { data } = parsed;
  const branchId = data.applicable_branch_id || undefined;
  const auth = await requirePermission("voucher.issue", branchId);
  if (!auth.ok) return auth;

  const supabase = await createClient();

  // supabase.rpc với kiểu tham số
  const { data: voucherId, error } = await supabase.rpc(
    "create_voucher" as never,
    {
      p_code: data.code.trim().toUpperCase(),
      p_title: data.title.trim(),
      p_discount_type: data.discount_type,
      p_discount_value: Number(data.discount_value),
      p_valid_from: data.valid_from,
      p_valid_to: data.valid_to,
      p_max_discount_amount: data.max_discount_amount
        ? Number(data.max_discount_amount)
        : null,
      p_min_spend_amount: Number(data.min_spend_amount || 0),
      p_usage_limit: Number(data.usage_limit || 1),
      p_target_guest_id: data.target_guest_id || null,
      p_applicable_branch_id: data.applicable_branch_id || null,
      p_note: data.note || null,
    } as never,
  );

  if (error) {
    let customMsg = "Không thể phát hành voucher: " + error.message;
    if (error.message?.includes("đã tồn tại")) {
      customMsg =
        "Mã voucher này đã tồn tại trong hệ thống. Vui lòng chọn mã khác.";
    }
    return fail(error.code || "VOUCHER_CREATE_FAILED", undefined, customMsg);
  }

  revalidatePath("/rewards");
  revalidatePath("/check-in");
  return ok({ voucher_id: voucherId as string });
}

/**
 * Server Action: Áp dụng đổi mã voucher cho khách / lượt ở
 * Quyền yêu cầu: voucher.redeem tại cơ sở
 */
export async function redeemVoucherAction(
  rawInput: unknown,
): Promise<ActionResult<RedeemVoucherResult>> {
  const parsed = redeemVoucherSchema.safeParse(rawInput);
  if (!parsed.success) {
    return fail("VALIDATION", toFieldErrors(parsed.error));
  }

  const { data } = parsed;
  const auth = await requirePermission("voucher.redeem", data.branch_id);
  if (!auth.ok) return auth;

  const supabase = await createClient();

  const { data: res, error } = await supabase.rpc(
    "redeem_voucher" as never,
    {
      p_code: data.code.trim().toUpperCase(),
      p_guest_id: data.guest_id,
      p_branch_id: data.branch_id,
      p_stay_id: data.stay_id || null,
      p_bill_amount: Number(data.bill_amount || 0),
      p_note: data.note || null,
    } as never,
  );

  if (error) {
    let customMsg = error.message;
    if (error.message?.includes("không hợp lệ hoặc không tồn tại")) {
      customMsg = "Mã voucher không tồn tại hoặc đã bị vô hiệu hóa.";
    } else if (error.message?.includes("chưa đến ngày có hiệu lực")) {
      customMsg = "Voucher chưa đến ngày bắt đầu có hiệu lực.";
    } else if (error.message?.includes("đã hết hạn")) {
      customMsg = "Voucher đã hết hạn sử dụng.";
    } else if (error.message?.includes("đã hết lượt sử dụng")) {
      customMsg = "Voucher đã hết lượt sử dụng tối đa cho phép.";
    } else if (error.message?.includes("chỉ dành riêng cho khách hàng")) {
      customMsg = "Voucher này được phát hành riêng cho khách hàng VIP khác.";
    } else if (error.message?.includes("không áp dụng tại cơ sở này")) {
      customMsg = "Voucher không áp dụng tại cơ sở hiện tại.";
    } else if (error.message?.includes("Hóa đơn tối thiểu")) {
      customMsg = error.message;
    }
    return fail(error.code || "VOUCHER_REDEEM_FAILED", undefined, customMsg);
  }

  revalidatePath("/rewards");
  revalidatePath("/check-in");
  return ok(res as RedeemVoucherResult);
}

/**
 * Server Action: Ghi nhận lời chúc sinh nhật / tặng quà
 * Quyền yêu cầu: birthday.view tại cơ sở hoặc toàn chuỗi
 */
export async function recordBirthdayGreetingAction(
  rawInput: unknown,
): Promise<ActionResult<RecordGreetingResult>> {
  const parsed = recordBirthdayGreetingSchema.safeParse(rawInput);
  if (!parsed.success) {
    return fail("VALIDATION", toFieldErrors(parsed.error));
  }

  const { data } = parsed;
  const auth = await requirePermission("birthday.view", data.branch_id);
  if (!auth.ok) return auth;

  const supabase = await createClient();

  const { data: res, error } = await supabase.rpc(
    "record_birthday_greeting" as never,
    {
      p_guest_id: data.guest_id,
      p_branch_id: data.branch_id,
      p_year: Number(data.year),
      p_channel: data.channel,
      p_gift_description: data.gift_description || null,
      p_auto_issue_voucher: Boolean(data.auto_issue_voucher),
      p_voucher_discount_pct: Number(data.voucher_discount_pct || 15),
      p_note: data.note || null,
    } as never,
  );

  if (error) {
    return fail(
      error.code || "GREETING_RECORD_FAILED",
      undefined,
      "Không thể ghi nhận lời chúc sinh nhật: " + error.message,
    );
  }

  revalidatePath("/rewards");
  return ok(res as RecordGreetingResult);
}
