"use client";

import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Edit,
  Eye,
  Info,
  Loader2,
  MoreVertical,
  Pause,
  Play,
  Plus,
  Trash2,
  Wrench,
  XCircle,
  Zap,
} from "lucide-react";
import Link from "next/link";
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
import {
  createPmPlanAction,
  deletePmPlanAction,
  triggerPmPlanNowAction,
  updatePmPlanAction,
} from "../actions";
import type {
  ChecklistTemplateItem,
  InspectionItem,
  PmPlanItem,
} from "../data/maintenance";

interface Props {
  plans: PmPlanItem[];
  inspections: InspectionItem[];
  templates: ChecklistTemplateItem[];
  branches: Array<{ id: string; name: string }>;
  canManagePm?: boolean;
  canPerformInspection?: boolean;
}

export function MaintenanceHub({
  plans,
  inspections,
  templates,
  branches,
  canManagePm = true,
  canPerformInspection = true,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<"plans" | "inspections">("plans");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");

  // Create plan dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [planBranch, setPlanBranch] = useState(branches[0]?.id || "");
  const [planName, setPlanName] = useState("");
  const [planInterval, setPlanInterval] = useState("30");
  const [planTemplateId, setPlanTemplateId] = useState<string>("");
  const [planChecklistText, setPlanChecklistText] = useState(
    "Kiểm tra vận hành kỹ thuật\nVệ sinh lọc gió và bề mặt\nSiết ốc và kiểm tra an toàn",
  );

  // Edit plan dialog state
  const [editingPlan, setEditingPlan] = useState<PmPlanItem | null>(null);
  const [editPlanName, setEditPlanName] = useState("");
  const [editPlanInterval, setEditPlanInterval] = useState("30");
  const [editPlanTemplateId, setEditPlanTemplateId] = useState("");
  const [editPlanChecklistText, setEditPlanChecklistText] = useState("");
  const [editPlanIsActive, setEditPlanIsActive] = useState(true);

  // Triggering plan state
  const [triggeringPlanId, setTriggeringPlanId] = useState<string | null>(null);

  // Inspection details dialog
  const [viewingInspection, setViewingInspection] =
    useState<InspectionItem | null>(null);

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

  const openEditModal = (plan: PmPlanItem) => {
    setEditingPlan(plan);
    setEditPlanName(plan.name);
    setEditPlanInterval(String(plan.interval_days));
    setEditPlanTemplateId(plan.template_id || "");
    setEditPlanChecklistText((plan.checklist || []).join("\n"));
    setEditPlanIsActive(plan.is_active);
  };

  const handleUpdatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    if (!editPlanName.trim()) {
      toast.error("Vui lòng nhập tên kế hoạch");
      return;
    }

    startTransition(async () => {
      const checklistItems = editPlanChecklistText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await updatePmPlanAction({
        id: editingPlan.id,
        name: editPlanName.trim(),
        interval_days: parseInt(editPlanInterval, 10) || 30,
        template_id: editPlanTemplateId ? editPlanTemplateId : null,
        checklist: checklistItems,
        is_active: editPlanIsActive,
      });

      if (res.ok) {
        toast.success("Đã cập nhật kế hoạch bảo trì!");
        setEditingPlan(null);
        router.refresh();
      } else {
        toast.error(`Lỗi: ${res.error || "Không thể cập nhật kế hoạch"}`);
      }
    });
  };

  const handleToggleActive = (plan: PmPlanItem) => {
    startTransition(async () => {
      const nextActive = !plan.is_active;
      const res = await updatePmPlanAction({
        id: plan.id,
        is_active: nextActive,
      });

      if (res.ok) {
        toast.success(
          nextActive
            ? `Đã kích hoạt lại kế hoạch "${plan.name}"`
            : `Đã tạm dừng kế hoạch "${plan.name}"`,
        );
        router.refresh();
      } else {
        toast.error(`Lỗi: ${res.error || "Không thể thay đổi trạng thái"}`);
      }
    });
  };

  const handleDeletePlan = (plan: PmPlanItem) => {
    if (
      !confirm(
        `Bạn có chắc chắn muốn xóa/ngưng kế hoạch bảo trì "${plan.name}"?`,
      )
    ) {
      return;
    }

    startTransition(async () => {
      const res = await deletePmPlanAction(plan.id);
      if (res.ok) {
        toast.success(
          res.data.action === "deleted"
            ? "Đã xóa kế hoạch bảo trì"
            : "Kế hoạch đã có lịch sử phiếu công việc, đã chuyển sang trạng thái ngưng áp dụng",
        );
        router.refresh();
      } else {
        toast.error(`Lỗi: ${res.error || "Không thể xóa kế hoạch"}`);
      }
    });
  };

  const handleTriggerNow = (plan: PmPlanItem) => {
    if (
      !confirm(
        `Tạo ngay một Phiếu sự cố / Bảo trì kỹ thuật cho "${plan.name}"? Hệ thống sẽ giao việc ngay và cập nhật ngày đến hạn kế tiếp.`,
      )
    ) {
      return;
    }

    setTriggeringPlanId(plan.id);
    startTransition(async () => {
      const res = await triggerPmPlanNowAction(plan.id);
      setTriggeringPlanId(null);
      if (res.ok) {
        toast.success(
          `Đã tạo phiếu bảo trì #${res.data.work_order_number} thành công!`,
        );
        router.refresh();
      } else {
        toast.error(`Lỗi: ${res.error || "Không thể tạo phiếu bảo trì"}`);
      }
    });
  };

  const handleSelectTemplateForCreate = (templateId: string) => {
    setPlanTemplateId(templateId);
    if (!templateId) return;
    const tmpl = templates.find((t) => t.id === templateId);
    if (tmpl && tmpl.items && tmpl.items.length > 0) {
      setPlanChecklistText(tmpl.items.map((i) => i.label).join("\n"));
    }
  };

  const handleSelectTemplateForEdit = (templateId: string) => {
    setEditPlanTemplateId(templateId);
    if (!templateId) return;
    const tmpl = templates.find((t) => t.id === templateId);
    if (tmpl && tmpl.items && tmpl.items.length > 0) {
      setEditPlanChecklistText(tmpl.items.map((i) => i.label).join("\n"));
    }
  };

  // Due date helper
  const getDueBadge = (dueDateStr: string, isActive: boolean) => {
    if (!isActive) {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
          Đang tạm dừng
        </span>
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDateStr);
    due.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil(
      (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays < 0) {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          <span>Quá hạn {Math.abs(diffDays)} ngày</span>
        </span>
      );
    }
    if (diffDays <= 7) {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>
            Đến hạn {diffDays === 0 ? "hôm nay" : `trong ${diffDays} ngày`}
          </span>
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        Còn {diffDays} ngày
      </span>
    );
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
              Mẫu kiểm tra chuẩn (Checklist)
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-bold text-sky-400">
                {templates.filter((t) => t.is_active).length}
              </span>
              <Link
                href="/settings/checklists"
                className="text-[11px] text-indigo-400 hover:text-indigo-300 underline font-medium"
              >
                Cài đặt mẫu
              </Link>
            </div>
          </div>
          <span className="p-3 rounded-xl bg-sky-500/10 text-sky-400">
            <ClipboardList className="w-5 h-5" />
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
          {canPerformInspection && (
            <Link href="/facilities/inspections/new">
              <Button
                size="sm"
                className="h-8 text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              >
                <ClipboardCheck className="h-3.5 w-3.5" />
                <span>+ Thực hiện kiểm tra phòng</span>
              </Button>
            </Link>
          )}

          {canManagePm && (
            <Button
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              className="h-8 text-xs font-semibold gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Tạo kế hoạch bảo trì</span>
            </Button>
          )}

          {branches.length === 1 ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs font-medium text-slate-200">
              <Building2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>{branches[0]?.name}</span>
            </div>
          ) : (
            <div className="w-44">
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {branches.length > 1 && (
                  <option value="all">Tất cả {branches.length} cơ sở</option>
                )}
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Tab 1: Maintenance Plans */}
      {activeTab === "plans" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPlans.length === 0 ? (
            <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
              <Wrench className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-sm">Chưa có kế hoạch bảo trì định kỳ nào</p>
              {canManagePm && (
                <Button
                  size="sm"
                  onClick={() => setIsCreateOpen(true)}
                  className="mt-3 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Tạo kế hoạch đầu tiên
                </Button>
              )}
            </div>
          ) : (
            filteredPlans.map((plan) => (
              <div
                key={plan.id}
                className={`bg-slate-900 border rounded-xl p-4 space-y-3 shadow-sm hover:border-slate-700 transition-colors flex flex-col justify-between ${
                  !plan.is_active
                    ? "opacity-60 border-slate-800/60"
                    : "border-slate-800"
                }`}
              >
                <div className="space-y-3">
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
                      <span className="text-slate-500 block text-[11px]">
                        Hạn bảo trì:
                      </span>
                      <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <strong className="text-slate-200">
                          {plan.next_due_date}
                        </strong>
                        {getDueBadge(plan.next_due_date, plan.is_active)}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">
                        Đơn vị xử lý:
                      </span>
                      <span className="text-slate-300 mt-0.5 block truncate">
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

                {/* Plan card footer actions */}
                {canManagePm && (
                  <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-800/80 text-xs">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTriggerNow(plan)}
                      disabled={isPending || triggeringPlanId === plan.id}
                      className="h-7 text-[11px] font-semibold gap-1 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                    >
                      {triggeringPlanId === plan.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Zap className="w-3 h-3" />
                      )}
                      <span>Tạo phiếu ngay</span>
                    </Button>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(plan)}
                        className="h-7 px-2 text-[11px] text-slate-400 hover:text-slate-200"
                        title={plan.is_active ? "Tạm dừng" : "Kích hoạt lại"}
                      >
                        {plan.is_active ? (
                          <Pause className="w-3.5 h-3.5" />
                        ) : (
                          <Play className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(plan)}
                        className="h-7 px-2 text-[11px] text-indigo-400 hover:text-indigo-300"
                        title="Chỉnh sửa kế hoạch"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletePlan(plan)}
                        className="h-7 px-2 text-[11px] text-rose-400 hover:text-rose-300"
                        title="Xóa kế hoạch"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
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
                  <th className="py-3 px-4">Cơ sở & Vị trí</th>
                  <th className="py-3 px-4">Mẫu kiểm tra</th>
                  <th className="py-3 px-4">Người kiểm tra</th>
                  <th className="py-3 px-4">Kết quả</th>
                  <th className="py-3 px-4">Điểm số</th>
                  <th className="py-3 px-4">Sự cố sinh ra</th>
                  <th className="py-3 px-4 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredInspections.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-10 text-center text-slate-500 text-xs"
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
                        {ins.room_number ? (
                          <span className="text-slate-400">
                            Phòng {ins.room_number}
                          </span>
                        ) : ins.location_name ? (
                          <span className="text-slate-400">
                            {ins.location_name}
                          </span>
                        ) : null}
                      </td>
                      <td className="py-3 px-4 text-xs font-medium text-slate-200">
                        {ins.template_name}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-300">
                        {ins.inspector_name}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-emerald-400 font-semibold">
                            {ins.passed} Đạt
                          </span>
                          {ins.failed > 0 && (
                            <span className="text-rose-400 font-semibold">
                              / {ins.failed} Lỗi
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
                      <td className="py-3 px-4">
                        {ins.work_order_count && ins.work_order_count > 0 ? (
                          <Link
                            href="/facilities/work-orders"
                            className="inline-flex items-center gap-1 text-xs font-bold text-rose-400 hover:text-rose-300 hover:underline"
                          >
                            <Wrench className="w-3 h-3" />
                            <span>{ins.work_order_count} sự cố</span>
                          </Link>
                        ) : (
                          <span className="text-slate-500 text-xs">
                            0 sự cố
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewingInspection(ins)}
                          className="h-7 text-xs text-slate-400 hover:text-slate-200 gap-1 px-2"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Xem</span>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inspection Results Modal */}
      <Dialog
        open={Boolean(viewingInspection)}
        onOpenChange={(open) => !open && setViewingInspection(null)}
      >
        <DialogContent className="max-w-lg">
          {viewingInspection && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-emerald-400" />
                  <span>
                    Biên bản kiểm tra #{viewingInspection.id.slice(0, 8)}
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {viewingInspection.branch_name}
                  {viewingInspection.room_number
                    ? ` • Phòng ${viewingInspection.room_number}`
                    : ""}
                  {" • "}
                  {new Date(viewingInspection.performed_at).toLocaleString(
                    "vi-VN",
                  )}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
                {/* Summary Score Bar */}
                <div className="grid grid-cols-3 gap-2 text-center p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Đạt
                    </span>
                    <span className="text-lg font-bold text-emerald-400">
                      {viewingInspection.passed}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Lỗi
                    </span>
                    <span className="text-lg font-bold text-rose-400">
                      {viewingInspection.failed}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Điểm
                    </span>
                    <span className="text-lg font-bold text-indigo-400">
                      {viewingInspection.score !== null
                        ? `${viewingInspection.score}%`
                        : "-"}
                    </span>
                  </div>
                </div>

                {/* Items detail list */}
                {viewingInspection.results &&
                viewingInspection.results.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-300">
                      Chi tiết từng tiêu chí:
                    </p>
                    {viewingInspection.results.map((r, idx) => (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-lg border text-xs space-y-1 ${
                          r.status === "pass"
                            ? "bg-emerald-950/20 border-emerald-500/20 text-emerald-300"
                            : r.status === "fail"
                              ? "bg-rose-950/30 border-rose-500/30 text-rose-300"
                              : "bg-slate-950 border-slate-800 text-slate-400"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-200">
                            {r.key}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              r.status === "pass"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : r.status === "fail"
                                  ? "bg-rose-500/10 text-rose-400"
                                  : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {r.status === "pass"
                              ? "Đạt"
                              : r.status === "fail"
                                ? "Không đạt"
                                : "K.Áp dụng"}
                          </span>
                        </div>
                        {r.note && (
                          <p className="text-[11px] text-rose-300 font-medium">
                            Ghi chú: {r.note}
                          </p>
                        )}
                        {r.photo_path && (
                          <p className="text-[10px] text-slate-400 truncate">
                            Ảnh: {r.photo_path}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 text-center py-2">
                    Biên bản không lưu chi tiết từng mục
                  </p>
                )}

                {viewingInspection.note && (
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                    <span className="font-semibold text-slate-400 block mb-1">
                      Ghi chú tổng kết:
                    </span>
                    <p className="text-slate-200">{viewingInspection.note}</p>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewingInspection(null)}
                  className="h-8 text-xs"
                >
                  Đóng
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

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
              <Label htmlFor="planTemplate" className="text-xs font-semibold">
                Gắn theo Mẫu Checklist (tùy chọn)
              </Label>
              <select
                id="planTemplate"
                value={planTemplateId}
                onChange={(e) => handleSelectTemplateForCreate(e.target.value)}
                className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              >
                <option value="">-- Tự nhập hạng mục --</option>
                {templates
                  .filter((t) => t.is_active)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.items?.length || 0} mục)
                    </option>
                  ))}
              </select>
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

      {/* Edit Maintenance Plan Dialog */}
      <Dialog
        open={Boolean(editingPlan)}
        onOpenChange={(open) => !open && setEditingPlan(null)}
      >
        <DialogContent className="max-w-md">
          {editingPlan && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Edit className="h-5 w-5 text-indigo-500" />
                  <span>Chỉnh sửa Kế hoạch Bảo trì</span>
                </DialogTitle>
                <DialogDescription>
                  Cơ sở: {editingPlan.branch_name}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleUpdatePlan} className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="editName" className="text-xs font-semibold">
                    Tên kế hoạch bảo trì *
                  </Label>
                  <Input
                    id="editName"
                    value={editPlanName}
                    onChange={(e) => setEditPlanName(e.target.value)}
                    className="h-9 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="editTemplate"
                    className="text-xs font-semibold"
                  >
                    Gắn theo Mẫu Checklist (tùy chọn)
                  </Label>
                  <select
                    id="editTemplate"
                    value={editPlanTemplateId}
                    onChange={(e) =>
                      handleSelectTemplateForEdit(e.target.value)
                    }
                    className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  >
                    <option value="">-- Tự nhập hạng mục --</option>
                    {templates
                      .filter((t) => t.is_active)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.items?.length || 0} mục)
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="editInterval"
                    className="text-xs font-semibold"
                  >
                    Chu kỳ lặp lại (ngày) *
                  </Label>
                  <select
                    id="editInterval"
                    value={editPlanInterval}
                    onChange={(e) => setEditPlanInterval(e.target.value)}
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
                  <Label
                    htmlFor="editChecklist"
                    className="text-xs font-semibold"
                  >
                    Danh mục hạng mục kiểm tra
                  </Label>
                  <textarea
                    id="editChecklist"
                    value={editPlanChecklistText}
                    onChange={(e) => setEditPlanChecklistText(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none font-mono"
                  />
                </div>

                <div className="pt-1">
                  <label className="flex items-center gap-2 p-2 rounded-xl border border-slate-800 bg-slate-950/60 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editPlanIsActive}
                      onChange={(e) => setEditPlanIsActive(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700"
                    />
                    <span className="text-xs font-medium text-slate-200">
                      Kế hoạch đang kích hoạt (Tự động sinh phiếu khi đến hạn)
                    </span>
                  </label>
                </div>

                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingPlan(null)}
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
                    {isPending && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    )}
                    <span>Cập nhật</span>
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
