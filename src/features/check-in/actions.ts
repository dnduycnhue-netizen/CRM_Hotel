"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/shared/auth/server";
import { type ActionResult, fail, ok, toFieldErrors } from "@/shared/errors";
import { toVnTimestamptz } from "@/shared/utils/date";
import type { RegistrationCardData } from "./domain/registration-types";
import { checkInSchema } from "./schemas";

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
  consents?: Record<string, boolean>;
}

export async function lookupGuestAction(
  branchId: string,
  kind: "phone" | "cccd" | "passport",
  value: string,
): Promise<ActionResult<GuestLookupResult | null>> {
  if (!value || value.trim().length < 4) {
    return ok(null);
  }

  const auth = await requirePermission("stay.create", branchId);
  if (!auth.ok) return auth;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("lookup_for_checkin", {
      p_branch: branchId,
      p_kind: kind,
      p_value: value.trim(),
    });

    if (error) {
      return fail(error.code);
    }

    if (!data) {
      return ok(null);
    }

    const m = (data as any).match;
    if (!m) {
      return ok(null);
    }

    const bl = m.flags?.find(
      (f: any) => f.type === "blacklist" && f.status === "approved",
    );

    const result: GuestLookupResult = {
      guestId: m.id,
      fullName: m.full_name || "",
      gender: m.gender || "male",
      dob: m.dob || null,
      nationality: m.nationality || "VN",
      phone: m.phone || null,
      docType: m.documents?.[0]?.type || null,
      docNumberMasked: m.documents?.[0]?.number || null,
      totalStays: m.stats?.total_stays ?? 0,
      lastStayBranchName: m.stats?.last_branch || null,
      lastStayDate: m.stats?.last_stay_at || null,
      recentNotes: m.notes?.map((n: any) => n.body) || [],
      tierId: m.tier?.tier_id || null,
      tierName: m.tier?.name || null,
      discountPct: m.tier?.discount_pct ?? 0,
      hasBlacklist: !!bl,
      blacklistReason: bl?.reason || null,
      consents: m.consents || {},
    };

    return ok(result);
  } catch (_err) {
    return fail("UNKNOWN");
  }
}

