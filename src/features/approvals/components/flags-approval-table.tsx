"use client";

import {
  AlertTriangle,
  Building2,
  Check,
  FileText,
  ShieldAlert,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { decideFlagAction } from "../actions";
import type { PendingFlagItem } from "../types";

interface Props {
  flags: PendingFlagItem[];
}

export function FlagsApprovalTable({ flags }: Props) {
  const [isPending, startTransition] = useTransition();
  const [selectedFlagId, setSelectedFlagId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [statusMsg, setStatusMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleDecision = (id: string, approve: boolean, note?: string) => {
    setStatusMsg(null);
    startTransition(async () => {
      const res = await decideFlagAction({
        id,
        approve,
        note,
      });

      if (res.ok) {
        setStatusMsg({
          type: "success",
          text: approve
            ? "Đã phê duyệt gắn cờ thành công!"
            : "Đã từ chối đề xuất gắn cờ.",
        });
        setSelectedFlagId(null);
        setRejectNote("");
      } else {
        setStatusMsg({
          type: "error",
          text: `Thao tác thất bại: ${res.error.message || res.error.code}`,
        });
      }
    });
  };

  if (flags.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground">
        <ShieldAlert className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-base font-medium text-foreground/80">
          Không có đề xuất gắn cờ nào đang chờ duyệt
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Các đề xuất Blacklist hoặc Chú ý từ Lễ tân các cơ sở sẽ hiển thị tại
          đây.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {statusMsg && (
        <div
          className={`p-3 rounded-lg text-sm ${
            statusMsg.type === "success"
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
              : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20"
          }`}
        >
          {statusMsg.text}
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
                <th className="py-3 px-4">Khách hàng</th>
                <th className="py-3 px-4">Loại cờ đề xuất</th>
                <th className="py-3 px-4">Cơ sở & Người đề xuất</th>
                <th className="py-3 px-4">Lý do & Bằng chứng</th>
                <th className="py-3 px-4">Thời gian</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {flags.map((flag) => {
                const isBlacklist = flag.flag_type === "blacklist";
                return (
                  <tr
                    key={flag.id}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    {/* Guest info */}
                    <td className="py-3 px-4">
                      <Link
                        href={`/guests/${flag.guest_id}`}
                        className="font-medium text-foreground hover:text-indigo-800 transition-colors"
                      >
                        {flag.guest_name}
                      </Link>
                      <div className="text-xs text-muted-foreground mt-0.5 space-x-2">
                        {flag.guest_phone && <span>{flag.guest_phone}</span>}
                        {flag.guest_doc_masked && (
                          <span>• CCCD: {flag.guest_doc_masked}</span>
                        )}
                      </div>
                    </td>

                    {/* Flag Type */}
                    <td className="py-3 px-4">
                      {isBlacklist ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                          <ShieldAlert className="w-3.5 h-3.5" /> Blacklist toàn
                          chuỗi
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                          <AlertTriangle className="w-3.5 h-3.5" /> Cần chú ý
                          (Attention)
                        </span>
                      )}
                    </td>

                    {/* Proposing branch & user */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-xs text-foreground">
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{flag.branch_name}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Bởi: {flag.proposed_by_name || "Nhân viên"}
                      </div>
                    </td>

                    {/* Reason & Evidences */}
                    <td className="py-3 px-4 max-w-xs">
                      <p
                        className="text-xs text-foreground/80 line-clamp-2"
                        title={flag.reason}
                      >
                        {flag.reason}
                      </p>
                      {flag.evidence_paths &&
                        flag.evidence_paths.length > 0 && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-indigo-700 dark:text-indigo-400">
                            <FileText className="w-3 h-3" />
                            <span>
                              {flag.evidence_paths.length} tệp đính kèm
                            </span>
                          </div>
                        )}
                    </td>

                    {/* Timestamp */}
                    <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(flag.proposed_at).toLocaleDateString("vi-VN")}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      {selectedFlagId === flag.id ? (
                        <div className="inline-flex flex-col items-end gap-1.5">
                          <input
                            type="text"
                            placeholder="Ghi chú từ chối..."
                            value={rejectNote}
                            onChange={(e) => setRejectNote(e.target.value)}
                            className="bg-muted/40 border border-border rounded px-2 py-1 text-xs text-foreground w-44 focus:outline-none focus:ring-1 focus:ring-rose-500"
                          />
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedFlagId(null);
                                setRejectNote("");
                              }}
                              className="px-2 py-0.5 text-xs text-muted-foreground hover:text-white"
                            >
                              Hủy
                            </button>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() =>
                                handleDecision(flag.id, false, rejectNote)
                              }
                              className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-medium disabled:opacity-50"
                            >
                              Xác nhận từ chối
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => setSelectedFlagId(flag.id)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-800 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-colors"
                            title="Từ chối"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleDecision(flag.id, true)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" /> Phê duyệt
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
