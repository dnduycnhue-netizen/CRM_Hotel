"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/shared/auth/server";
import { type ActionResult, fail, ok } from "@/shared/errors";
import type { InHouseStay } from "./domain/types";

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

export async function confirmRoomCleanedAction(
  roomId: string,
  branchId: string,
): Promise<
  ActionResult<{ success: boolean; noop: boolean; stayId?: string | null }>
> {
  const auth = await requirePermission("stay.checkout", branchId);
  if (!auth.ok) return auth;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("confirm_room_cleaned", {
      p_room_id: roomId,
    });

    if (error) {
      if (error.message?.includes("room not found")) {
        return fail("NOT_FOUND", undefined, "Không tìm thấy thông tin phòng");
      }
      return fail(error.code);
    }

    revalidatePath("/stays");
    revalidatePath("/check-in");
    return ok({
      success: true,
      noop: (data as any)?.noop ?? false,
      stayId: (data as any)?.stay_id ?? null,
    });
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

  try {
    const supabase = await createClient();
    const { data: stay } = await (supabase.from("stays") as any)
      .select("created_at, branch_id")
      .eq("id", stayId)
      .maybeSingle();

    const targetBranchId = branchId || stay?.branch_id;
    const refTime = stay?.created_at || stay?.check_in_at;
    const isLate = refTime
      ? Date.now() - new Date(refTime).getTime() > 6 * 3600 * 1000
      : false;
    const requiredPerm = isLate ? "stay.cancel_late" : "stay.cancel";

    const auth = await requirePermission(requiredPerm, targetBranchId);
    if (!auth.ok) {
      return fail(
        "FORBIDDEN",
        undefined,
        isLate
          ? "Lượt ở đã nhận phòng quá 6 giờ. Cần quyền Quản lý/Thẩm quyền chuỗi (stay.cancel_late) để hủy."
          : "Bạn không có quyền hủy lượt ở này.",
      );
    }

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
    const { data, error } = await supabase.rpc(
      "get_stay_guests" as never,
      {
        p_stay_id: stayId,
      } as never,
    );

    if (error || !data) {
      return fail(
        error?.code,
        undefined,
        "Không thể tải danh sách khách lưu trú",
      );
    }

    return ok(data as StayGuestItem[]);
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
    dob?: string | null;
    phone?: string | null;
    docType?: "cccd" | "passport";
    docNumber?: string | null;
    documentType?: "cccd" | "passport";
    documentNumber?: string | null;
    countsForLoyalty?: boolean;
    note?: string | null;
  },
): Promise<ActionResult<{ guestId: string }>> {
  try {
    const supabase = await createClient();
    let targetBranchId = branchId;
    if (!targetBranchId) {
      const { data: stay } = await (supabase.from("stays") as any)
        .select("branch_id")
        .eq("id", stayId)
        .maybeSingle();
      if (stay?.branch_id) {
        targetBranchId = stay.branch_id;
      }
    }

    const auth = await requirePermission("companion.manage", targetBranchId);
    if (!auth.ok) return auth;

    const rawDocNum = guestData.docNumber || guestData.documentNumber;
    const rawDocType = guestData.docType || guestData.documentType || "cccd";
    const hasDoc = Boolean(rawDocNum && rawDocNum.trim().length >= 6);

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
              type: rawDocType,
              number: rawDocNum?.trim().toUpperCase(),
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
      } else if (error.message?.includes("companion needs a document")) {
        customMsg =
          "Người đi cùng mới bắt buộc phải nhập số giấy tờ (CCCD/Hộ chiếu)";
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
  try {
    const supabase = await createClient();
    let targetBranchId = branchId;
    if (!targetBranchId) {
      const { data: stay } = await (supabase.from("stays") as any)
        .select("branch_id")
        .eq("id", stayId)
        .maybeSingle();
      if (stay?.branch_id) {
        targetBranchId = stay.branch_id;
      }
    }

    const auth = await requirePermission("companion.manage", targetBranchId);
    if (!auth.ok) return auth;

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

export async function getInHouseStays(
  branchId?: string,
  statusFilter?: "all" | "in_house" | "checked_out" | "cancelled",
): Promise<InHouseStay[]> {
  try {
    const supabase = await createClient();
    let query = supabase.from("stays").select(`
        id,
        branch_id,
        branches (name),
        room_id,
        status,
        check_in_at,
        expected_check_out_at,
        checked_out_at,
        cancel_reason,
        created_at,
        source_channel_id,
        source_channels (name),
        partner_id,
        partners (name),
        rooms (number, room_type),
        stay_guests (
          is_primary,
          guests (id, full_name, phone)
        )
      `);

    if (statusFilter && statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    if (branchId) {
      query = query.eq("branch_id", branchId);
    }

    // Nếu chỉ xem đang ở thì xếp theo expected_check_out_at, nếu xem tất cả thì xếp theo check_in_at gần nhất
    if (statusFilter === "in_house") {
      query = query.order("expected_check_out_at", { ascending: true });
    } else {
      query = query.order("check_in_at", { ascending: false }).limit(100);
    }

    const { data, error } = await query;

    if (!error && Array.isArray(data)) {
      const now = new Date().toISOString();
      return data.map((s: any) => {
        const primary = s.stay_guests?.find((sg: any) => sg.is_primary)?.guests;
        const branch = Array.isArray(s.branches) ? s.branches[0] : s.branches;
        const room = Array.isArray(s.rooms) ? s.rooms[0] : s.rooms;
        const channel = Array.isArray(s.source_channels)
          ? s.source_channels[0]
          : s.source_channels;
        const partner = Array.isArray(s.partners) ? s.partners[0] : s.partners;
        return {
          id: s.id,
          branchId: s.branch_id,
          branchName: branch?.name || "",
          roomId: s.room_id,
          roomNumber: room?.number || "",
          roomType: room?.room_type || "Standard",
          primaryGuestId: primary?.id || "",
          primaryGuestName: primary?.full_name || "Khách lưu trú",
          primaryGuestPhone: primary?.phone || null,
          guestCount: s.stay_guests?.length || 1,
          checkInAt: s.check_in_at,
          expectedCheckOutAt: s.expected_check_out_at,
          checkedOutAt: s.checked_out_at || null,
          cancelReason: s.cancel_reason || null,
          createdAt: s.created_at || s.check_in_at,
          status: s.status || "in_house",
          isOverdue: s.status === "in_house" && s.expected_check_out_at < now,
          sourceChannelName: channel?.name || "Khách vãng lai (Quầy)",
          partnerId: s.partner_id || null,
          partnerName: partner?.name || null,
        };
      });
    }

    return [];
  } catch (error) {
    console.error("Lỗi khi lấy danh sách khách đang ở:", error);
    return [];
  }
}
