import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/shared/auth/server";
import { formatDateTimeVN, getVnDateString } from "@/shared/utils/date";
import type {
  AppNotification,
  NotificationSummary,
} from "../domain/types";

export async function getSystemNotifications(
  branchId?: string | null,
): Promise<NotificationSummary> {
  const session = await getSession();
  if (!session) {
    return {
      total: 0,
      urgentCount: 0,
      warningCount: 0,
      infoCount: 0,
      items: [],
    };
  }

  const targetBranchId = branchId || session.currentBranchId || null;
  const supabase = await createClient();
  const notifications: AppNotification[] = [];
  const now = new Date();
  const nowIso = now.toISOString();

  const canViewStays =
    session.can("stay.view", targetBranchId || undefined) ||
    session.can("stay.view");
  const canViewCompliance =
    session.can("compliance.view", targetBranchId || undefined) ||
    session.can("facility.view", targetBranchId || undefined);
  const canViewWO =
    session.can("wo.view", targetBranchId || undefined) ||
    session.can("wo.view");
  const canApprove =
    session.can("blacklist.approve") || session.can("merge.approve");

  // 1. CẢNH BÁO: Khách trả phòng quá hạn (Overdue checkout)
  if (canViewStays) {
    try {
      let query = supabase
        .from("stays")
        .select(`
          id,
          branch_id,
          room_id,
          expected_check_out_at,
          note,
          branches (name),
          rooms (number, room_type),
          stay_guests (
            is_primary,
            guests (id, full_name, phone)
          )
        `)
        .eq("status", "in_house")
        .lt("expected_check_out_at", nowIso)
        .order("expected_check_out_at", { ascending: true })
        .limit(20);

      if (targetBranchId) {
        query = query.eq("branch_id", targetBranchId);
      }

      const { data: overdueStays } = await query;

      if (Array.isArray(overdueStays)) {
        for (const s of overdueStays as any[]) {
          const room = Array.isArray(s.rooms) ? s.rooms[0] : s.rooms;
          const branch = Array.isArray(s.branches) ? s.branches[0] : s.branches;
          const primary = s.stay_guests?.find(
            (sg: any) => sg.is_primary,
          )?.guests;

          const expTime = new Date(s.expected_check_out_at).getTime();
          const diffMinutes = Math.max(
            1,
            Math.round((now.getTime() - expTime) / 60000),
          );
          const diffHours = Math.floor(diffMinutes / 60);
          const remainMins = diffMinutes % 60;
          const durationStr =
            diffHours > 0
              ? `${diffHours}h${remainMins > 0 ? `${remainMins}p` : ""}`
              : `${remainMins} phút`;

          notifications.push({
            id: `overdue-${s.id}`,
            category: "overdue_stay",
            severity: "urgent",
            title: `Phòng ${room?.number || "—"} quá hạn trả phòng`,
            description: `${primary?.full_name || "Khách"} đã quá hạn ${durationStr} (Dự kiến trả: ${formatDateTimeVN(s.expected_check_out_at, "short")})`,
            branchId: s.branch_id,
            branchName: branch?.name || "",
            href: "/stays",
            createdAt: s.expected_check_out_at,
            meta: {
              roomNumber: room?.number,
              guestName: primary?.full_name,
              stayId: s.id,
            },
          });
        }
      }
    } catch {
      // Bỏ qua nếu lỗi query
    }
  }

  // 2. CẢNH BÁO: Khách đang ở có ghi chú / yêu cầu cần chú ý
  if (canViewStays) {
    try {
      let query = supabase
        .from("stays")
        .select(`
          id,
          branch_id,
          room_id,
          note,
          expected_check_out_at,
          branches (name),
          rooms (number),
          stay_guests (
            is_primary,
            guests (id, full_name)
          )
        `)
        .eq("status", "in_house")
        .not("note", "is", null)
        .order("created_at", { ascending: false })
        .limit(15);

      if (targetBranchId) {
        query = query.eq("branch_id", targetBranchId);
      }

      const { data: notedStays } = await query;

      if (Array.isArray(notedStays)) {
        for (const s of notedStays as any[]) {
          if (!s.note || s.note.trim().length === 0) continue;
          const room = Array.isArray(s.rooms) ? s.rooms[0] : s.rooms;
          const branch = Array.isArray(s.branches) ? s.branches[0] : s.branches;
          const primary = s.stay_guests?.find(
            (sg: any) => sg.is_primary,
          )?.guests;

          notifications.push({
            id: `note-${s.id}`,
            category: "guest_attention",
            severity: "info",
            title: `P.${room?.number || "—"} - ${primary?.full_name || "Khách"}: Ghi chú cần lưu ý`,
            description: s.note.trim(),
            branchId: s.branch_id,
            branchName: branch?.name || "",
            href: "/stays",
            createdAt: nowIso,
            meta: {
              roomNumber: room?.number,
              guestName: primary?.full_name,
            },
          });
        }
      }
    } catch {
      // Bỏ qua nếu lỗi
    }
  }

  // 3. CẢNH BÁO: Giấy phép, hồ sơ pháp lý sắp hết hạn hoặc đã hết hạn
  if (canViewCompliance) {
    try {
      let query = supabase
        .from("compliance_docs")
        .select(`
          id,
          branch_id,
          number,
          expires_on,
          branches (name),
          doc_type:compliance_doc_types (name, remind_days)
        `)
        .eq("is_current", true)
        .not("expires_on", "is", null)
        .order("expires_on", { ascending: true })
        .limit(20);

      if (targetBranchId) {
        query = query.eq("branch_id", targetBranchId);
      }

      const { data: docs } = await query;

      if (Array.isArray(docs)) {
        const todayStr = getVnDateString();
        const todayMs = new Date(todayStr).getTime();

        for (const d of docs as any[]) {
          const docType = Array.isArray(d.doc_type) ? d.doc_type[0] : d.doc_type;
          const branch = Array.isArray(d.branches) ? d.branches[0] : d.branches;
          const expMs = new Date(d.expires_on).getTime();
          const diffDays = Math.round((expMs - todayMs) / 86400000);
          const remindDays = docType?.remind_days || 30;

          if (diffDays <= remindDays) {
            const isExpired = diffDays < 0;
            notifications.push({
              id: `doc-${d.id}`,
              category: "expiring_doc",
              severity: isExpired || diffDays <= 7 ? "urgent" : "warning",
              title: isExpired
                ? `Giấy phép ĐÃ HẾT HẠN: ${docType?.name || "Hồ sơ pháp lý"}`
                : `Giấy phép sắp hết hạn (${diffDays} ngày): ${docType?.name || "Hồ sơ"}`,
              description: `Số hiệu: ${d.number || "Chưa có"} • Hết hạn ngày: ${formatDateTimeVN(d.expires_on, "dateOnly")}${branch?.name ? ` (${branch.name})` : ""}`,
              branchId: d.branch_id,
              branchName: branch?.name || "",
              href: "/facilities/compliance",
              createdAt: d.expires_on,
              meta: {
                docId: d.id,
                daysRemaining: diffDays,
              },
            });
          }
        }
      }
    } catch {
      // Bỏ qua nếu lỗi
    }
  }

  // 4. CẢNH BÁO: Sự cố CSVC khẩn cấp hoặc quá hạn xử lý
  if (canViewWO) {
    try {
      let query = supabase
        .from("work_orders")
        .select(`
          id,
          number,
          branch_id,
          title,
          priority,
          status,
          due_at,
          branches (name),
          rooms (number)
        `)
        .in("status", ["new", "assigned", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(20);

      if (targetBranchId) {
        query = query.eq("branch_id", targetBranchId);
      }

      const { data: orders } = await query;

      if (Array.isArray(orders)) {
        for (const wo of orders as any[]) {
          const room = Array.isArray(wo.rooms) ? wo.rooms[0] : wo.rooms;
          const branch = Array.isArray(wo.branches) ? wo.branches[0] : wo.branches;
          const isUrgent = wo.priority === "urgent";
          const isOverdue = wo.due_at && new Date(wo.due_at).getTime() < now.getTime();

          if (isUrgent || isOverdue) {
            notifications.push({
              id: `wo-${wo.id}`,
              category: "urgent_wo",
              severity: "urgent",
              title: isUrgent
                ? `Sự cố KHẨN CẤP #${wo.number}${room?.number ? ` (P.${room.number})` : ""}`
                : `Phiếu sửa chữa #${wo.number} quá hạn xử lý`,
              description: wo.title,
              branchId: wo.branch_id,
              branchName: branch?.name || "",
              href: `/facilities/work-orders/${wo.id}`,
              createdAt: wo.due_at || nowIso,
              meta: {
                workOrderId: wo.id,
                workOrderNumber: wo.number,
              },
            });
          }
        }
      }
    } catch {
      // Bỏ qua nếu lỗi
    }
  }

  // 5. CẢNH BÁO: Đề xuất cờ cảnh báo / gộp hồ sơ cần duyệt (Dành cho Quản lý / Chủ chuỗi)
  if (canApprove) {
    try {
      const { data: proposedFlags } = await supabase
        .from("guest_flags")
        .select(`
          id,
          flag_type,
          reason,
          proposed_at,
          branch_id,
          branches (name),
          guests (full_name)
        `)
        .eq("status", "proposed")
        .order("proposed_at", { ascending: false })
        .limit(10);

      if (Array.isArray(proposedFlags)) {
        for (const f of proposedFlags as any[]) {
          const guest = Array.isArray(f.guests) ? f.guests[0] : f.guests;
          const branch = Array.isArray(f.branches) ? f.branches[0] : f.branches;
          notifications.push({
            id: `flag-${f.id}`,
            category: "approval_pending",
            severity: "warning",
            title: `Đề xuất cờ ${f.flag_type === "blacklist" ? "Blacklist" : f.flag_type} cần duyệt`,
            description: `Khách: ${guest?.full_name || "—"} • Lý do: ${f.reason}`,
            branchId: f.branch_id,
            branchName: branch?.name || "",
            href: "/approvals",
            createdAt: f.proposed_at,
          });
        }
      }
    } catch {
      // Bỏ qua nếu lỗi
    }
  }

  // Sắp xếp thông báo: Khẩn cấp (urgent) lên đầu, tiếp đến Cảnh báo (warning), rồi đến Info
  const severityScore: Record<string, number> = {
    urgent: 3,
    warning: 2,
    info: 1,
  };

  notifications.sort((a, b) => {
    const scoreDiff =
      (severityScore[b.severity] || 0) - (severityScore[a.severity] || 0);
    if (scoreDiff !== 0) return scoreDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const urgentCount = notifications.filter((n) => n.severity === "urgent").length;
  const warningCount = notifications.filter((n) => n.severity === "warning").length;
  const infoCount = notifications.filter((n) => n.severity === "info").length;

  return {
    total: notifications.length,
    urgentCount,
    warningCount,
    infoCount,
    items: notifications,
  };
}
