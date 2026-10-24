"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/shared/auth/server";
import { type ActionResult, fail, ok } from "@/shared/errors";

export async function checkoutStayAction(
  stayId: string,
  branchId: string,
): Promise<ActionResult<{ success: boolean }>> {
  const auth = await requirePermission("stay.checkout", branchId);
  if (!auth.ok) return auth;

  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("checkout_stay", {
      p_stay_id: stayId,
      p_at: new Date().toISOString(),
    });

    if (error) {
      if (error.message?.includes("already checked out")) {
        return fail(
          "CONFLICT",
          undefined,
          "Lượt ở này đã được trả phòng trước đó",
        );
      }
      if (error.message?.includes("stay was cancelled")) {
        return fail("CONFLICT", undefined, "Lượt ở này đã bị hủy");
      }
      if (error.message?.includes("not found")) {
        return fail("NOT_FOUND", undefined, "Không tìm thấy thông tin lượt ở");
      }
      return fail(error.code);
    }

    revalidatePath("/stays");
    revalidatePath("/check-in");
    return ok({ success: true });
  } catch {
    return fail("UNKNOWN");
  }
}

export async function cancelStayAction(
  stayId: string,
  branchId: string,
  reason: string,
): Promise<ActionResult<{ success: boolean }>> {
  if (!reason || reason.trim().length < 5) {
    return fail("VALIDATION", undefined, "Lý do hủy phải có ít nhất 5 ký tự");
  }

  const auth = await requirePermission("stay.cancel", branchId);
  if (!auth.ok) return auth;

  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("cancel_stay", {
      p_stay_id: stayId,
      p_reason: reason.trim(),
    });

    if (error) {
      if (error.message?.includes("already cancelled")) {
        return fail("CONFLICT", undefined, "Lượt ở này đã bị hủy trước đó");
      }
      if (error.message?.includes("not found")) {
        return fail("NOT_FOUND", undefined, "Không tìm thấy thông tin lượt ở");
      }
      return fail(error.code);
    }

    revalidatePath("/stays");
    revalidatePath("/check-in");
    return ok({ success: true });
  } catch {
    return fail("UNKNOWN");
  }
}

export interface StayGuestItem {
  guestId: string;
  isPrimary: boolean;
  countsForLoyalty: boolean;
  fullName: string;
  phone: string | null;
  gender: string;
  dob: string | null;
  docType?: string | null;
  docNumber?: string | null;
}

export async function getStayGuestsAction(
  stayId: string,
): Promise<ActionResult<StayGuestItem[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await (supabase.from("stay_guests") as any)
      .select(`
        guest_id,
        is_primary,
        counts_for_loyalty,
        guests (
          id,
          full_name,
          phone,
          gender,
          dob,
          guest_documents (doc_type, doc_number)
        )
      `)
      .eq("stay_id", stayId)
      .order("is_primary", { ascending: false });

    if (error || !data) {
      return fail(
        error?.code,
        undefined,
        "Không thể tải danh sách khách lưu trú",
      );
    }

    const items: StayGuestItem[] = (data as any[]).map((sg) => {
      const g = sg.guests;
      const doc = Array.isArray(g?.guest_documents)
        ? g.guest_documents[0]
        : g?.guest_documents;
      return {
        guestId: sg.guest_id,
        isPrimary: Boolean(sg.is_primary),
        countsForLoyalty: Boolean(sg.counts_for_loyalty),
        fullName: g?.full_name || "Khách",
        phone: g?.phone || null,
        gender: g?.gender || "other",
        dob: g?.dob || null,
        docType: doc?.doc_type || null,
        docNumber: doc?.doc_number || null,
      };
    });

    return ok(items);
  } catch (err: any) {
    return fail(
      "UNKNOWN",
      undefined,
      err?.message || "Lỗi khi tải thông tin khách",
    );
  }
}

