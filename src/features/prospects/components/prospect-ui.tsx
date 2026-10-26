"use client";

import { Badge } from "@/components/ui/badge";
import { formatDateVN } from "@/shared/utils/date";
import { prospectStatusLabels } from "../schemas";
import type { DuplicateMatchType, ProspectStatus } from "../types";

const STATUS_STYLES: Record<ProspectStatus, string> = {
  new: "border-slate-400 text-slate-600 bg-slate-50 dark:bg-slate-900/40 dark:text-slate-300",
  contacted:
    "border-sky-500 text-sky-700 bg-sky-50 dark:bg-sky-950/30 dark:text-sky-300",
  nurturing:
    "border-indigo-500 text-indigo-700 bg-indigo-50 dark:bg-indigo-950/30 dark:text-indigo-300",
  negotiating:
    "border-amber-500 text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-300",
  converted:
    "border-emerald-500 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-300",
  lost: "border-rose-400 text-rose-700 bg-rose-50 dark:bg-rose-950/30 dark:text-rose-300",
  duplicate:
    "border-purple-400 text-purple-700 bg-purple-50 dark:bg-purple-950/30 dark:text-purple-300",
};

export function ProspectStatusBadge({ status }: { status: ProspectStatus }) {
  return (
    <Badge variant="outline" className={STATUS_STYLES[status]}>
      {prospectStatusLabels[status] ?? status}
    </Badge>
  );
}

export const duplicateMatchLabels: Record<DuplicateMatchType, string> = {
  hard_tax: "Trùng mã số thuế",
  hard_phone: "Trùng số điện thoại",
  soft_name: "Tên công ty giống nhau",
  soft_domain: "Cùng website",
  soft_guest_phone: "SĐT trùng khách lẻ",
};

export const duplicateSourceLabels: Record<string, string> = {
  prospect: "Khách tiềm năng",
  partner: "Đối tác",
  guest: "Khách lẻ",
  file: "Dòng khác trong file",
};

/** Ngày (YYYY-MM-DD) hoặc ISO → DD/MM/YYYY; rỗng → "—" */
export function fmtDate(value: string | null | undefined): string {
  if (!value) return "—";
  return formatDateVN(value) || "—";
}

/** Hôm nay theo giờ Việt Nam, dạng YYYY-MM-DD (dùng làm min cho ô chọn ngày) */
export function todayVn(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date());
  return parts;
}

export const selectClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring";
export const textareaClass = selectClass;
