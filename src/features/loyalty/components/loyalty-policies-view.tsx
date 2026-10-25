"use client";

import {
  AlertCircle,
  Archive,
  ArrowRight,
  Award,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Edit2,
  Eye,
  FileEdit,
  History,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Shield,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type React from "react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  activateLoyaltyPolicyAction,
  archiveLoyaltyPolicyAction,
  cloneLoyaltyPolicyAction,
  deleteLoyaltyTierAction,
  previewLoyaltyPolicyAction,
  upsertLoyaltyPolicyAction,
  upsertLoyaltyTierAction,
} from "../actions";
import type {
  LoyaltyPolicy,
  LoyaltyTierItem,
  PolicyPreviewResult,
} from "../domain/types";

interface LoyaltyPoliciesViewProps {
  initialPolicies: LoyaltyPolicy[];
  initialActivePolicy: LoyaltyPolicy | null;
  initialTiersByPolicyId: Record<string, LoyaltyTierItem[]>;
  canConfigure: boolean;
}

export function LoyaltyPoliciesView({
  initialPolicies,
  initialActivePolicy,
  initialTiersByPolicyId,
  canConfigure,
}: LoyaltyPoliciesViewProps) {
  const [policies, setPolicies] = useState<LoyaltyPolicy[]>(initialPolicies);
  const [tiersByPolicy, setTiersByPolicy] = useState<
    Record<string, LoyaltyTierItem[]>
  >(initialTiersByPolicyId);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>(
    initialActivePolicy?.id || initialPolicies[0]?.id || "",
  );
  const [activeTab, setActiveTab] = useState<
    "all" | "active" | "draft" | "archived"
  >("all");

  const [isPending, startTransition] = useTransition();

  // Modals state
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [cloneName, setCloneName] = useState("");
  const [cloneValidFrom, setCloneValidFrom] = useState("");

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewResult, setPreviewResult] =
    useState<PolicyPreviewResult | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const [showActivateModal, setShowActivateModal] = useState(false);

  const [showPolicyFormModal, setShowPolicyFormModal] = useState(false);
  const [policyFormData, setPolicyFormData] = useState({
    name: "",
    validFrom: "",
    validTo: "",
    basis: "stays" as "stays" | "nights",
    windowMonths: 24,
    countCurrentStay: false,
    companionsCountDefault: true,
    note: "",
  });

  const [showTierModal, setShowTierModal] = useState(false);
  const [editingTier, setEditingTier] = useState<LoyaltyTierItem | null>(null);
  const [tierFormData, setTierFormData] = useState({
    code: "",
    name: "",
    minValue: 0,
    discountPct: 0,
    benefits: "",
    color: "#64748B",
    sort: 0,
  });

  const selectedPolicy = useMemo(
    () =>
      policies.find((p) => p.id === selectedPolicyId) || policies[0] || null,
    [policies, selectedPolicyId],
  );

  const currentTiers = useMemo(
    () => (selectedPolicy ? tiersByPolicy[selectedPolicy.id] || [] : []),
    [selectedPolicy, tiersByPolicy],
  );

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Filtered policies
  const filteredPolicies = useMemo(() => {
    if (activeTab === "all") return policies;
    return policies.filter((p) => p.status === activeTab);
  }, [policies, activeTab]);

  // Warning: Active policy expiring within 30 days without next scheduled policy
  const expirationWarning = useMemo(() => {
    const active = policies.find((p) => p.status === "active");
    if (!active || !active.validTo) return null;
    const expDate = new Date(active.validTo);
    const now = new Date();
    const diffDays = Math.ceil(
      (expDate.getTime() - now.getTime()) / (1000 * 3600 * 24),
    );
    if (diffDays <= 30 && diffDays >= 0) {
      const hasUpcoming = policies.some(
        (p) =>
          p.id !== active.id &&
          (p.status === "active" || p.status === "draft") &&
          p.validFrom > active.validTo!,
      );
      if (!hasUpcoming) {
        return { diffDays, validTo: active.validTo };
      }
    }
    return null;
  }, [policies]);

  // Open Edit Policy
  function handleOpenEditPolicy() {
    if (!selectedPolicy) return;
    setPolicyFormData({
      name: selectedPolicy.name,
      validFrom: selectedPolicy.validFrom,
      validTo: selectedPolicy.validTo || "",
      basis: selectedPolicy.basis,
      windowMonths: selectedPolicy.windowMonths,
      countCurrentStay: selectedPolicy.countCurrentStay,
      companionsCountDefault: selectedPolicy.companionsCountDefault,
      note: selectedPolicy.note || "",
    });
    setShowPolicyFormModal(true);
  }

  // Submit Save Policy
  function handleSavePolicy(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPolicy) return;

    startTransition(async () => {
      const res = await upsertLoyaltyPolicyAction({
        id: selectedPolicy.id,
        name: policyFormData.name,
        validFrom: policyFormData.validFrom,
        validTo: policyFormData.validTo || null,
        basis: policyFormData.basis,
        windowMonths: policyFormData.windowMonths,
        countCurrentStay: policyFormData.countCurrentStay,
        companionsCountDefault: policyFormData.companionsCountDefault,
        note: policyFormData.note || null,
      });

      if (res.ok) {
        toast.success("Đã cập nhật chính sách thành công!");
        setPolicies((prev) =>
          prev.map((p) => (p.id === res.data.id ? res.data : p)),
        );
        setShowPolicyFormModal(false);
      } else {
        toast.error(res.error.message || "Không thể lưu chính sách");
      }
    });
  }

  // Open Add Tier
  function handleOpenAddTier() {
    setEditingTier(null);
    setTierFormData({
      code: "",
      name: "",
      minValue: (currentTiers[currentTiers.length - 1]?.minValue ?? 0) + 2,
      discountPct:
        (currentTiers[currentTiers.length - 1]?.discountPct ?? 0) + 3,
      benefits: "",
      color: "#3B82F6",
      sort: currentTiers.length,
    });
    setShowTierModal(true);
  }

  // Open Edit Tier
  function handleOpenEditTier(tier: LoyaltyTierItem) {
    setEditingTier(tier);
    setTierFormData({
      code: tier.code,
      name: tier.name,
      minValue: tier.minValue,
      discountPct: tier.discountPct,
      benefits: tier.benefits || "",
      color: tier.color || "#64748B",
      sort: tier.sort || 0,
    });
    setShowTierModal(true);
  }

  // Submit Save Tier
  function handleSaveTier(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPolicy) return;

    if (tierFormData.discountPct < 0 || tierFormData.discountPct > 100) {
      toast.error("Tỷ lệ giảm giá (%) phải nằm trong khoảng từ 0% đến 100%");
      return;
    }
    if (tierFormData.minValue < 0) {
      toast.error("Ngưỡng tích lũy không được là số âm");
      return;
    }

    startTransition(async () => {
      const res = await upsertLoyaltyTierAction({
        id: editingTier?.id,
        policyId: selectedPolicy.id,
        code: tierFormData.code,
        name: tierFormData.name,
        minValue: tierFormData.minValue,
        discountPct: tierFormData.discountPct,
        benefits: tierFormData.benefits || null,
        color: tierFormData.color,
        sort: tierFormData.sort,
      });

      if (res.ok) {
        toast.success("Đã lưu hạng thành viên!");
        setTiersByPolicy((prev) => {
          const list = prev[selectedPolicy.id] || [];
          const exists = list.some((t) => t.id === res.data.id);
          const next = exists
            ? list.map((t) => (t.id === res.data.id ? res.data : t))
            : [...list, res.data];
          next.sort((a, b) => a.minValue - b.minValue);
          return { ...prev, [selectedPolicy.id]: next };
        });
        setShowTierModal(false);
      } else {
        toast.error(res.error.message || "Không thể lưu hạng thành viên");
      }
    });
  }

  // Delete Tier
  function handleDeleteTier(tierId: string) {
    if (!confirm("Bạn có chắc chắn muốn xóa hạng thành viên này?")) return;
    if (!selectedPolicy) return;

    startTransition(async () => {
      const res = await deleteLoyaltyTierAction(tierId);
      if (res.ok) {
        toast.success("Đã xóa hạng thành viên!");
        setTiersByPolicy((prev) => ({
          ...prev,
          [selectedPolicy.id]: (prev[selectedPolicy.id] || []).filter(
            (t) => t.id !== tierId,
          ),
        }));
      } else {
        toast.error(res.error.message || "Không thể xóa hạng thành viên");
      }
    });
  }

  // Open Clone
  function handleOpenClone() {
    if (!selectedPolicy) return;
    const nextYear = new Date().getFullYear() + 1;
    setCloneName(`Chính sách năm ${nextYear}`);
    setCloneValidFrom(`${nextYear}-01-01`);
    setShowCloneModal(true);
  }

  // Submit Clone
  function handleClone(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPolicy) return;

    startTransition(async () => {
      const res = await cloneLoyaltyPolicyAction(
        selectedPolicy.id,
        cloneName,
        cloneValidFrom,
      );

      if (res.ok) {
        toast.success("Đã nhân bản chính sách thành công!");
        setShowCloneModal(false);
        // Reload page to re-fetch complete data
        window.location.reload();
      } else {
        toast.error(res.error.message || "Không thể nhân bản chính sách");
      }
    });
  }

  // Open Preview
  function handleOpenPreview() {
    if (!selectedPolicy) return;
    setIsPreviewLoading(true);
    setShowPreviewModal(true);

    startTransition(async () => {
      const res = await previewLoyaltyPolicyAction(selectedPolicy.id);
      setIsPreviewLoading(false);
      if (res.ok) {
        setPreviewResult(res.data);
      } else {
        toast.error(res.error.message || "Không thể xem trước chính sách");
      }
    });
  }

  // Submit Activate
  function handleActivate() {
    if (!selectedPolicy) return;

    startTransition(async () => {
      const res = await activateLoyaltyPolicyAction(selectedPolicy.id);
      if (res.ok) {
        toast.success("Đã kích hoạt chính sách thành công!");
        setShowActivateModal(false);
        setPolicies((prev) =>
          prev.map((p) => (p.id === res.data.id ? res.data : p)),
        );
        window.location.reload();
      } else {
        toast.error(res.error.message || "Không thể kích hoạt chính sách");
      }
    });
  }

  // Submit Archive
  function handleArchive() {
    if (!selectedPolicy) return;
    if (!confirm("Bạn có chắc chắn muốn lưu trữ chính sách này?")) return;

    startTransition(async () => {
      const res = await archiveLoyaltyPolicyAction(selectedPolicy.id);
      if (res.ok) {
        toast.success("Đã chuyển chính sách vào kho lưu trữ!");
        setPolicies((prev) =>
          prev.map((p) => (p.id === res.data.id ? res.data : p)),
        );
      } else {
        toast.error(res.error.message || "Không thể lưu trữ chính sách");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            <Award className="w-4 h-4" />
            Cài đặt chương trình khách hàng thân thiết
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
            Chính sách hạng & Giảm giá theo mùa/năm
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Quản lý quy tắc tích lũy, ngưỡng phân hạng và tỷ lệ giảm giá phòng
            linh hoạt theo từng thời kỳ kinh doanh.
          </p>
        </div>

        {canConfigure && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenClone}
              disabled={!selectedPolicy || isPending}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs transition disabled:opacity-50"
            >
              <Copy className="w-3.5 h-3.5 text-slate-500" />
              Nhân bản mùa mới
            </button>
          </div>
        )}
      </div>

      {/* Expiration Warning */}
      {expirationWarning && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm space-y-1">
            <div className="font-semibold">
              Chính sách hiện hành sắp hết hạn trong{" "}
              {expirationWarning.diffDays} ngày (ngày{" "}
              {expirationWarning.validTo})
            </div>
            <p className="text-xs text-amber-600/90 dark:text-amber-300/90">
              Chưa có chính sách tiếp theo được kích hoạt. Vui lòng nhân bản
              hoặc tạo chính sách mới để chuỗi khách sạn duy trì chính sách hạng
              liên tục.
            </p>
          </div>
        </div>
      )}

      {/* Tabs Filter */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === "all"
              ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          Tất cả ({policies.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("active")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === "active"
              ? "bg-emerald-600 text-white"
              : "text-slate-500 hover:text-emerald-600"
          }`}
        >
          Đang hiệu lực ({policies.filter((p) => p.status === "active").length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("draft")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === "draft"
              ? "bg-indigo-600 text-white"
              : "text-slate-500 hover:text-indigo-600"
          }`}
        >
          Bản nháp ({policies.filter((p) => p.status === "draft").length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("archived")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === "archived"
              ? "bg-slate-600 text-white"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Lưu trữ ({policies.filter((p) => p.status === "archived").length})
        </button>
      </div>

      {/* Main Grid: Left Timeline / List, Right Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Policies Timeline / Cards */}
        <div className="lg:col-span-4 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
            Danh sách chính sách ({filteredPolicies.length})
          </div>

          <div className="space-y-2.5">
            {filteredPolicies.map((p) => {
              const isSelected = selectedPolicy?.id === p.id;
              const isActive = p.status === "active";
              const isDraft = p.status === "draft";
              const isArchived = p.status === "archived";

              let statusBadge = (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                  Lưu trữ
                </span>
              );

              if (isActive) {
                statusBadge = (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Đang hiệu lực
                  </span>
                );
              } else if (isDraft) {
                statusBadge = (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-dashed border-indigo-400">
                    Bản nháp
                  </span>
                );
              }

              return (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setSelectedPolicyId(p.id)}
                  className={`w-full p-4 rounded-2xl border transition cursor-pointer text-left ${
                    isSelected
                      ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-500/80 shadow-xs"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-snug">
                      {p.name}
                    </div>
                    {statusBadge}
                  </div>

                  <div className="mt-2.5 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        Từ {p.validFrom}
                        {p.validTo ? ` đến ${p.validTo}` : " (không thời hạn)"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        Tính theo{" "}
                        <strong className="text-slate-700 dark:text-slate-300">
                          {p.basis === "stays" ? "Lượt ở" : "Số đêm"}
                        </strong>{" "}
                        · Cửa sổ:{" "}
                        {p.windowMonths === 0
                          ? "Trọn đời"
                          : `${p.windowMonths} tháng`}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Policy Details & Tiers */}
        <div className="lg:col-span-8 space-y-6">
          {selectedPolicy ? (
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
              {/* Policy Header & Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                      {selectedPolicy.name}
                    </h2>
                    {selectedPolicy.status === "active" && (
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        Đang hiệu lực
                      </span>
                    )}
                    {selectedPolicy.status === "draft" && (
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-dashed border-indigo-400">
                        Bản nháp
                      </span>
                    )}
                    {selectedPolicy.status === "archived" && (
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                        Lưu trữ
                      </span>
                    )}
                  </div>
                  {selectedPolicy.note && (
                    <p className="text-xs text-slate-500 mt-1 italic">
                      "{selectedPolicy.note}"
                    </p>
                  )}
                </div>

                {canConfigure && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleOpenPreview}
                      disabled={isPending}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                      Xem trước
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenEditPolicy}
                      disabled={isPending}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                      Sửa quy tắc
                    </button>

                    {selectedPolicy.status === "draft" && (
                      <button
                        type="button"
                        onClick={() => setShowActivateModal(true)}
                        disabled={isPending}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs transition"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Kích hoạt
                      </button>
                    )}

                    {selectedPolicy.status === "active" &&
                      selectedPolicy.validTo &&
                      selectedPolicy.validTo < todayStr && (
                        <button
                          type="button"
                          onClick={handleArchive}
                          disabled={isPending}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 transition"
                        >
                          <Archive className="w-3.5 h-3.5 text-slate-500" />
                          Lưu trữ
                        </button>
                      )}
                  </div>
                )}
              </div>

              {/* Policy Rules Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-xs">
                <div>
                  <div className="text-slate-400 font-medium">Cơ sở tính</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {selectedPolicy.basis === "stays"
                      ? "Số lượt ở"
                      : "Số đêm lưu trú"}
                  </div>
                </div>

                <div>
                  <div className="text-slate-400 font-medium">
                    Cửa sổ tích lũy
                  </div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {selectedPolicy.windowMonths === 0
                      ? "Trọn đời"
                      : `${selectedPolicy.windowMonths} tháng gần nhất`}
                  </div>
                </div>

                <div>
                  <div className="text-slate-400 font-medium">
                    Tính lượt đang ở
                  </div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {selectedPolicy.countCurrentStay
                      ? "Có tính ngay"
                      : "Không tính"}
                  </div>
                </div>

                <div>
                  <div className="text-slate-400 font-medium">
                    Mặc định người đi cùng
                  </div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {selectedPolicy.companionsCountDefault
                      ? "Có tích lũy"
                      : "Không tích lũy"}
                  </div>
                </div>
              </div>

              {/* Tiers Section */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      Bảng hạng thành viên & Mức giảm giá
                    </h3>
                    <p className="text-xs text-slate-500">
                      {selectedPolicy.status === "draft"
                        ? "Có thể tùy chỉnh ngưỡng, tên hạng, mức giảm % và thêm/xóa hạng tự do trước khi kích hoạt."
                        : "Chính sách đang hoặc đã hiệu lực không cho phép sửa ngưỡng để bảo toàn lịch sử tích lũy."}
                    </p>
                  </div>

                  {canConfigure && selectedPolicy.status === "draft" && (
                    <button
                      type="button"
                      onClick={handleOpenAddTier}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Thêm hạng
                    </button>
                  )}
                </div>

                {/* Tiers Table */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3.5">Hạng thành viên</th>
                        <th className="py-2.5 px-3">Mã code</th>
                        <th className="py-2.5 px-3">Ngưỡng đạt</th>
                        <th className="py-2.5 px-3">Giảm giá</th>
                        <th className="py-2.5 px-3">Quyền lợi</th>
                        {canConfigure && selectedPolicy.status === "draft" && (
                          <th className="py-2.5 px-3 text-right">Thao tác</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {currentTiers.map((t) => (
                        <tr
                          key={t.id || t.code}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition"
                        >
                          <td className="py-3 px-3.5">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                                style={{
                                  backgroundColor: t.color || "#64748B",
                                }}
                              />
                              <span className="font-bold text-slate-900 dark:text-slate-100">
                                {t.name}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-500">
                            {t.code}
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              ≥ {t.minValue}
                            </span>{" "}
                            <span className="text-slate-400">
                              {selectedPolicy.basis === "stays"
                                ? "lượt"
                                : "đêm"}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
                              {t.discountPct}%
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-500 max-w-[200px] truncate">
                            {t.benefits || "—"}
                          </td>
                          {canConfigure &&
                            selectedPolicy.status === "draft" && (
                              <td className="py-3 px-3 text-right">
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditTier(t)}
                                    className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                    title="Chỉnh sửa hạng"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      t.id && handleDeleteTier(t.id)
                                    }
                                    className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                    title="Xóa hạng"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
              Chưa có chính sách nào được chọn.
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Sửa quy tắc chính sách */}
      {showPolicyFormModal && selectedPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                Chỉnh sửa quy tắc chính sách
              </h3>
              <button
                type="button"
                onClick={() => setShowPolicyFormModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePolicy} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                  Tên chính sách *
                </label>
                <input
                  type="text"
                  required
                  value={policyFormData.name}
                  onChange={(e) =>
                    setPolicyFormData({
                      ...policyFormData,
                      name: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                    Ngày bắt đầu *
                  </label>
                  <input
                    type="date"
                    required
                    disabled={selectedPolicy.status !== "draft"}
                    value={policyFormData.validFrom}
                    onChange={(e) =>
                      setPolicyFormData({
                        ...policyFormData,
                        validFrom: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                    Ngày kết thúc
                  </label>
                  <input
                    type="date"
                    value={policyFormData.validTo}
                    onChange={(e) =>
                      setPolicyFormData({
                        ...policyFormData,
                        validTo: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                    Cơ sở tính *
                  </label>
                  <select
                    disabled={selectedPolicy.status !== "draft"}
                    value={policyFormData.basis}
                    onChange={(e) =>
                      setPolicyFormData({
                        ...policyFormData,
                        basis: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-50"
                  >
                    <option value="stays">Số lượt ở (Stays)</option>
                    <option value="nights">Số đêm (Nights)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                    Cửa sổ tích lũy (tháng)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={120}
                    disabled={selectedPolicy.status !== "draft"}
                    value={policyFormData.windowMonths}
                    onChange={(e) =>
                      setPolicyFormData({
                        ...policyFormData,
                        windowMonths: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-50"
                  />
                  <span className="text-[10px] text-slate-400">
                    0 = tích lũy trọn đời
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={selectedPolicy.status !== "draft"}
                    checked={policyFormData.countCurrentStay}
                    onChange={(e) =>
                      setPolicyFormData({
                        ...policyFormData,
                        countCurrentStay: e.target.checked,
                      })
                    }
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    Tính lượt đang ở ngay lúc check-in
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={policyFormData.companionsCountDefault}
                    onChange={(e) =>
                      setPolicyFormData({
                        ...policyFormData,
                        companionsCountDefault: e.target.checked,
                      })
                    }
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    Mặc định tích lũy lượt cho người đi cùng (§2)
                  </span>
                </label>
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                  Ghi chú
                </label>
                <textarea
                  rows={2}
                  value={policyFormData.note}
                  onChange={(e) =>
                    setPolicyFormData({
                      ...policyFormData,
                      note: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  placeholder="Ghi chú nội bộ cho quản lý..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPolicyFormModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition"
                >
                  {isPending ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Thêm/Sửa Hạng thành viên */}
      {showTierModal && selectedPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                {editingTier
                  ? "Chỉnh sửa hạng thành viên"
                  : "Thêm hạng thành viên mới"}
              </h3>
              <button
                type="button"
                onClick={() => setShowTierModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTier} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                    Tên hạng *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="vd: Bạch kim"
                    value={tierFormData.name}
                    onChange={(e) =>
                      setTierFormData({ ...tierFormData, name: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                    Mã code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="vd: platinum"
                    value={tierFormData.code}
                    onChange={(e) =>
                      setTierFormData({
                        ...tierFormData,
                        code: e.target.value.toLowerCase().trim(),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                    Ngưỡng tối thiểu (
                    {selectedPolicy.basis === "stays" ? "lượt" : "đêm"}) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={tierFormData.minValue}
                    onChange={(e) =>
                      setTierFormData({
                        ...tierFormData,
                        minValue: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                    Giảm giá (%) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={100}
                    step={0.1}
                    value={tierFormData.discountPct}
                    onChange={(e) =>
                      setTierFormData({
                        ...tierFormData,
                        discountPct: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                    Mã màu đại diện
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={tierFormData.color}
                      onChange={(e) =>
                        setTierFormData({
                          ...tierFormData,
                          color: e.target.value,
                        })
                      }
                      className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200"
                    />
                    <input
                      type="text"
                      value={tierFormData.color}
                      onChange={(e) =>
                        setTierFormData({
                          ...tierFormData,
                          color: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                    Thứ tự hiển thị
                  </label>
                  <input
                    type="number"
                    value={tierFormData.sort}
                    onChange={(e) =>
                      setTierFormData({
                        ...tierFormData,
                        sort: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                  Quyền lợi đặc quyền
                </label>
                <textarea
                  rows={2}
                  placeholder="vd: Nhận phòng sớm 2h, tặng đĩa hoa quả..."
                  value={tierFormData.benefits}
                  onChange={(e) =>
                    setTierFormData({
                      ...tierFormData,
                      benefits: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTierModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition"
                >
                  {isPending ? "Đang lưu..." : "Lưu hạng"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Nhân bản chính sách */}
      {showCloneModal && selectedPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                Nhân bản chính sách sang mùa mới
              </h3>
              <button
                type="button"
                onClick={() => setShowCloneModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Hệ thống sẽ sao chép toàn bộ bộ quy tắc và các hạng thành viên từ{" "}
              <strong>"{selectedPolicy.name}"</strong> sang một bản nháp mới để
              bạn dễ dàng chỉnh sửa cho kỳ kế tiếp.
            </p>

            <form onSubmit={handleClone} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                  Tên chính sách mới *
                </label>
                <input
                  type="text"
                  required
                  value={cloneName}
                  onChange={(e) => setCloneName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                  Ngày bắt đầu có hiệu lực *
                </label>
                <input
                  type="date"
                  required
                  value={cloneValidFrom}
                  onChange={(e) => setCloneValidFrom(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCloneModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition"
                >
                  {isPending ? "Đang nhân bản..." : "Tạo bản nháp mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Xem trước ảnh hưởng (Preview) */}
      {showPreviewModal && selectedPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Mô phỏng ảnh hưởng của chính sách
              </h3>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {isPreviewLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <span className="text-xs">
                  Đang đánh giá toàn bộ tập khách hàng...
                </span>
              </div>
            ) : previewResult ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                    <div className="text-xs font-semibold text-emerald-600 flex items-center justify-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      Lên hạng
                    </div>
                    <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                      +{previewResult.upgrades}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-center">
                    <div className="text-xs font-semibold text-rose-600 flex items-center justify-center gap-1">
                      <TrendingDown className="w-3.5 h-3.5" />
                      Xuống hạng
                    </div>
                    <div className="text-2xl font-bold text-rose-700 dark:text-rose-400 mt-1">
                      -{previewResult.downgrades}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                    <div className="text-xs font-semibold text-slate-500">
                      Giữ nguyên
                    </div>
                    <div className="text-2xl font-bold text-slate-800 dark:text-slate-200 mt-1">
                      {previewResult.unchanged}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Phân bố khách hàng theo hạng mới
                  </div>
                  <div className="space-y-1.5 text-xs">
                    {currentTiers.map((t) => {
                      const count = previewResult.countsByTier[t.code] || 0;
                      return (
                        <div
                          key={t.code}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: t.color || "#64748B" }}
                            />
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {t.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({t.code})
                            </span>
                          </div>
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {count} khách
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 text-center pt-2">
                  Tổng số hồ sơ khách được quét: {previewResult.totalGuests}
                </div>
              </div>
            ) : null}

            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold text-xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Xác nhận Kích hoạt (Activate) */}
      {showActivateModal && selectedPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-emerald-600">
              <CheckCircle2 className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                Kích hoạt chính sách hạng
              </h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Bạn đang chuẩn bị kích hoạt chính sách{" "}
              <strong>"{selectedPolicy.name}"</strong> với ngày hiệu lực từ{" "}
              <strong>{selectedPolicy.validFrom}</strong>.
            </p>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 space-y-1">
              <div className="font-bold">Lưu ý quan trọng:</div>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                <li>
                  Chính sách active trước đó sẽ được tự động đóng vào ngày{" "}
                  {selectedPolicy.validFrom}.
                </li>
                {selectedPolicy.validFrom <= todayStr && (
                  <li>
                    Vì ngày bắt đầu là hôm nay hoặc trước đó, hệ thống sẽ{" "}
                    <strong>tính lại hạng ngay lập tức</strong> cho toàn bộ
                    khách hàng và ghi nhận lịch sử thay đổi hạng.
                  </li>
                )}
                <li>
                  Sau khi kích hoạt, bạn sẽ không thể thay đổi ngưỡng của các
                  hạng thành viên.
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setShowActivateModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 font-semibold"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleActivate}
                disabled={isPending}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition"
              >
                {isPending ? "Đang kích hoạt..." : "Xác nhận Kích hoạt"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
