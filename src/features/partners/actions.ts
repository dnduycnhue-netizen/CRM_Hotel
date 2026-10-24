"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/shared/auth/server";
import { type ActionResult, fail, ok, toFieldErrors } from "@/shared/errors";
import {
  type DecideCommissionInput,
  decideCommissionSchema,
  type SaveGroupBookingInput,
  type SavePartnerContractInput,
  type SavePartnerInput,
  saveGroupBookingSchema,
  savePartnerContractSchema,
  savePartnerSchema,
} from "./schemas";

export async function savePartnerAction(
  rawInput: SavePartnerInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = savePartnerSchema.safeParse(rawInput);
    if (!parsed.success) {
      return fail("VALIDATION", toFieldErrors(parsed.error));
    }

    const hasPerm = await requirePermission("partner.manage");
    if (!hasPerm.ok) {
      return hasPerm;
    }

    const supabase = await createClient();
    const { data, error } = await (supabase.rpc as any)("save_partner", {
      p_id: parsed.data.id || null,
      p_name: parsed.data.name,
      p_kind: parsed.data.kind,
      p_contact_name: parsed.data.contact_name || null,
      p_phone: parsed.data.phone || null,
      p_email: parsed.data.email || null,
      p_tax_code: parsed.data.tax_code || null,
      p_address: parsed.data.address || null,
      p_bank_name: parsed.data.bank_name || null,
      p_bank_account: parsed.data.bank_account || null,
      p_bank_holder: parsed.data.bank_holder || null,
      p_credit_limit: parsed.data.credit_limit,
      p_payment_terms: parsed.data.payment_terms || null,
      p_note: parsed.data.note || null,
      p_is_active: parsed.data.is_active,
    });

    if (error) {
      return fail("UNKNOWN", undefined, error.message);
    }

    revalidatePath("/partners");
    const partnerId =
      typeof data === "object" && data ? (data as any).id : (data as string);
    return ok({ id: partnerId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lỗi không xác định";
    return fail("UNKNOWN", undefined, message);
  }
}

export async function savePartnerContractAction(
  rawInput: SavePartnerContractInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = savePartnerContractSchema.safeParse(rawInput);
    if (!parsed.success) {
      return fail("VALIDATION", toFieldErrors(parsed.error));
    }

    const hasPerm = await requirePermission("contract.manage");
    if (!hasPerm.ok) {
      return hasPerm;
    }

    const supabase = await createClient();
    const { data, error } = await (supabase.rpc as any)(
      "save_partner_contract",
      {
        p_id: parsed.data.id || null,
        p_partner_id: parsed.data.partner_id,
        p_contract_number: parsed.data.contract_number,
        p_valid_from: parsed.data.valid_from,
        p_valid_to: parsed.data.valid_to,
        p_discount_pct: parsed.data.discount_pct,
        p_commission_rate_pct: parsed.data.commission_rate_pct,
        p_payment_terms: parsed.data.payment_terms || null,
        p_status: parsed.data.status,
        p_attachment_url: parsed.data.attachment_url || null,
        p_note: parsed.data.note || null,
      },
    );

    if (error) {
      return fail("UNKNOWN", undefined, error.message);
    }

    revalidatePath("/partners");
    const contractId =
      typeof data === "object" && data ? (data as any).id : (data as string);
    return ok({ id: contractId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lỗi không xác định";
    return fail("UNKNOWN", undefined, message);
  }
}

export async function saveGroupBookingAction(
  rawInput: SaveGroupBookingInput,
): Promise<ActionResult<{ id: string; code: string }>> {
  try {
    const parsed = saveGroupBookingSchema.safeParse(rawInput);
    if (!parsed.success) {
      return fail("VALIDATION", toFieldErrors(parsed.error));
    }

    const hasPerm = await requirePermission(
      "group.manage",
      parsed.data.branch_id,
    );
    if (!hasPerm.ok) {
      return hasPerm;
    }

    const supabase = await createClient();
    const { data, error } = await (supabase.rpc as any)("save_group_booking", {
      p_id: parsed.data.id || null,
      p_branch_id: parsed.data.branch_id,
      p_partner_id: parsed.data.partner_id || null,
      p_group_name: parsed.data.group_name,
      p_leader_name: parsed.data.leader_name,
      p_leader_phone: parsed.data.leader_phone || null,
      p_leader_email: parsed.data.leader_email || null,
      p_expected_check_in: parsed.data.expected_check_in_at,
      p_expected_check_out: parsed.data.expected_check_out_at,
      p_rooms_count: parsed.data.rooms_count,
      p_guests_count: parsed.data.guests_count,
      p_status: parsed.data.status,
      p_estimated_amount: parsed.data.estimated_amount,
      p_deposit_amount: parsed.data.deposit_amount,
      p_billing_note: parsed.data.billing_note || null,
      p_note: parsed.data.note || null,
    });

    if (error) {
      return fail("UNKNOWN", undefined, error.message);
    }

    revalidatePath("/partners");
    return ok(data as { id: string; code: string });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lỗi không xác định";
    return fail("UNKNOWN", undefined, message);
  }
}

export async function decideCommissionAction(
  rawInput: DecideCommissionInput,
): Promise<ActionResult<{ id: string; status: string }>> {
  try {
    const parsed = decideCommissionSchema.safeParse(rawInput);
    if (!parsed.success) {
      return fail("VALIDATION", toFieldErrors(parsed.error));
    }

    const hasPerm = await requirePermission("commission.manage");
    if (!hasPerm.ok) {
      return hasPerm;
    }

    const supabase = await createClient();
    const { data, error } = await (supabase.rpc as any)(
      "decide_partner_commission",
      {
        p_id: parsed.data.id,
        p_action: parsed.data.action,
        p_note: parsed.data.note || null,
      },
    );

    if (error) {
      return fail("UNKNOWN", undefined, error.message);
    }

    revalidatePath("/partners");
    return ok(data as { id: string; status: string });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lỗi không xác định";
    return fail("UNKNOWN", undefined, message);
  }
}