export async function checkInGuestAction(
  input: unknown,
): Promise<ActionResult<{ stayId: string; guestId: string }>> {
  const parsed = checkInSchema.safeParse(input);
  if (!parsed.success) {
    return fail("VALIDATION", toFieldErrors(parsed.error));
  }

  const data = parsed.data;

  // 1. Kiểm tra quyền
  const requiredPerm = data.isBackdated ? "stay.create_past" : "stay.create";
  const auth = await requirePermission(requiredPerm, data.branchId);
  if (!auth.ok) return auth;

  // 2. Gọi RPC check_in_guest
  try {
    const supabase = await createClient();

    // Resolve channel UUID
    let channelCodeOrId = data.sourceChannelCode;
    const channelAliases: Record<string, string> = {
      ota_booking: "booking_com",
      ota_agoda: "agoda",
      ota_expedia: "expedia",
      direct_phone: "phone_zalo",
    };
    if (channelAliases[channelCodeOrId]) {
      channelCodeOrId = channelAliases[channelCodeOrId];
    }

    let channelId = channelCodeOrId;
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        channelCodeOrId,
      );
    if (!isUuid) {
      const { data: ch } = await (supabase.from("source_channels") as any)
        .select("id")
        .eq("code", channelCodeOrId)
        .maybeSingle();
      if (ch) {
        channelId = (ch as any).id;
      } else {
        // Fallback về walk_in nếu mã kênh không khớp
        const { data: fallbackCh } = await (
          supabase.from("source_channels") as any
        )
          .select("id")
          .eq("code", "walk_in")
          .maybeSingle();
        if (fallbackCh) {
          channelId = (fallbackCh as any).id;
        }
      }
    }

    // Chỉ gửi document khi số giấy tờ hợp lệ và không chứa ký tự che mặt nạ (*)
    const hasCleanDoc =
      data.documentNumber &&
      !data.documentNumber.includes("*") &&
      data.documentNumber.trim().length >= 6;

    const payload = {
      branch_id: data.branchId,
      room_id: data.roomId,
      check_in_at: data.isBackdated
        ? toVnTimestamptz(data.actualCheckInAt) || null
        : undefined,
      expected_check_out_at:
        toVnTimestamptz(data.expectedCheckOutAt) || data.expectedCheckOutAt,
      checked_out_at: data.isBackdated
        ? toVnTimestamptz(data.actualCheckOutAt) || null
        : undefined,
      source_channel_id: channelId,
      partner_id:
        data.sourceChannelCode === "partner" ||
        data.sourceChannelCode === "corporate"
          ? data.partnerId || null
          : null,
      blacklist_ack: data.blacklistAck,
      note: data.notes || null,
      primary: {
        guest_id: data.guestId || null,
        full_name: data.fullName,
        gender: data.gender,
        dob: data.dob || null,
        nationality: (data.nationality || "VN").slice(0, 2).toUpperCase(),
        phone: data.phone || null,
        email: data.email || null,
        address_line: data.addressLine || null,
        province_code: data.provinceCode || null,
        document: hasCleanDoc
          ? {
              type: data.documentType,
              number: data.documentNumber?.trim().toUpperCase(),
              country: (data.nationality || "VN").slice(0, 2).toUpperCase(),
            }
          : null,
      },
      companions: (data.companions || []).map((c) => {
        const hasDoc = Boolean(
          c.documentNumber && c.documentNumber.trim().length >= 6,
        );
        return {
          guest_id: c.guestId || null,
          full_name: c.fullName,
          gender: c.gender,
          dob: c.dob || null,
          nationality: (c.nationality || "VN").slice(0, 2).toUpperCase(),
          phone: c.phone || null,
          document: hasDoc
            ? {
                type: c.documentType,
                number: c.documentNumber?.trim().toUpperCase(),
                country: (c.nationality || "VN").slice(0, 2).toUpperCase(),
              }
            : null,
          counts_for_loyalty: c.countsForLoyalty,
          note: c.notes || null,
        };
      }),
      consents: data.consents,
    };

    const { data: res, error } = await supabase.rpc("check_in_guest", {
      p_payload: payload,
    });

    if (error) {
      let code = error.code;
      let customMsg: string | undefined;

      if (error.message?.includes("room is occupied")) {
        code = "ROOM_OCCUPIED";
        customMsg = "Phòng đang có khách lưu trú";
      } else if (error.message?.includes("room is out of order")) {
        code = "ROOM_OUT_OF_ORDER";
        customMsg = "Phòng đang khóa ngừng bán (sự cố / bảo trì)";
      } else if (error.message?.includes("phone belongs to another guest")) {
        code = "DUPLICATE_PHONE";
        customMsg =
          "Số điện thoại này đang thuộc về khách khác (gợi ý gộp hồ sơ)";
      } else if (error.message?.includes("document belongs to another guest")) {
        code = "DUPLICATE_DOCUMENT";
        customMsg =
          "Số giấy tờ (CCCD/Passport) này đã thuộc về hồ sơ khách khác";
      } else if (
        error.message?.includes("blacklist acknowledgement required")
      ) {
        code = "BLACKLIST_ACK_REQUIRED";
        customMsg =
          "Khách có cảnh báo blacklist. Bắt buộc tick xác nhận đã đọc trước khi tiếp nhận";
      } else if (
        error.message?.includes("backdated stay needs a real check-out time")
      ) {
        code = "VALIDATION";
        customMsg =
          "Lượt ở nhập bù bắt buộc phải có thời gian trả phòng thực tế trong quá khứ";
      } else if (error.message?.includes("check-in time is in the future")) {
        code = "VALIDATION";
        customMsg = "Thời gian nhận phòng không thể nằm ở tương lai";
      } else if (error.message?.includes("room already used in that period")) {
        code = "ROOM_OCCUPIED";
        customMsg =
          "Phòng đã có khách lưu trú trong khoảng thời gian nhập bù này";
      } else if (error.message?.includes("source channel required")) {
        code = "VALIDATION";
        customMsg = "Vui lòng chọn nguồn khách hợp lệ";
      } else if (error.message?.includes("phone required for primary guest")) {
        code = "VALIDATION";
        customMsg = "Khách Việt Nam bắt buộc phải có số điện thoại liên hệ";
      }

      return fail(code, undefined, customMsg);
    }

    revalidatePath("/stays");
    revalidatePath("/check-in");
    revalidatePath("/reports");
    return ok(res as { stayId: string; guestId: string });
  } catch (err: any) {
    console.error("Lỗi checkInGuestAction:", err);
    return fail(
      "UNKNOWN",
      undefined,
      err?.message || "Đã có lỗi xảy ra khi thực hiện nhận phòng",
    );
  }
}

