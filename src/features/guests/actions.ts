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
    if (!hasPerm.ok) {
      return hasPerm;
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
    if (!hasPerm.ok) {
      return hasPerm;
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
    if (!hasPerm.ok) {
      return hasPerm;
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
    if (!hasPerm.ok) {
      return hasPerm;
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
    if (!hasPerm.ok) {
      return hasPerm;
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
    if (!hasPerm.ok) {
      return hasPerm;
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

export async function exportGuestsAction(): Promise<
  ActionResult<{ filename: string; base64: string; count: number }>
> {
  try {
    const hasExportPerm = await requirePermission('guest.export');
    if (!hasExportPerm.ok) {
      return hasExportPerm;
    }

    const hasExportFullPerm = await requirePermission('guest.export_full');
    const allowFull = hasExportFullPerm.ok;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('guests')
      .select(`
        id,
        full_name,
        gender,
        dob,
        phone,
        email,
        nationality,
        tags,
        sales_owner:profiles!guests_sales_owner_id_fkey(full_name),
        stats:guest_stats(total_stays, total_nights),
        documents:guest_documents(doc_number, doc_type)
      `)
      .is('merged_into', null)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error || !data) {
      return fail('UNKNOWN');
    }

    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CRM Chuỗi Khách Sạn';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Danh sách khách hàng', {
      views: [{ showGridLines: true }],
    });

    sheet.columns = [
      { header: 'STT', key: 'stt', width: 8 },
      { header: 'Họ và tên', key: 'full_name', width: 25 },
      { header: 'Giới tính', key: 'gender', width: 12 },
      { header: 'Số điện thoại', key: 'phone', width: 18 },
      { header: 'Số giấy tờ (CCCD/Passport)', key: 'doc', width: 24 },
      { header: 'Ngày sinh', key: 'dob', width: 15 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Quốc tịch', key: 'nationality', width: 14 },
      { header: 'Tổng lượt ở', key: 'stays', width: 14 },
      { header: 'Tổng số đêm', key: 'nights', width: 14 },
      { header: 'Nhãn khách (Tags)', key: 'tags', width: 22 },
      { header: 'Sales phụ trách', key: 'sales', width: 20 },
    ];

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E1B4B' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 26;

    data.forEach((g: any, idx: number) => {
      const stats = Array.isArray(g.stats) ? g.stats[0] : g.stats;
      const doc = Array.isArray(g.documents) ? g.documents[0] : g.documents;

      let phoneDisplay = g.phone || '';
      let docDisplay = doc?.doc_number || '';
      let dobDisplay = g.dob || '';

      if (!allowFull) {
        if (phoneDisplay.length >= 7) {
          phoneDisplay = phoneDisplay.slice(0, 3) + '****' + phoneDisplay.slice(-3);
        }
        if (docDisplay.length >= 7) {
          docDisplay = docDisplay.slice(0, 3) + '******' + docDisplay.slice(-3);
        } else if (docDisplay) {
          docDisplay = '******' + docDisplay.slice(-4);
        }
        if (dobDisplay.length >= 4) {
          dobDisplay = dobDisplay.slice(0, 4); // Chỉ hiện năm sinh
        }
      }

      const genderMap: Record<string, string> = {
        male: 'Nam',
        female: 'Nữ',
        other: 'Khác',
      };

      sheet.addRow({
        stt: idx + 1,
        full_name: g.full_name,
        gender: genderMap[g.gender] || g.gender || '',
        phone: phoneDisplay,
        doc: docDisplay,
        dob: dobDisplay,
        email: g.email || '',
        nationality: g.nationality || 'VN',
        stays: stats?.total_stays ?? 0,
        nights: stats?.total_nights ?? 0,
        tags: Array.isArray(g.tags) ? g.tags.join(', ') : '',
        sales: g.sales_owner?.full_name || '',
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const filename = `KhachHang_CRM_${new Date().toISOString().slice(0, 10)}.xlsx`;

    // Log security audit event
    await supabase.rpc('log_event' as any, {
      p_action: 'guest.export_excel',
      p_entity: 'guests',
      p_meta: {
        exported_count: data.length,
        has_full_view: allowFull,
      },
    });

    return ok({
      filename,
      base64,
      count: data.length,
    });
  } catch (err: unknown) {
    return fail('UNKNOWN');
  }
}

export async function proposeGuestFlagAction(input: {
  guest_id: string;
  branch_id: string;
  flag_type: 'blacklist' | 'attention';
  reason: string;
  evidence_paths?: string[];
}): Promise<ActionResult<{ flag_id: string }>> {
  try {
    const hasPerm = await requirePermission('blacklist.propose', input.branch_id);
    if (!hasPerm.ok) return hasPerm;

    const supabase = await createClient();
    const { data, error } = await supabase.rpc('propose_flag', {
      p_guest_id: input.guest_id,
      p_branch_id: input.branch_id,
      p_type: input.flag_type,
      p_reason: input.reason,
      p_evidence: input.evidence_paths || [],
    });

    if (error) return fail(error.code);

    revalidatePath('/approvals');
    revalidatePath(`/guests/${input.guest_id}`);
    return ok({ flag_id: data as string });
  } catch (err: unknown) {
    return fail('UNKNOWN');
  }
}
