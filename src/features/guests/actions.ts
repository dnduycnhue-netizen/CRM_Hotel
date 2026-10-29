"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/shared/auth/server";
import { type ActionResult, fail, ok, toFieldErrors } from "@/shared/errors";
import {
  type AddGuestNoteInput,
  addGuestNoteSchema,
  type CreateGuestInput,
  createGuestSchema,
  guestTierOverrideSchema,
  type SetGuestConsentInput,
  setGuestConsentSchema,
  type UpdateGuestInput,
  updateGuestSchema,
} from "./schemas";
import type { ConsentHistoryItem, GuestTierInfo } from "./types";

export async function createGuestAction(
  rawInput: CreateGuestInput,
): Promise<ActionResult<{ guest_id: string; existing: boolean }>> {
  try {
    const parsed = createGuestSchema.safeParse(rawInput);
    if (!parsed.success) {
      return fail("VALIDATION", toFieldErrors(parsed.error));
    }

    const hasPerm = await requirePermission("guest.create");
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
      province_code: parsed.data.province_code || null,
      source_channel_id: parsed.data.source_channel_id || null,
      tags: parsed.data.tags || [],
      document: parsed.data.document
        ? {
            type: parsed.data.document.type,
            number: parsed.data.document.number,
            country: parsed.data.document.country || "VN",
          }
        : null,
    };

    const { data, error } = await supabase.rpc("create_guest", {
      p: payload,
    });

    if (error) {
      return fail(error.code);
    }

    revalidatePath("/guests");
    return ok(data as { guest_id: string; existing: boolean });
  } catch (_err: unknown) {
    return fail("UNKNOWN");
  }
}

