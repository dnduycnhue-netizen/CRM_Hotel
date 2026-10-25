"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { messages } from "@/shared/i18n/vi";

/**
 * Hiện thông báo khi guard trang chuyển hướng về trang chủ do thiếu quyền
 * (cờ `?denied=1`), sau đó xoá cờ khỏi URL để reload không báo lại.
 */
export function AccessDeniedToast() {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("denied") !== "1") return;
    toast.error(messages.errors.PAGE_FORBIDDEN);
    url.searchParams.delete("denied");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }, []);

  return null;
}
