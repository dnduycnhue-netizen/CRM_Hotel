'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requirePermission } from '@/shared/auth/server';
import { fail, ok, toFieldErrors, type ActionResult } from '@/shared/errors';
import { checkInSchema, type CheckInInput } from './schemas';

export interface GuestLookupResult {
  guestId: string;
  fullName: string;
  gender: string;
  dob: string | null;
  nationality: string;
  phone: string | null;
  docType: string | null;
  docNumberMasked: string | null;
  totalStays: number;
  lastStayBranchName: string | null;
  lastStayDate: string | null;
  recentNotes: string[];
  tierId: string | null;
  tierName: string | null;
  discountPct: number;
  hasBlacklist: boolean;
  blacklistReason: string | null;
}

export async function lookupGuestAction(
  branchId: string,
  kind: 'phone' | 'cccd' | 'passport',
  value: string
): Promise<ActionResult<GuestLookupResult | null>> {
  if (!value || value.trim().length < 4) {
    return ok(null);
  }

  const auth = await requirePermission('stay.create', branchId);
  if (!auth.ok) return auth;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('lookup_for_checkin', {
      p_branch_id: branchId,
      p_kind: kind,
      p_value: value.trim(),
    });

    if (error) {
      return fail(error.code);
    }

    if (!data) {
      return ok(null);
    }

    return ok(data as GuestLookupResult);
  } catch (err) {
    return fail('UNKNOWN');
  }
}

export async function checkInGuestAction(
  input: unknown
): Promise<ActionResult<{ stayId: string; guestId: string }>> {
  const parsed = checkInSchema.safeParse(input);
  if (!parsed.success) {
    return fail('VALIDATION', toFieldErrors(parsed.error));
  }

  const data = parsed.data;

  // 1. Kiểm tra quyền
  const requiredPerm = data.isBackdated ? 'stay.create_past' : 'stay.create';
  const auth = await requirePermission(requiredPerm, data.branchId);
  if (!auth.ok) return auth;

  // 2. Gọi RPC check_in_guest
  try {
    const supabase = await createClient();
    const payload = {
      branch_id: data.branchId,
      room_id: data.roomId,
      guest_id: data.guestId || null,
      full_name: data.fullName,
      gender: data.gender,
      dob: data.dob || null,
      nationality: data.nationality,
      phone: data.phone || null,
      email: data.email || null,
      document: data.documentNumber
        ? {
            type: data.documentType,
            number: data.documentNumber,
            country: data.nationality,
          }
        : null,
      source_channel: data.sourceChannelCode,
      partner_id: data.partnerId || null,
      expected_check_out_at: data.expectedCheckOutAt,
      is_backdated: data.isBackdated,
      actual_check_in_at: data.actualCheckInAt || null,
      actual_check_out_at: data.actualCheckOutAt || null,
      blacklist_ack: data.blacklistAck,
      notes: data.notes || null,
    };

    const { data: res, error } = await supabase.rpc('check_in_guest', {
      p_payload: payload,
    });

    if (error) {
      return fail(error.code);
    }

    revalidatePath('/stays');
    revalidatePath('/check-in');
    return ok(res as { stayId: string; guestId: string });
  } catch {
    return fail('UNKNOWN');
  }
}