export async function updateGuestAction(
  guestId: string,
  rawPatch: UpdateGuestInput,
  expectedUpdatedAt: string,
): Promise<ActionResult<{ id: string; updated: boolean }>> {
  try {
    const parsed = updateGuestSchema.safeParse(rawPatch);
    if (!parsed.success) {
      return fail("VALIDATION", toFieldErrors(parsed.error));
    }

    const hasPerm = await requirePermission("guest.update");
    if (!hasPerm.ok) {
      return hasPerm;
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("update_guest", {
      p_guest_id: guestId,
      p_patch: parsed.data,
      p_expected_updated_at: expectedUpdatedAt,
    });

    if (error) {
      return fail(error.code);
    }

    revalidatePath(`/guests/${guestId}`);
    revalidatePath("/guests");
    return ok(data as { id: string; updated: boolean });
  } catch (_err: unknown) {
    return fail("UNKNOWN");
  }
}

export async function addGuestNoteAction(
  rawInput: AddGuestNoteInput,
): Promise<ActionResult<any>> {
  try {
    const parsed = addGuestNoteSchema.safeParse(rawInput);
    if (!parsed.success) {
      return fail("VALIDATION", toFieldErrors(parsed.error));
    }

    const hasPerm = await requirePermission("guest.note_create");
    if (!hasPerm.ok) {
      return hasPerm;
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("add_guest_note", {
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
  } catch (_err: unknown) {
    return fail("UNKNOWN");
  }
}

export async function deleteGuestNoteAction(
  noteId: string,
  guestId: string,
): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("delete_guest_note", {
      p_note_id: noteId,
    });

    if (error) {
      return fail(error.code);
    }

    revalidatePath(`/guests/${guestId}`);
    return ok(undefined);
  } catch (_err: unknown) {
    return fail("UNKNOWN");
  }
}

export async function setGuestTagsAction(
  guestId: string,
  tags: string[],
): Promise<ActionResult<void>> {
  try {
    const hasPerm = await requirePermission("guest.tag_manage");
    if (!hasPerm.ok) {
      return hasPerm;
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("set_guest_tags", {
      p_guest_id: guestId,
      p_tags: tags,
    });

    if (error) {
      return fail(error.code);
    }

    revalidatePath(`/guests/${guestId}`);
    return ok(undefined);
  } catch (_err: unknown) {
    return fail("UNKNOWN");
  }
}

export async function assignSalesOwnerAction(
  guestId: string,
  userId: string | null,
): Promise<ActionResult<void>> {
  try {
    const hasPerm = await requirePermission("guest.assign_owner");
    if (!hasPerm.ok) {
      return hasPerm;
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("assign_sales_owner", {
      p_guest_id: guestId,
      p_user_id: userId,
    });

    if (error) {
      return fail(error.code);
    }

    revalidatePath(`/guests/${guestId}`);
    revalidatePath("/guests");
    return ok(undefined);
  } catch (_err: unknown) {
    return fail("UNKNOWN");
  }
}

export async function setGuestConsentAction(
  arg1: string | SetGuestConsentInput,
  channel?: string,
  granted?: boolean,
  note?: string,
): Promise<ActionResult<void>> {
  try {
    let input: SetGuestConsentInput;
    if (typeof arg1 === "object" && arg1 !== null) {
      input = arg1 as SetGuestConsentInput;
    } else {
      input = {
        guestId: arg1,
        channel: channel as any,
        granted: Boolean(granted),
        source: "front_desk",
        note: note || null,
      };
    }

    const parsed = setGuestConsentSchema.safeParse(input);
    if (!parsed.success) {
      return fail("VALIDATION", toFieldErrors(parsed.error));
    }

    const hasPerm = await requirePermission("consent.manage");
    if (!hasPerm.ok) {
      return hasPerm;
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("set_guest_consent", {
      p_guest_id: parsed.data.guestId,
      p_channel: parsed.data.channel,
      p_granted: parsed.data.granted,
      p_source: parsed.data.source || "front_desk",
      p_note: parsed.data.note || null,
    });

    if (error) {
      return fail(error.code);
    }

    revalidatePath(`/guests/${parsed.data.guestId}`);
    return ok(undefined);
  } catch (_err: unknown) {
    return fail("UNKNOWN");
  }
}

export async function getGuestConsentHistoryAction(
  guestId: string,
): Promise<ActionResult<ConsentHistoryItem[]>> {
  try {
    const hasPerm = await requirePermission("guest.view_summary");
    if (!hasPerm.ok) {
      return hasPerm;
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_guest_consent_history", {
      p_guest_id: guestId,
    });

    if (error) {
      return fail(error.code);
    }

    return ok((data as any[]) || []);
  } catch (_err: unknown) {
    return fail("UNKNOWN");
  }
}

export async function exportGuestsAction(options?: {
  consentChannel?: string;
  reason?: string;
}): Promise<ActionResult<{ filename: string; base64: string; count: number }>> {
  try {
    const hasExportPerm = await requirePermission("guest.export");
    if (!hasExportPerm.ok) {
      return hasExportPerm;
    }

    const hasExportFullPerm = await requirePermission("guest.export_full");
    const _allowFull = hasExportFullPerm.ok;
    const consentChannel = options?.consentChannel || null;

    const supabase = await createClient();
    const { data, error } = await (supabase.rpc as any)("export_guests", {
      p_reason:
        options?.reason ||
        (consentChannel
          ? `Xuất danh sách khách đồng ý nhận tin kênh ${consentChannel.toUpperCase()}`
          : "Xuất danh sách khách hàng phục vụ quản lý chuỗi"),
      p_limit: 1000,
      p_consent_channel: consentChannel,
    });

    if (error || !data) {
      console.error("Lỗi RPC export_guests:", error);
      return fail(
        (error?.code as any) || "UNKNOWN",
        undefined,
        error?.message
          ? `Lỗi truy vấn dữ liệu: ${error.message}`
          : "Không thể lấy danh sách khách hàng để xuất Excel",
      );
    }

    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "CRM Chuỗi Khách Sạn";
    workbook.created = new Date();

    const sheetName = consentChannel
      ? `Đồng ý ${consentChannel.toUpperCase()}`
      : "Danh sách khách hàng";

    const sheet = workbook.addWorksheet(sheetName, {
      views: [{ showGridLines: true }],
    });

    const columns: any[] = [
      { header: "STT", key: "stt", width: 8 },
      { header: "Họ và tên", key: "full_name", width: 25 },
      { header: "Giới tính", key: "gender", width: 12 },
      { header: "Số điện thoại / Zalo", key: "phone", width: 18 },
    ];

    if (!consentChannel) {
      columns.push({
        header: "Số giấy tờ (CCCD/Passport)",
        key: "doc",
        width: 24,
      });
      columns.push({ header: "Ngày sinh", key: "dob", width: 15 });
    }

    columns.push(
      { header: "Email", key: "email", width: 25 },
      { header: "Quốc tịch", key: "nationality", width: 14 },
      { header: "Tổng lượt ở", key: "stays", width: 14 },
      { header: "Tổng số đêm", key: "nights", width: 14 },
      { header: "Nhãn khách (Tags)", key: "tags", width: 22 },
      { header: "Sales phụ trách", key: "sales", width: 20 },
    );

    sheet.columns = columns;

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: consentChannel ? "FF0D9488" : "FF1E1B4B" },
    };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };
    headerRow.height = 26;

    data.forEach((g: any, idx: number) => {
      const genderMap: Record<string, string> = {
        male: "Nam",
        female: "Nữ",
        other: "Khác",
      };

      const row: any = {
        stt: idx + 1,
        full_name: g.full_name,
        gender: genderMap[g.gender] || g.gender || "",
        phone: g.phone || "",
        email: g.email || "",
        nationality: g.nationality || "VN",
        stays: g.total_stays ?? 0,
        nights: g.total_nights ?? 0,
        tags: Array.isArray(g.tags) ? g.tags.join(", ") : "",
        sales: g.sales_name || "",
      };

      if (!consentChannel) {
        row.doc = g.doc_number || "";
        row.dob = g.dob || "";
      }

      sheet.addRow(row);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = consentChannel
      ? `DanhSach_DongY_${consentChannel.toUpperCase()}_${dateStr}.xlsx`
      : `KhachHang_CRM_${dateStr}.xlsx`;

    return ok({
      filename,
      base64,
      count: data.length,
    });
  } catch (err: any) {
    console.error("Lỗi xuất Excel khách hàng:", err);
    return fail(
      "UNKNOWN",
      undefined,
      err?.message
        ? `Lỗi tạo tệp Excel: ${err.message}`
        : "Đã xảy ra lỗi khi tạo tệp Excel",
    );
  }
}

export async function proposeGuestFlagAction(input: {
  guest_id: string;
  branch_id: string;
  flag_type: "blacklist" | "attention";
  reason: string;
  evidence_paths?: string[];
}): Promise<ActionResult<{ flag_id: string }>> {
  try {
    const hasPerm = await requirePermission(
      "blacklist.propose",
      input.branch_id,
    );
    if (!hasPerm.ok) return hasPerm;

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("propose_flag", {
      p_guest_id: input.guest_id,
      p_branch_id: input.branch_id,
      p_type: input.flag_type,
      p_reason: input.reason,
      p_evidence: input.evidence_paths || [],
    });

    if (error) return fail(error.code);

    revalidatePath("/approvals");
    revalidatePath(`/guests/${input.guest_id}`);
    return ok({ flag_id: data as string });
  } catch (_err: unknown) {
    return fail("UNKNOWN");
  }
}

export async function searchCandidateGuestsAction(
  query: string,
  excludeGuestId: string,
): Promise<
  ActionResult<
    Array<{
      id: string;
      full_name: string;
      phone: string | null;
      email: string | null;
      dob: string | null;
      nationality: string;
    }>
  >
> {
  try {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return ok([]);
    }

    const hasPerm = await requirePermission("guest.search");
    if (!hasPerm.ok) return hasPerm;

    const supabase = await createClient();
    const { data, error } = await (supabase.from("guests") as any)
      .select("id, full_name, phone, email, dob, nationality")
      .is("merged_into", null)
      .neq("id", excludeGuestId)
      .or(
        `phone.ilike.%${trimmed}%,full_name.ilike.%${trimmed}%,email.ilike.%${trimmed}%`,
      )
      .limit(10);

    if (error) {
      return fail(error.code);
    }

    return ok(
      (data as Array<{
        id: string;
        full_name: string;
        phone: string | null;
        email: string | null;
        dob: string | null;
        nationality: string;
      }>) || [],
    );
  } catch (_err: unknown) {
    return fail("UNKNOWN");
  }
}

export async function proposeGuestMergeAction(params: {
  keepGuestId: string;
  dropGuestId: string;
  reason: string;
}): Promise<ActionResult<{ request_id: string }>> {
  try {
    const hasPerm = await requirePermission("merge.propose");
    if (!hasPerm.ok) return hasPerm;

    const trimmedReason = params.reason.trim();
    if (!trimmedReason || trimmedReason.length < 5) {
      return fail("VALIDATION", {
        reason: ["Lý do đề xuất phải từ 5 ký tự trở lên"],
      });
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("propose_merge", {
      p_keep: params.keepGuestId,
      p_drop: params.dropGuestId,
      p_reason: trimmedReason,
    });

    if (error) return fail(error.code);

    revalidatePath("/approvals");
    revalidatePath(`/guests/${params.keepGuestId}`);
    return ok({ request_id: data as string });
  } catch (_err: unknown) {
    return fail("UNKNOWN");
  }
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
