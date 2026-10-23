"use client";

import { AlertTriangle, ArrowRight, Check, UserCheck, X } from "lucide-react";
import React, { useState, useTransition } from "react";
import { toast } from "sonner";
import { formatDateTimeVN, formatDateVN } from "@/shared/utils/date";
import { approveMergeAction, rejectMergeAction } from "../actions";
import type { MergeRequestItem } from "../types";

interface Props {
  request: MergeRequestItem;
}

export function MergeApprovalCard({ request }: Props) {
  const [isPending, startTransition] = useTransition();
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Field-by-field choices: defaults to 'keep'
  const [fieldChoices, setFieldChoices] = useState<
    Record<string, "keep" | "drop">
  >({
    full_name: "keep",
    phone: "keep",
    dob: "keep",
    email: "keep",
    nationality: "keep",
    address_line: "keep",
  });

  const handleFieldChange = (field: string, choice: "keep" | "drop") => {
    setFieldChoices((prev) => ({ ...prev, [field]: choice }));
  };

  const handleApprove = () => {
    setStatusMsg(null);
    startTransition(async () => {
      const res = await approveMergeAction({
        request_id: request.id,
        field_choices: fieldChoices,
      });
      if (res.ok) {
        setStatusMsg({
          type: "success",
          text: "Đã hợp nhất hồ sơ thành công!",
        });
        toast.success("Đã hợp nhất hồ sơ thành công!");
      } else {
        const isAuthError =
          res.error.code === "UNAUTHENTICATED" ||
          res.error.message?.includes("AAL2") ||
          res.error.message?.includes("MFA");
        const errorText = isAuthError
          ? "Thao tác này yêu cầu xác thực 2 lớp (MFA/AAL2). Vui lòng đăng nhập với MFA."
          : `Không thể duyệt: ${res.error.message || res.error.code}`;
        setStatusMsg({ type: "error", text: errorText });
        toast.error(errorText);
      }
    });
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      setStatusMsg({
        type: "error",
        text: "Vui lòng nhập lý do từ chối hợp nhất hồ sơ",
      });
      toast.error("Vui lòng nhập lý do từ chối");
      return;
    }
    setStatusMsg(null);
    startTransition(async () => {
      const res = await rejectMergeAction({
        request_id: request.id,
        note: rejectReason,
      });
      if (res.ok) {
        setStatusMsg({
          type: "success",
          text: "Đã từ chối yêu cầu gộp hồ sơ.",
        });
        toast.success("Đã từ chối yêu cầu gộp hồ sơ");
        setShowRejectForm(false);
      } else {
        setStatusMsg({
          type: "error",
          text: `Lỗi: ${res.error.message || res.error.code}`,
        });
        toast.error(res.error.message || "Không thể từ chối yêu cầu");
      }
    });
  };

  const reasonLabels: Record<string, string> = {
    same_name_dob: "Trùng Họ Tên & Ngày Sinh",
    cccd_one_digit: "Số CCCD chỉ lệch 1 ký tự (Gõ nhầm)",
    same_phone: "Trùng Số Điện Thoại",
    manual: "Đề xuất thủ công từ Lễ tân / Quản lý",
  };

  const { keep_guest, drop_guest } = request;

  const compareFields = [
    {
      key: "full_name",
      label: "Họ và tên",
      keepVal: keep_guest.full_name,
      dropVal: drop_guest.full_name,
    },
    {
      key: "phone",
      label: "Số điện thoại",
      keepVal: keep_guest.phone || "Chưa có",
      dropVal: drop_guest.phone || "Chưa có",
    },
    {
      key: "doc_masked",
      label: "Giấy tờ / CCCD",
      keepVal: keep_guest.doc_masked || "Chưa có",
      dropVal: drop_guest.doc_masked || "Chưa có",
    },
    {
      key: "dob",
      label: "Ngày sinh",
      keepVal: keep_guest.dob ? formatDateVN(keep_guest.dob) : "Chưa có",
      dropVal: drop_guest.dob ? formatDateVN(drop_guest.dob) : "Chưa có",
    },
    {
      key: "email",
      label: "Email",
      keepVal: keep_guest.email || "Chưa có",
      dropVal: drop_guest.email || "Chưa có",
    },
    {
      key: "nationality",
      label: "Quốc tịch",
      keepVal: keep_guest.nationality || "Chưa có",
      dropVal: drop_guest.nationality || "Chưa có",
    },
    {
      key: "address_line",
      label: "Địa chỉ",
      keepVal: keep_guest.address_line || "Chưa có",
      dropVal: drop_guest.address_line || "Chưa có",
    },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
            <UserCheck className="w-5 h-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {reasonLabels[request.match_reason] || request.match_reason}
              </span>
              <span className="text-xs text-slate-400">
                Nguồn:{" "}
                {request.source === "system"
                  ? "Hệ thống tự động phát hiện"
                  : `Người dùng ${request.proposed_by_name || ""}`}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Tạo lúc: {formatDateTimeVN(request.created_at)}
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs font-medium text-slate-400">
            Trạng thái:
          </span>{" "}
          <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
            Chờ Giám đốc duyệt
          </span>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-3 rounded-lg text-sm ${
            statusMsg.type === "success"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
          }`}
        >
          {statusMsg.text}
        </div>
      )}

      {/* Side-by-side comparison table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-xs uppercase text-slate-400">
              <th className="py-2.5 px-3">Thuộc tính</th>
              <th className="py-2.5 px-3 bg-emerald-950/20 text-emerald-400 rounded-t-lg">
                Hồ sơ Giữ lại (Chính)
              </th>
              <th className="py-2.5 px-3 text-center text-slate-400">
                Chọn giá trị
              </th>
              <th className="py-2.5 px-3 bg-rose-950/20 text-rose-400 rounded-t-lg">
                Hồ sơ Sáp nhập (Sẽ gộp)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {compareFields.map((field) => {
              const isDiff =
                field.keepVal !== field.dropVal && field.dropVal !== "Chưa có";
              const choice = fieldChoices[field.key] || "keep";

              return (
                <tr key={field.key} className={isDiff ? "bg-amber-500/5" : ""}>
                  <td className="py-2.5 px-3 text-slate-300 font-medium">
                    {field.label}
                    {isDiff && (
                      <span
                        className="ml-1.5 inline-block w-2 h-2 rounded-full bg-amber-400"
                        title="Có sự khác biệt"
                      />
                    )}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-slate-200 ${choice === "keep" ? "font-semibold text-emerald-300" : "text-slate-400"}`}
                  >
                    {field.keepVal}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {field.key !== "doc_masked" ? (
                      <div className="inline-flex rounded-lg bg-slate-800 p-0.5 text-xs">
                        <button
                          type="button"
                          onClick={() => handleFieldChange(field.key, "keep")}
                          className={`px-2 py-1 rounded transition-colors ${
                            choice === "keep"
                              ? "bg-emerald-600 text-white font-medium"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          Giữ
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFieldChange(field.key, "drop")}
                          className={`px-2 py-1 rounded transition-colors ${
                            choice === "drop"
                              ? "bg-rose-600 text-white font-medium"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          Lấy phụ
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Hợp nhất</span>
                    )}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-slate-200 ${choice === "drop" ? "font-semibold text-rose-300" : "text-slate-400"}`}
                  >
                    {field.dropVal}
                  </td>
                </tr>
              );
            })}

            {/* Total Stays & Nights Summary */}
            <tr className="bg-slate-800/30 font-semibold">
              <td className="py-2.5 px-3 text-slate-300">
                Lịch sử lượt ở / đêm
              </td>
              <td className="py-2.5 px-3 text-emerald-400">
                {keep_guest.total_stays} lượt ({keep_guest.total_nights} đêm)
              </td>
              <td className="py-2.5 px-3 text-center text-xs text-indigo-400">
                <ArrowRight className="w-4 h-4 inline-block" /> Cộng dồn
              </td>
              <td className="py-2.5 px-3 text-rose-400">
                {drop_guest.total_stays} lượt ({drop_guest.total_nights} đêm)
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0 text-indigo-400 mt-0.5" />
        <div>
          <strong>Quy tắc hợp nhất tự động:</strong> Toàn bộ lượt ở (stays), ghi
          chú sở thích (notes), liên hệ đồng hành (companions), và lịch sử gắn
          cờ của hồ sơ phụ sẽ được chuyển sang hồ sơ chính. Hồ sơ phụ sẽ bị vô
          hiệu hóa an toàn.
        </div>
      </div>

      {/* Reject reason input */}
      {showRejectForm && (
        <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
          <label className="text-xs font-medium text-slate-300">
            Lý do từ chối gộp hồ sơ:
          </label>
          <input
            type="text"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Ví dụ: Hai khách khác nhau cùng gia đình, không được gộp..."
            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
          />
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowRejectForm(false)}
              className="px-3 py-1 text-xs text-slate-400 hover:text-white"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={handleReject}
              className="px-3 py-1 text-xs bg-rose-600 hover:bg-rose-500 text-white rounded font-medium disabled:opacity-50"
            >
              Xác nhận từ chối
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!showRejectForm && (
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() => setShowRejectForm(true)}
            className="px-4 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <X className="w-4 h-4" /> Từ chối
          </button>

          <button
            type="button"
            disabled={isPending}
            onClick={handleApprove}
            className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
          >
            <Check className="w-4 h-4" /> Phê duyệt hợp nhất
          </button>
        </div>
      )}
    </div>
  );
}