export async function addStayCompanionAction(
  stayId: string,
  branchId: string,
  guestData: {
    guestId?: string;
    fullName: string;
    gender: "male" | "female" | "other";
    dob?: string;
    phone?: string;
    documentType?: "cccd" | "passport";
    documentNumber?: string;
    countsForLoyalty?: boolean;
    note?: string;
  },
): Promise<ActionResult<{ guestId: string }>> {
  const auth = await requirePermission("companion.manage", branchId);
  if (!auth.ok) return auth;

  try {
    const supabase = await createClient();
    const hasDoc = Boolean(
      guestData.documentNumber && guestData.documentNumber.trim().length >= 6,
    );

    const { data, error } = await supabase.rpc("add_stay_companion", {
      p_stay_id: stayId,
      p_guest: {
        guest_id: guestData.guestId || null,
        full_name: guestData.fullName,
        gender: guestData.gender,
        dob: guestData.dob || null,
        phone: guestData.phone || null,
        document: hasDoc
          ? {
              type: guestData.documentType || "cccd",
              number: guestData.documentNumber?.trim().toUpperCase(),
              country: "VN",
            }
          : null,
        counts_for_loyalty: guestData.countsForLoyalty,
        note: guestData.note || null,
      },
    });

    if (error) {
      let customMsg = "Không thể thêm người đi cùng";
      if (error.message?.includes("stay is closed")) {
        customMsg = "Lượt ở đã kết thúc quá 24h, không thể thêm người đi cùng";
      } else if (error.message?.includes("maximum 10 companions")) {
        customMsg = "Tối đa 10 người đi cùng mỗi lượt ở";
      } else if (error.message?.includes("guest already in stay")) {
        customMsg = "Khách này đã có tên trong phòng";
      }
      return fail(error.code, undefined, customMsg);
    }

    revalidatePath("/stays");
    return ok({ guestId: (data as any)?.guest_id });
  } catch (err: any) {
    return fail(
      "UNKNOWN",
      undefined,
      err?.message || "Lỗi khi thêm người đi cùng",
    );
  }
}

export async function removeStayCompanionAction(
  stayId: string,
  branchId: string,
  guestId: string,
): Promise<ActionResult<void>> {
  const auth = await requirePermission("companion.manage", branchId);
  if (!auth.ok) return auth;

  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("remove_stay_companion", {
      p_stay_id: stayId,
      p_guest_id: guestId,
    });

    if (error) {
      let customMsg = "Không thể xóa người đi cùng";
      if (
        error.message?.includes("companion can only be removed on check-in day")
      ) {
        customMsg = "Chỉ có thể xóa người đi cùng trong ngày check-in";
      } else if (error.message?.includes("cannot remove primary guest")) {
        customMsg = "Không thể xóa khách đại diện của phòng";
      }
      return fail(error.code, undefined, customMsg);
    }

    revalidatePath("/stays");
    return ok(undefined);
  } catch (err: any) {
    return fail(
      "UNKNOWN",
      undefined,
      err?.message || "Lỗi khi xóa người đi cùng",
    );
  }
}

export async function setCompanionLoyaltyAction(
  stayId: string,
  branchId: string,
  guestId: string,
  counts: boolean,
): Promise<ActionResult<void>> {
  const auth = await requirePermission("companion.manage", branchId);
  if (!auth.ok) return auth;

  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("set_companion_loyalty", {
      p_stay_id: stayId,
      p_guest_id: guestId,
      p_counts: counts,
    });

    if (error) {
      let customMsg = "Không thể cập nhật quyền lợi hạng thành viên";
      if (
        error.message?.includes("primary guest must always count for loyalty")
      ) {
        customMsg = "Khách đại diện luôn được tính lượt tích lũy hạng";
      }
      return fail(error.code, undefined, customMsg);
    }

    revalidatePath("/stays");
    revalidatePath(`/guests/${guestId}`);
    return ok(undefined);
  } catch (err: any) {
    return fail(
      "UNKNOWN",
      undefined,
      err?.message || "Lỗi khi cập nhật tích lũy hạng",
    );
  }
}
