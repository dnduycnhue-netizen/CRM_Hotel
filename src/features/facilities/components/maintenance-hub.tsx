"use client";

import {
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Loader2,
  Plus,
  Wrench,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type React from "react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@/shared/ui";
import { createPmPlanAction } from "../actions";
import type { InspectionItem, PmPlanItem } from "../data/maintenance";

interface Props {
  plans: PmPlanItem[];
  inspections: InspectionItem[];
  branches: Array<{ id: string; name: string }>;
}

export function MaintenanceHub({ plans, inspections, branches }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<"plans" | "inspections">("plans");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");

  // Create plan dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [planBranch, setPlanBranch] = useState(branches[0]?.id || "");
  const [planName, setPlanName] = useState("");
  const [planInterval, setPlanInterval] = useState("30");
  const [planChecklistText, setPlanChecklistText] = useState(
    "Kiểm tra vận hành kỹ thuật\nVệ sinh lọc gió và bề mặt\nSiết ốc và kiểm tra an toàn",
  );

  const handleCreatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!planName.trim()) {
      toast.error("Vui lòng nhập tên kế hoạch bảo trì");
      return;
    }

    startTransition(async () => {
      const checklistItems = planChecklistText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await createPmPlanAction({
        branch_id: planBranch,
        name: planName.trim(),
        interval_days: parseInt(planInterval, 10) || 30,
        checklist: checklistItems,
      });

      if (res.ok) {
        toast.success(`Đã tạo kế hoạch bảo trì: ${planName}`);
        setIsCreateOpen(false);
        setPlanName("");
        router.refresh();
      } else {
        toast.error(`Không thể tạo kế hoạch: ${res.error}`);
      }
    });
  };

  const filteredPlans = plans.filter((p) => {
    if (selectedBranch !== "all" && p.branch_id !== selectedBranch)
      return false;
    return true;
  });

  const filteredInspections = inspections.filter((ins) => {
    if (selectedBranch !== "all" && ins.branch_id !== selectedBranch)
      return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">
              Kế hoạch bảo trì định kỳ
            </p>
            <p className="text-2xl font-bold text-indigo-400 mt-1">
              {plans.length}
            </p>
          </div>
          <span className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400">
            <Wrench className="w-5 h-5" />
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">
              Lượt kiểm tra đã thực hiện
            </p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              {inspections.length}
            </p>
          </div>
          <span className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
            <ClipboardCheck className="w-5 h-5" />
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">
              Tự động sinh phiếu (Cron)
            </p>
            <p className="text-sm font-semibold text-emerald-400 mt-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Báo trước 7 ngày
            </p>
          </div>
          <span className="p-3 rounded-xl bg-slate-800 text-slate-300">
            <Clock className="w-5 h-5" />
          </span>
        </div>
      </div>

      {/* Filter and Tab switch */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3">
        <div className="flex space-x-6">
          <button
            type="button"
            onClick={() => setActiveTab("plans")}
            className={`pb-2 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === "plans"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Wrench className="w-4 h-4" />
            Kế hoạch bảo trì ({filteredPlans.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("inspections")}
            className={`pb-2 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === "inspections"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            Lịch sử kiểm tra ({filteredInspections.length})
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="h-8 text-xs font-semibold gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Tạo kế hoạch bảo trì</span>
          </Button>

          <div className="w-44">
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">Tất cả 8 cơ sở</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tab 1: Maintenance Plans */}
      {activeTab === "plans" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPlans.length === 0 ? (
            <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
              <Wrench className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-sm">Chưa có kế hoạch bảo trì định kỳ nào</p>
            </div>
          ) : (
            filteredPlans.map((plan) => (
              <div
                key={plan.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-sm hover:border-slate-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-slate-200 text-sm">
                      {plan.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-slate-500" />
                        {plan.branch_name}
                      </span>
                      {plan.asset_name && (
                        <span>• Thiết bị: {plan.asset_name}</span>
                      )}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 whitespace-nowrap">
                    Chu kỳ: {plan.interval_days} ngày
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 pt-1 border-t border-slate-800/80">
                  <div>
                    <span className="text-slate-500">Hạn kế tiếp:</span>{" "}
                    <strong className="text-amber-400">
                      {plan.next_due_date}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Đơn vị xử lý:</span>{" "}
                    <span>
                      {plan.vendor_name || plan.assignee_name || "Nội bộ KS"}
                    </span>
                  </div>
                </div>

                {plan.checklist && plan.checklist.length > 0 && (
                  <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800/60 text-xs text-slate-300 space-y-1">
                    <p className="font-medium text-slate-400 text-[11px] uppercase tracking-wider">
                      Hạng mục kiểm tra ({plan.checklist.length}):
                    </p>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-300 text-[11px]">
                      {plan.checklist.slice(0, 3).map((item, idx) => (
                        <li key={idx} className="truncate">
                          {item}
                        </li>
                      ))}
                      {plan.checklist.length > 3 && (
                        <li className="text-slate-500">
                          +{plan.checklist.length - 3} hạng mục khác...
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        /* Tab 2: Inspections Table */
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-xs uppercase text-slate-400">
                  <th className="py-3 px-4">Thời gian</th>
                  <th className="py-3 px-4">Cơ sở & Khu vực</th>
                  <th className="py-3 px-4">Mẫu kiểm tra</th>
                  <th className="py-3 px-4">Người kiểm tra</th>
                  <th className="py-3 px-4">Kết quả (Đạt / Không đạt)</th>
                  <th className="py-3 px-4">Điểm đánh giá</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredInspections.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 text-center text-slate-500 text-xs"
                    >
                      Chưa có biên bản kiểm tra nào được ghi nhận
                    </td>
                  </tr>
                ) : (
                  filteredInspections.map((ins) => (
                    <tr
                      key={ins.id}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-3 px-4 text-xs text-slate-300 whitespace-nowrap">
                        {new Date(ins.performed_at).toLocaleString("vi-VN")}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-200">
                        <div className="font-medium">{ins.branch_name}</div>
                        {ins.room_number && (
                          <span className="text-slate-400">
                            Phòng {ins.room_number}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs font-medium text-slate-200">
                        {ins.template_name}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-300">
                        {ins.inspector_name}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-emerald-400 font-semibold">
                            {ins.passed} Đạt
                          </span>
                          {ins.failed > 0 && (
                            <span className="text-rose-400 font-semibold">
                              / {ins.failed} Lỗi (Đã sinh sự cố)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {ins.score !== null && ins.score !== undefined ? (
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-bold ${
                              ins.score >= 90
                                ? "bg-emerald-500/10 text-emerald-400"
                                : ins.score >= 75
                                  ? "bg-amber-500/10 text-amber-400"
                                  : "bg-rose-500/10 text-rose-400"
                            }`}
                          >
                            {ins.score}%
                          </span>
                        ) : (
                          <span className="text-slate-500 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Maintenance Plan Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-indigo-500" />
              <span>Thiết lập Kế hoạch Bảo trì Định kỳ</span>
            </DialogTitle>
            <DialogDescription>
              Tạo chu kỳ kiểm tra, bảo dưỡng tự động sinh phiếu công việc cho kỹ
              thuật
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreatePlan} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="planBranch" className="text-xs font-semibold">
                Cơ sở áp dụng *
              </Label>
              <select
                id="planBranch"
                value={planBranch}
                onChange={(e) => setPlanBranch(e.target.value)}
                className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                required
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="planName" className="text-xs font-semibold">
                Tên kế hoạch bảo trì *
              </Label>
              <Input
                id="planName"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                placeholder="VD: Bảo dưỡng hệ thống điều hòa VRV mùa hè"
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="planInterval" className="text-xs font-semibold">
                Chu kỳ lặp lại (ngày) *
              </Label>
              <select
                id="planInterval"
                value={planInterval}
                onChange={(e) => setPlanInterval(e.target.value)}
                className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              >
                <option value="15">Mỗi 15 ngày (Nửa tháng)</option>
                <option value="30">Mỗi 30 ngày (1 tháng)</option>
                <option value="90">Mỗi 90 ngày (Hàng quý)</option>
                <option value="180">Mỗi 180 ngày (Nửa năm)</option>
                <option value="365">Mỗi 365 ngày (Hàng năm)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="planChecklist" className="text-xs font-semibold">
                Danh mục hạng mục kiểm tra (Mỗi dòng 1 mục)
              </Label>
              <textarea
                id="planChecklist"
                value={planChecklistText}
                onChange={(e) => setPlanChecklistText(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none font-mono"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                disabled={isPending}
                className="h-9 text-xs"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="h-9 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
              >
                {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Lưu kế hoạch</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
