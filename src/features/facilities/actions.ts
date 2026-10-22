'use server';

import { createClient } from '@/lib/supabase/server';
import { requirePermission } from '@/shared/auth/server';
import { ActionResult, ok, fail, toFieldErrors } from '@/shared/errors';
import { revalidatePath } from 'next/cache';
import {
  reportIssueSchema,
  ReportIssueInput,
  transitionWorkOrderSchema,
  TransitionWorkOrderInput,
  roomBlockSchema,
  RoomBlockInput,
} from './schemas';

export async function createWorkOrderAction(
  rawInput: ReportIssueInput
): Promise<ActionResult<{ id: string; number: number; due_at: string }>> {
  try {
    const parsed = reportIssueSchema.safeParse(rawInput);
    if (!parsed.success) {
      return fail('VALIDATION', toFieldErrors(parsed.error));
    }

    const hasPerm = await requirePermission('wo.create', parsed.data.branch_id);
    if (!hasPerm.ok) {
      return hasPerm;
    }

    if (parsed.data.blocks_room) {
      const canBlock = await requirePermission('room.block', parsed.data.branch_id);
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

    const { data, error } = await supabase.rpc('create_work_order', {
      p: payload,
    });

    if (error) {
      return fail(error.code);
    }

    revalidatePath('/facilities/work-orders');
    revalidatePath('/facilities/room-blocks');
    return ok(data as { id: string; number: number; due_at: string });
  } catch (err: unknown) {
    return fail('UNKNOWN');
  }
}

export async function transitionWorkOrderAction(
  rawInput: TransitionWorkOrderInput
): Promise<ActionResult<void>> {
  try {
    const parsed = transitionWorkOrderSchema.safeParse(rawInput);
    if (!parsed.success) {
      return fail('VALIDATION', toFieldErrors(parsed.error));
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc('transition_work_order', {
      p_id: parsed.data.id,
      p_to: parsed.data.to,
      p_comment: parsed.data.comment || null,
      p_patch: parsed.data.patch || {},
      p_expected_status: parsed.data.expected_status || null,
    });

    if (error) {
      return fail(error.code);
    }

    revalidatePath('/facilities/work-orders');
    revalidatePath('/facilities/room-blocks');
    return ok(undefined);
  } catch (err: unknown) {
    return fail('UNKNOWN');
  }
}

export async function setRoomBlockAction(
  rawInput: RoomBlockInput
): Promise<ActionResult<{ block_id: string }>> {
  try {
    const parsed = roomBlockSchema.safeParse(rawInput);
    if (!parsed.success) {
      return fail('VALIDATION', toFieldErrors(parsed.error));
    }

    const hasPerm = await requirePermission('room.block');
    if (!hasPerm.ok) return hasPerm;

    const supabase = await createClient();
    const { data, error } = await supabase.rpc('set_room_block', {
      p_room_id: parsed.data.room_id,
      p_reason: parsed.data.reason,
      p_ends_at: parsed.data.ends_at || null,
    });

    if (error) {
      return fail(error.code);
    }

    revalidatePath('/facilities/room-blocks');
    revalidatePath('/check-in');
    return ok({ block_id: data as string });
  } catch (err: unknown) {
    return fail('UNKNOWN');
  }
}

export async function releaseRoomBlockAction(
  blockId: string
): Promise<ActionResult<void>> {
  try {
    const hasPerm = await requirePermission('room.block');
    if (!hasPerm.ok) return hasPerm;

    const supabase = await createClient();
    const { error } = await supabase.rpc('release_room_block', {
      p_block_id: blockId,
    });

    if (error) {
      return fail(error.code);
    }

    revalidatePath('/facilities/room-blocks');
    revalidatePath('/check-in');
    return ok(undefined);
  } catch (err: unknown) {
    return fail('UNKNOWN');
  }
}