export async function getRegistrationCardDataAction(
  stayId: string,
): Promise<ActionResult<RegistrationCardData>> {
  const auth = await requirePermission("stay.view");
  if (!auth.ok) return auth;

  try {
    const supabase = await createClient();
    const { data: s, error } = await supabase
      .from("stays")
      .select(`
        id,
        check_in_at,
        expected_check_out_at,
        nights,
        note,
        external_ref,
        branches (name, code, address, phone),
        rooms (number, room_type),
        source_channels (name),
        stay_guests (
          is_primary,
          guests (
            id,
            full_name,
            phone,
            gender,
            dob,
            nationality,
            guest_documents (doc_type, doc_number)
          )
        )
      `)
      .eq("id", stayId)
      .maybeSingle();

    if (error || !s) {
      return fail("NOT_FOUND", undefined, "Không tìm thấy thông tin lượt ở");
    }

    const rawStay = s as any;
    const branch = Array.isArray(rawStay.branches)
      ? rawStay.branches[0]
      : rawStay.branches;
    const room = Array.isArray(rawStay.rooms)
      ? rawStay.rooms[0]
      : rawStay.rooms;
    const channel = Array.isArray(rawStay.source_channels)
      ? rawStay.source_channels[0]
      : rawStay.source_channels;

    const stayGuests = Array.isArray(rawStay.stay_guests)
      ? rawStay.stay_guests
      : [];
    const primarySG =
      stayGuests.find((sg: any) => sg.is_primary) || stayGuests[0];
    const primaryGuest = Array.isArray(primarySG?.guests)
      ? primarySG.guests[0]
      : primarySG?.guests;
    const primaryDocs = Array.isArray(primaryGuest?.guest_documents)
      ? primaryGuest.guest_documents
      : [];
    const primaryDoc = primaryDocs[0];

    const companionList: RegistrationCardData["companions"] = [];
    for (const sg of stayGuests) {
      if (sg === primarySG) continue;
      const g = Array.isArray(sg.guests) ? sg.guests[0] : sg.guests;
      if (!g) continue;
      const docs = Array.isArray(g.guest_documents) ? g.guest_documents : [];
      const doc = docs[0];
      companionList.push({
        id: g.id,
        fullName: g.full_name || "",
        gender: g.gender || "male",
        dob: g.dob || null,
        docType: doc?.doc_type || null,
        docNumber: doc?.doc_number || null,
      });
    }

    const cardData: RegistrationCardData = {
      stayId: rawStay.id,
      hotel: {
        name: branch?.name || "Khách sạn",
        code: branch?.code || "",
        address: branch?.address || null,
        phone: branch?.phone || null,
      },
      stay: {
        roomNumber: room?.number || "",
        roomType: room?.room_type || "Standard",
        checkInAt: rawStay.check_in_at,
        expectedCheckOutAt: rawStay.expected_check_out_at,
        nights: rawStay.nights || 1,
        sourceChannelName: channel?.name || "Khách trực tiếp",
        externalRef: rawStay.external_ref || null,
        note: rawStay.note || null,
      },
      guest: {
        id: primaryGuest?.id || "",
        fullName: primaryGuest?.full_name || "Khách lưu trú",
        phone: primaryGuest?.phone || null,
        gender: primaryGuest?.gender || "male",
        dob: primaryGuest?.dob || null,
        docType: primaryDoc?.doc_type || null,
        docNumber: primaryDoc?.doc_number || null,
        nationality: primaryGuest?.nationality || "Việt Nam",
      },
      companions: companionList,
    };

    return ok(cardData);
  } catch (err: any) {
    return fail(
      "UNKNOWN",
      undefined,
      err?.message || "Lỗi khi lấy thông tin phiếu đăng ký",
    );
  }
}
