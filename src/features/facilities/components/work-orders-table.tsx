"use client";

import {
  Building2,
  CheckCircle2,
  CheckSquare,
  Clock,
  DoorOpen,
  Lock,
  Play,
  Plus,
  User,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/shared/ui";
import { formatDateTimeVN } from "@/shared/utils/date";
import { transitionWorkOrderAction } from "../actions";
import type { WorkOrder, WorkOrderStatus } from "../types";

interface WorkOrdersTableProps {
  initialOrders: WorkOrder[];
  branches: Array<{ id: string; name: string; code: string }>;
  currentBranchId: string | null;
}

export function WorkOrdersTable({
  initialOrders,
  branches,
  currentBranchId,
}: WorkOrdersTableProps) {
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isPending, startTransition] = useTransition();

  // Action modal state
  const [activeOrder, setActiveOrder] = useState<WorkOrder | null>(null);
  const [actionType, setActionType] = useState<"done" | "close" | null>(null);
  const [resolution, setResolution] = useState("");
  const [laborCost, setLaborCost] = useState("0");
  const [partsCost, setPartsCost] = useState("0");

  const [confirmCloseOrder, setConfirmCloseOrder] = useState<WorkOrder | null>(
    null,
  );

  const filtered = initialOrders.filter((wo) => {
    if (selectedBranch !== "all" && wo.branch_id !== selectedBranch)
      return false;
    if (statusFilter !== "all") {
      if (
        statusFilter === "open" &&
        ["closed", "cancelled"].includes(wo.status)
      )
        return false;
      if (statusFilter === "urgent" && wo.priority !== "urgent") return false;
      if (statusFilter === "blocked" && !wo.blocks_room) return false;
      if (statusFilter === "done" && wo.status !== "done") return false;
    }
    return true;
  });

  const handleStartWork = (order: WorkOrder) => {
    startTransition(async () => {
      const res = await transitionWorkOrderAction({
        id: order.id,
        to: "in_progress",
        expected_status: order.status,
      });
      if (res.ok) {
        toast.success(`Đã chuyển phiếu #${order.number} sang Đang xử lý`);
      } else {
        toast.error(res.error.message || "Không thể cập nhật trạng thái");
      }
    });
  };

  const handleCompleteWork = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder || !resolution.trim()) return;

    startTransition(async () => {
      const res = await transitionWorkOrderAction({
        id: activeOrder.id,
        to: "done",
        expected_status: activeOrder.status,
        patch: {
          resolution: resolution.trim(),
          labor_cost: Number(laborCost) || 0,
          parts_cost: Number(partsCost) || 0,
        },
      });
      if (res.ok) {
        toast.success(
          `Đã hoàn thành và chuyển phiếu #${activeOrder.number} sang chờ nghiệm thu`,
        );
        setActiveOrder(null);
        setActionType(null);
        setResolution("");
      } else {
        toast.error(res.error.message || "Không thể gửi nghiệm thu");
      }
    });
  };

  const handleExecuteClose = (order: WorkOrder) => {
    startTransition(async () => {
      const res = await transitionWorkOrderAction({
        id: order.id,
        to: "closed",
        expected_status: order.status,
      });
      if (res.ok) {
        toast.success(`Đã nghiệm thu đạt và đóng phiếu #${order.number}`);
        setConfirmCloseOrder(null);
      } else {
        toast.error(res.error.message || "Không thể đóng phiếu");
      }
    });
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case "urgent":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
            Khẩn cấp (4h)
          </span>
        );
      case "high":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">
            Cao (24h)
          </span>
        );
      case "normal":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700">
            Bình thường
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
            Thấp
          </span>
        );
    }
  };

  const getStatusBadge = (s: WorkOrderStatus) => {
    switch (s) {
      case "new":
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            Mới tạo
          </span>
        );
      case "assigned":
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            Đã giao
          </span>
        );
      case "in_progress":
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
            Đang xử lý
          </span>
        );
      case "done":
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Chờ nghiệm thu
          </span>
        );
      case "closed":
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
            Đã đóng
          </span>
        );
      case "cancelled":
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-600">
            Đã hủy
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
            {s}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Wrench className="w-6 h-6 text-indigo-600" />
            Phiếu sự cố & Sửa chữa thiết bị
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Quản lý quy trình xử lý sự cố buồng phòng, SLA và nghiệm thu mở
            phòng
          </p>
        </div>

        <Link href="/facilities/report">
          <Button className="rounded-xl font-medium bg-indigo-600 hover:bg-indigo-700 text-white">
            <Plus className="w-4 h-4 mr-1.5" />
            Báo sự cố mới
          </Button>
        </Link>
      </div>

      {/* Filter toolbar */}
      <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-slate-400 font-medium">Cơ sở:</span>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="text-xs py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 font-medium text-slate-800 dark:text-slate-200 outline-none"
          >
            {branches.length > 1 && (
              <option value="all">Toàn bộ {branches.length} cơ sở</option>
            )}
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          {[
            { id: "all", label: "Tất cả" },
            { id: "open", label: "Đang mở (chưa đóng)" },
            { id: "urgent", label: "Khẩn cấp" },
            { id: "blocked", label: "Phòng đang khóa" },
            { id: "done", label: "Chờ nghiệm thu" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg border text-xs transition ${
                statusFilter === tab.id
                  ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold"
                  : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table list */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/70 dark:bg-slate-800/40 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Mã & Tiêu đề</th>
                <th className="py-3.5 px-4">Vị trí</th>
                <th className="py-3.5 px-4">Ưu tiên / SLA</th>
                <th className="py-3.5 px-4">Trạng thái</th>
                <th className="py-3.5 px-4">Người xử lý</th>
                <th className="py-3.5 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-12 text-center text-slate-400 text-xs"
                  >
                    Không có phiếu sự cố nào phù hợp bộ lọc.
                  </td>
                </tr>
              ) : (
                filtered.map((wo) => {
                  const isOverdue =
                    wo.due_at &&
                    new Date(wo.due_at) < new Date() &&
                    !["done", "closed", "cancelled"].includes(wo.status);

                  return (
                    <tr
                      key={wo.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-2.5">
                          <span className="font-mono text-xs font-bold text-slate-400 mt-0.5">
                            #{wo.number}
                          </span>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-slate-100">
                              {wo.title}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                              <span>
                                Báo lúc:{" "}
                                {new Date(wo.reported_at).toLocaleString(
                                  "vi-VN",
                                )}
                              </span>
                              {wo.reporter_name && (
                                <span>bởi {wo.reporter_name}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-xs">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {wo.branch_name}
                        </div>
                        {wo.room_number ? (
                          <div className="flex items-center gap-1 text-slate-500 mt-0.5">
                            <DoorOpen className="w-3.5 h-3.5 text-slate-400" />
                            <span>Phòng {wo.room_number}</span>
                            {wo.blocks_room && (
                              <span className="ml-1 px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold text-[10px] flex items-center gap-0.5">
                                <Lock className="w-2.5 h-2.5" /> Khóa phòng
                              </span>
                            )}
                          </div>
                        ) : wo.location_name ? (
                          <div className="flex items-center gap-1 text-slate-500 mt-0.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>{wo.location_name}</span>
                          </div>
                        ) : null}
                      </td>

                      <td className="py-3.5 px-4">
                        <div>{getPriorityBadge(wo.priority)}</div>
                        {wo.due_at && (
                          <div
                            className={`text-[11px] flex items-center gap-1 mt-1 font-medium ${
                              isOverdue
                                ? "text-rose-600 font-bold"
                                : "text-slate-400"
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            {isOverdue ? "Quá hạn: " : "Hạn: "}
                            {formatDateTimeVN(wo.due_at)}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {getStatusBadge(wo.status)}
                      </td>

                      <td className="py-3.5 px-4 text-xs">
                        {wo.assignee_name ? (
                          <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                            <User className="w-3 h-3 text-indigo-500" />
                            {wo.assignee_name}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">
                            Chưa phân công
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {wo.status === "new" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStartWork(wo)}
                              disabled={isPending}
                              className="h-8 text-xs font-semibold rounded-lg text-indigo-600 hover:text-indigo-700"
                            >
                              <Play className="w-3 h-3 mr-1" />
                              Bắt đầu
                            </Button>
                          )}

                          {["assigned", "in_progress", "on_hold"].includes(
                            wo.status,
                          ) && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setActiveOrder(wo);
                                setActionType("done");
                              }}
                              disabled={isPending}
                              className="h-8 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              <CheckSquare className="w-3 h-3 mr-1" />
                              Hoàn thành
                            </Button>
                          )}

                          {wo.status === "done" && (
                            <Button
                              size="sm"
                              onClick={() => setConfirmCloseOrder(wo)}
                              disabled={isPending}
                              className="h-8 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Nghiệm thu
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Done Modal: Nhập kết quả xử lý và chi phí */}
      {actionType === "done" && activeOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Báo cáo hoàn thành phiếu #{activeOrder.number}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setActiveOrder(null);
                  setActionType(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCompleteWork} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Nội dung khắc phục / Kết quả sửa chữa{" "}
                  <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder="VD: Đã thông tắc ống thoát nước điều hòa, thay rơ-le nhiệt, kiểm tra chạy thử 30 phút đạt tiêu chuẩn..."
                  rows={3}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Chi phí phụ tùng / Vật tư (VNĐ)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={partsCost}
                    onChange={(e) => setPartsCost(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Chi phí nhân công ngoài (VNĐ)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={laborCost}
                    onChange={(e) => setLaborCost(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setActiveOrder(null);
                    setActionType(null);
                  }}
                  className="rounded-xl text-xs"
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={isPending || !resolution.trim()}
                  className="rounded-xl px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs"
                >
                  Gửi nghiệm thu
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Confirm Modal: Thay thế browser confirm native */}
      {confirmCloseOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Nghiệm thu đạt phiếu #{confirmCloseOrder.number}?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {confirmCloseOrder.title} ({confirmCloseOrder.branch_name})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Sau khi xác nhận nghiệm thu đạt, phiếu sẽ được đóng lại. Nếu có
              phòng bị khóa ngừng bán (OOO), phòng sẽ tự động được mở bán trở
              lại.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmCloseOrder(null)}
                className="rounded-xl"
              >
                Hủy bỏ
              </Button>
              <Button
                type="button"
                disabled={isPending}
                onClick={() => handleExecuteClose(confirmCloseOrder)}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
              >
                {isPending ? "Đang đóng..." : "Xác nhận nghiệm thu"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
