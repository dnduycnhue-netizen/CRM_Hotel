"use server";

import { type ActionResult, fail, ok } from "@/shared/errors";
import { getSystemNotifications } from "./data/queries";
import type { NotificationSummary } from "./domain/types";

export async function getNotificationsAction(
  branchId?: string | null,
): Promise<ActionResult<NotificationSummary>> {
  try {
    const summary = await getSystemNotifications(branchId);
    return ok(summary);
  } catch (err: any) {
    return fail(
      "UNKNOWN",
      undefined,
      err?.message || "Lỗi khi lấy danh sách cảnh báo",
    );
  }
}
