'use server';

import { createClient } from '@/lib/supabase/server';
import { requirePermission } from '@/shared/auth/server';
import { ActionResult, ok, fail, toFieldErrors } from '@/shared/errors';
import { revalidatePath } from 'next/cache';
import {
  createGuestSchema,
  CreateGuestInput,
  updateGuestSchema,
  UpdateGuestInput,
  addGuestNoteSchema,
  AddGuestNoteInput,
} from './schemas';

export async function createGuestAction(
  rawInput: CreateGuestInput
): Promise<ActionResult<{ guest_id: string; existing: boolean }>> {
  try {
    const parsed = createGuestSchema.safeParse(rawInput);
    if (!parsed.success) {
      return fail('VALIDATION', toFieldErrors(parsed.error));
    }

    const hasPerm = await requirePermission('guest.create');
    if (!hasPerm) {
      return fail('FORBIDDEN');
    }

    const supabase = await createClient();
    const payload = {
      full_name: parsed.data.full_name,
      gender: parsed.data.gender,
      nationality: parsed.data.nationality,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      address_line: parsed.data.address_line || null,
      tags: parsed.data.tags || [],
      document: parsed.data.document
        ? {
            type: parsed.data.document.type,
            number: parsed.data.document.number,
            country: parsed.data.document.country || 'VN',
          }
        : null,
    };

    const { data, error } = await supabase.rpc('create_guest', {
      p: payload,
    });

    if (error) {
      return fail(error.code);
    }

    revalidatePath('/guests');
    return ok(data as { guest_id: string; existing: boolean });
  } catch (err: unknown) {
    return fail('UNKNOWN');
  }
}

export async function updateGuestAction(
  guestId: string,
  rawPatch: UpdateGuestInput,
  expectedUpdatedAt: string
): Promise<ActionResult<{ id: string; updated: boolean }>> {
  try {
    const parsed = updateGuestSchema.safeParse(rawPatch);
    if (!parsed.success) {
      return fail('VALIDATION', toFieldErrors(parsed.error));
    }

    const hasPerm = await requirePermission('guest.update');
    if (!hasPerm) {
      return fail('FORBIDDEN');
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc('update_guest', {
      p_guest_id: guestId,
      p_patch: parsed.data,
      p_expected_updated_at: expectedUpdatedAt,
    });

    if (error) {
      return fail(error.code);
    }

    revalidatePath(`/guests/${guestId}`);
    revalidatePath('/guests');
    return ok(data as { id: string; updated: boolean });
  } catch (err: unknown) {
    return fail('UNKNOWN');
  }
}

export async function addGuestNoteAction(
  rawInput: AddGuestNoteInput
): Promise<ActionResult<any>> {
  try {
    const parsed = addGuestNoteSchema.safeParse(rawInput);
    if (!parsed.success) {
      return fail('VALIDATION', toFieldErrors(parsed.error));
    }

    const hasPerm = await requirePermission('guest.note_create');
    if (!hasPerm) {
      return fail('FORBIDDEN');
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc('add_guest_note', {
      p_guest_id: parsed.data.guest_id,
      p_branch_id: parsed.data.branch_id || null,
      p_kind: parsed.data.kind,
      p_body: parsed.data.body,
    });

    if (error) {
      return fail(error.code);
    }

    revalidatePath(`/guests/${parsed.data.guest_id}`);
    return ok(data);
  } catch (err: unknown) {
    return fail('UNKNOWN');
  }
}

export async function deleteGuestNoteAction(
  noteId: string,
  guestId: string
): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc('delete_guest_note', {
      p_note_id: noteId,
    });

    if (error) {
      return fail(error.code);
    }

    revalidatePath(`/guests/${guestId}`);
    return ok(undefined);
  } catch (err: unknown) {
    return fail('UNKNOWN');
  }
}

export async function setGuestTagsAction(
  guestId: string,
  tags: string[]
): Promise<ActionResult<void>> {
  try {
    const hasPerm = await requirePermission('guest.tag_manage');
    if (!hasPerm) {
      return fail('FORBIDDEN');
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc('set_guest_tags', {
      p_guest_id: guestId,
      p_tags: tags,
    });

    if (error) {
      return fail(error.code);
    }

    revalidatePath(`/guests/${guestId}`);
    return ok(undefined);
  } catch (err: unknown) {
    return fail('UNKNOWN');
  }
}

export async function assignSalesOwnerAction(
  guestId: string,
  userId: string | null
): Promise<ActionResult<void>> {
  try {
    const hasPerm = await requirePermission('guest.assign_owner');
    if (!hasPerm) {
      return fail('FORBIDDEN');
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc('assign_sales_owner', {
      p_guest_id: guestId,
      p_user_id: userId,
    });

    if (error) {
      return fail(error.code);
    }

    revalidatePath(`/guests/${guestId}`);
    revalidatePath('/guests');
    return ok(undefined);
  } catch (err: unknown) {
    return fail('UNKNOWN');
  }
}

export async function setGuestConsentAction(
  guestId: string,
  channel: string,
  granted: boolean
): Promise<ActionResult<void>> {
  try {
    const hasPerm = await requirePermission('consent.manage');
    if (!hasPerm) {
      return fail('FORBIDDEN');
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc('set_guest_consent', {
      p_guest_id: guestId,
      p_channel: channel,
      p_granted: granted,
      p_source: 'front_desk',
    });

    if (error) {
      return fail(error.code);
    }

    revalidatePath(`/guests/${guestId}`);
    return ok(undefined);
  } catch (err: unknown) {
    return fail('UNKNOWN');
  }
}
