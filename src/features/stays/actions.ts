'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requirePermission } from '@/shared/auth/server';
import { fail, ok, type ActionResult } from '@/shared/errors';

export async function checkoutStayAction(
  stayId: string,
  branchId: string
): Promise<ActionResult<{ success: boolean }>> {
  const auth = await requirePermission('stay.checkout', branchId);
  if (!auth.ok) return auth;

  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc('checkout_stay', {
      p_stay_id: stayId,
      p_at: new Date().toISOString(),
    });

    if (error) {
      return fail(error.code);
    }

    revalidatePath('/stays');
    return ok({ success: true });
  } catch {
    return fail('UNKNOWN');
  }
}

export async function cancelStayAction(
  stayId: string,
  branchId: string,
  reason: string
): Promise<ActionResult<{ success: boolean }>> {
  if (!reason || reason.trim().length < 5) {
    return fail('VALIDATION');
  }

  const auth = await requirePermission('stay.cancel', branchId);
  if (!auth.ok) return auth;

  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc('cancel_stay', {
      p_stay_id: stayId,
      p_reason: reason.trim(),
    });

    if (error) {
      return fail(error.code);
    }

    revalidatePath('/stays');
    return ok({ success: true });
  } catch {
    return fail('UNKNOWN');
  }
}
