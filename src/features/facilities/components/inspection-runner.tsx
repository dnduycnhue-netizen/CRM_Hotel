"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Flame,
  HelpCircle,
  Home,
  Info,
  Loader2,
  MapPin,
  Minus,
  Sparkles,
  Wrench,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type React from "react";
import { useMemo, useState, useTransition } from "react";
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
import { submitInspectionAction } from "../actions";
import type { ChecklistTemplateItem } from "../data/maintenance";

interface BranchOption {
  id: string;
  name: string;
}

interface RoomOption {
  id: string;
  number: string;
  type: string;
  branch_id: string;
}

interface LocationOption {
  id: string;
  name: string;
  branch_id: string;
}

interface Props {
  branches: BranchOption[];
  currentBranchId: string | null;
  templates: ChecklistTemplateItem[];
  rooms: RoomOption[];
  locations: LocationOption[];
}

type ItemStatus = "pass" | "fail" | "na";

interface EvaluationItemState {
  key: string;
  label: string;
  critical?: boolean;
  hint?: string | null;
  status: ItemStatus | null;
  failReason: string;
  photoUrl: string;
}

export function InspectionRunner({
  branches,
  currentBranchId,
  templates,
  rooms,
  locations,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Selection state
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    currentBranchId || branches[0]?.id || "",
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    templates[0]?.id || "",
  );
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [generalNote, setGeneralNote] = useState<string>("");

  // Filter templates and targets
  const activeTemplates = useMemo(
    () => templates.filter((t) => t.is_active),
    [templates],
  );

  const currentTemplate = useMemo(
    () =>
      activeTemplates.find((t) => t.id === selectedTemplateId) ||
      activeTemplates[0] ||
      null,
    [activeTemplates, selectedTemplateId],
  );

  const filteredRooms = useMemo(
    () => rooms.filter((r) => r.branch_id === selectedBranchId),
    [rooms, selectedBranchId],
  );

  const filteredLocations = useMemo(
    () => locations.filter((l) => l.branch_id === selectedBranchId),
    [locations, selectedBranchId],
  );

  // Initialize evaluation states whenever currentTemplate changes
  const [evaluations, setEvaluations] = useState<
    Record<string, EvaluationItemState>
  >({});

  // Sync evaluations when template changes
  useMemo(() => {
    if (!currentTemplate) return;
    const initial: Record<string, EvaluationItemState> = {};
    for (const item of currentTemplate.items) {
      initial[item.key] = {
        key: item.key,
        label: item.label,
        critical: item.critical,
        hint: item.hint,
        status: null,
        failReason: "",
        photoUrl: "",
      };
    }
    setEvaluations(initial);
  }, [currentTemplate]);

  // Status counters
  const evaluationList = useMemo(
    () => Object.values(evaluations),
    [evaluations],
  );
  const totalCount = evaluationList.length;
  const completedCount = evaluationList.filter((e) => e.status !== null).length;
  const passedCount = evaluationList.filter((e) => e.status === "pass").length;
  const failedCount = evaluationList.filter((e) => e.status === "fail").length;
  const naCount = evaluationList.filter((e) => e.status === "na").length;

  const validScoredCount = passedCount + failedCount;
  const liveScore =
    validScoredCount > 0
      ? Math.round((passedCount / validScoredCount) * 100)
      : 100;

  // Success result modal
  const [completedResult, setCompletedResult] = useState<{
    score: number;
    inspection_id: string;
    work_order_ids: string[];
  } | null>(null);

  const handleSetStatus = (key: string, status: ItemStatus) => {
    setEvaluations((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        status,
        failReason: status === "fail" ? prev[key].failReason : "",
      },
    }));
  };

  const handleSetFailReason = (key: string, reason: string) => {
    setEvaluations((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        failReason: reason,
      },
    }));
  };

  const handleSetPhotoUrl = (key: string, url: string) => {
    setEvaluations((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        photoUrl: url,
      },
    }));
  };

  const handleQuickPassAll = () => {
    setEvaluations((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        if (!next[key].status) {
          next[key] = { ...next[key], status: "pass" };
        }
      }
      return next;
    });
    toast.info("Đã đánh dấu các mục còn lại là Đạt");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentTemplate) {
      toast.error("Vui lòng chọn mẫu kiểm tra");
      return;
    }

    if (currentTemplate.scope === "room" && !selectedRoomId) {
      toast.error("Vui lòng chọn phòng cần kiểm tra");
      return;
    }

    if (completedCount < totalCount) {
      toast.error(
        `Vui lòng đánh giá đủ tất cả các mục (còn ${totalCount - completedCount} mục chưa đánh giá)`,
      );
      return;
    }

    // Check if any fail has empty reason
    const invalidFail = evaluationList.find(
      (e) => e.status === "fail" && !e.failReason.trim(),
    );
    if (invalidFail) {
      toast.error(
        `Vui lòng nhập mô tả lỗi cho mục "${invalidFail.label}" để kỹ thuật xử lý`,
      );
      return;
    }

    startTransition(async () => {
      const payload = {
        branch_id: selectedBranchId,
        template_id: currentTemplate.id,
        room_id: currentTemplate.scope === "room" ? selectedRoomId : null,
        location_id:
          currentTemplate.scope === "area" ? selectedLocationId || null : null,
        note: generalNote.trim() || null,
        results: evaluationList.map((e) => ({
          key: e.key,
          status: e.status as ItemStatus,
          note: e.status === "fail" ? e.failReason.trim() : null,
          photo_path: e.photoUrl.trim() || null,
        })),
      };

      const res = await submitInspectionAction(payload);
      if (res.ok) {
        toast.success("Đã hoàn thành và lưu biên bản kiểm tra!");
        setCompletedResult(res.data);
      } else {
        toast.error(`Lỗi: ${res.error.message || res.error.code || "Không thể lưu biên bản kiểm tra"}`);
      }
    });
  };

  const handleStartAnother = () => {
    setCompletedResult(null);
    setSelectedRoomId("");
    setSelectedLocationId("");
    setGeneralNote("");
    if (currentTemplate) {
      const initial: Record<string, EvaluationItemState> = {};
      for (const item of currentTemplate.items) {
        initial[item.key] = {
          key: item.key,
          label: item.label,
          critical: item.critical,
          hint: item.hint,
          status: null,
          failReason: "",
          photoUrl: "",
        };
      }
      setEvaluations(initial);
    }
  };

  if (!currentTemplate) {
    return (
      <div className="max-w-xl mx-auto p-8 bg-card border border-border rounded-2xl text-center space-y-4">
        <ClipboardCheck className="w-12 h-12 text-muted-foreground mx-auto" />
        <h2 className="text-lg font-semibold text-foreground">
          Chưa có mẫu kiểm tra nào đang kích hoạt
        </h2>
        <p className="text-xs text-muted-foreground">
          Vui lòng vào cài đặt Mẫu kiểm tra để tạo bộ tiêu chí trước khi thực
          hiện
        </p>
        <Link href="/settings/checklists">
          <Button className="mt-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
            Đi đến Cài đặt Mẫu kiểm tra
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24">
      {/* Top Header & Navigation */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/facilities/maintenance"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground py-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại Bảo trì & Kiểm tra</span>
        </Link>

        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
          <ClipboardCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          <span>Biên bản kiểm tra điện tử</span>
        </span>
      </div>

      {/* Progress & Live Score Card */}
      <div className="bg-card border border-border rounded-2xl p-4 sticky top-14 z-20 backdrop-blur-md shadow-lg">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground/80">
                Tiến độ: {completedCount}/{totalCount} mục
              </span>
              {completedCount < totalCount && (
                <button
                  type="button"
                  onClick={handleQuickPassAll}
                  className="text-[11px] text-indigo-700 dark:text-indigo-400 hover:text-indigo-800 font-medium underline"
                >
                  Đạt tất cả
                </button>
              )}
            </div>
            {/* Progress bar */}
            <div className="w-44 sm:w-64 h-2 bg-muted rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                style={{
                  width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                Điểm dự kiến
              </span>
              <span
                className={`text-xl font-black ${
                  liveScore >= 90
                    ? "text-emerald-700 dark:text-emerald-400"
                    : liveScore >= 75
                      ? "text-amber-700 dark:text-amber-400"
                      : "text-rose-700 dark:text-rose-400"
                }`}
              >
                {liveScore}%
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <span className="px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                {passedCount} Đạt
              </span>
              {failedCount > 0 && (
                <span className="px-2 py-1 rounded-md bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                  {failedCount} Lỗi
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Target & Form Settings */}
      <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 space-y-4">
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wide flex items-center gap-2">
          <Building2 className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />
          <span>Thông tin địa điểm kiểm tra</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Branch selector */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              Cơ sở khách sạn
            </Label>
            <select
              value={selectedBranchId}
              onChange={(e) => {
                setSelectedBranchId(e.target.value);
                setSelectedRoomId("");
                setSelectedLocationId("");
              }}
              className="w-full h-10 rounded-xl border border-border bg-muted/40 px-3 text-xs text-foreground outline-none focus:ring-2 focus:ring-indigo-500/30"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Template selector */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              Mẫu kiểm tra
            </Label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="w-full h-10 rounded-xl border border-border bg-muted/40 px-3 text-xs text-foreground outline-none focus:ring-2 focus:ring-indigo-500/30"
            >
              {activeTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} (
                  {t.scope === "room"
                    ? "Phòng"
                    : t.scope === "area"
                      ? "Khu vực"
                      : t.scope === "fire_safety"
                        ? "PCCC"
                        : "Khác"}
                  )
                </option>
              ))}
            </select>
          </div>

          {/* Scope-specific Target */}
          {currentTemplate.scope === "room" ? (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                Số phòng *
              </Label>
              <select
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                className="w-full h-10 rounded-xl border border-border bg-muted/40 px-3 text-xs text-foreground outline-none focus:ring-2 focus:ring-indigo-500/30"
                required
              >
                <option value="">-- Chọn phòng kiểm tra --</option>
                {filteredRooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    Phòng {r.number} ({r.type})
                  </option>
                ))}
              </select>
            </div>
          ) : currentTemplate.scope === "area" ? (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                Khu vực kiểm tra
              </Label>
              <select
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                className="w-full h-10 rounded-xl border border-border bg-muted/40 px-3 text-xs text-foreground outline-none focus:ring-2 focus:ring-indigo-500/30"
              >
                <option value="">-- Chọn khu vực chung --</option>
                {filteredLocations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                Khu vực / Tòa nhà
              </Label>
              <select
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                className="w-full h-10 rounded-xl border border-border bg-muted/40 px-3 text-xs text-foreground outline-none focus:ring-2 focus:ring-indigo-500/30"
              >
                <option value="">Toàn bộ cơ sở</option>
                {filteredLocations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Checklist Items Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-3">
          {evaluationList.map((item, idx) => (
            <div
              key={item.key}
              className={`bg-card border rounded-2xl p-4 sm:p-5 transition-all shadow-sm ${
                item.status === "pass"
                  ? "border-emerald-500/30 bg-emerald-950/10"
                  : item.status === "fail"
                    ? "border-rose-500/50 bg-rose-950/20 ring-1 ring-rose-500/30"
                    : item.status === "na"
                      ? "border-border bg-muted/40 opacity-75"
                      : "border-border hover:border-border"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                {/* Title and notes */}
                <div className="space-y-1 flex-1">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-bold text-muted-foreground mt-0.5">
                      {idx + 1}.
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground leading-snug">
                        {item.label}
                      </h3>
                      {item.hint && (
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span>{item.hint}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {item.critical && (
                    <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                      <AlertTriangle className="w-3 h-3" />
                      <span>
                        Mục quan trọng (Tự sinh sự cố mức Cao nếu hỏng)
                      </span>
                    </span>
                  )}
                </div>

                {/* 3 Touch Action Buttons */}
                <div className="grid grid-cols-3 gap-2 shrink-0 sm:w-72">
                  <button
                    type="button"
                    onClick={() => handleSetStatus(item.key, "pass")}
                    className={`h-12 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all select-none active:scale-95 ${
                      item.status === "pass"
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/30"
                        : "bg-muted/40 border border-border text-muted-foreground hover:text-emerald-800 hover:border-emerald-500/40"
                    }`}
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Đạt</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetStatus(item.key, "fail")}
                    className={`h-12 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all select-none active:scale-95 ${
                      item.status === "fail"
                        ? "bg-rose-600 text-white shadow-md shadow-rose-900/30"
                        : "bg-muted/40 border border-border text-muted-foreground hover:text-rose-800 hover:border-rose-500/40"
                    }`}
                  >
                    <X className="w-4 h-4 stroke-[3]" />
                    <span>Lỗi</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetStatus(item.key, "na")}
                    className={`h-12 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold transition-all select-none active:scale-95 ${
                      item.status === "na"
                        ? "bg-muted-foreground/30 text-foreground shadow-sm"
                        : "bg-muted/40 border border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Minus className="w-3.5 h-3.5" />
                    <span>K.Áp dụng</span>
                  </button>
                </div>
              </div>

              {/* Fail Reason expanded input */}
              {item.status === "fail" && (
                <div className="mt-4 pt-3 border-t border-rose-500/20 space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-700 dark:text-rose-400" />
                      <span>Mô tả chi tiết sự cố / hư hỏng *</span>
                    </Label>
                    <Input
                      value={item.failReason}
                      onChange={(e) =>
                        handleSetFailReason(item.key, e.target.value)
                      }
                      placeholder="VD: Điều hòa chảy nước góc phải, quạt kêu to khi chạy"
                      className="h-10 text-xs bg-muted/40 border-rose-500/40 focus:border-rose-400"
                      required
                    />
                    <p className="text-[11px] text-rose-700 dark:text-rose-400/80">
                      Hệ thống sẽ tự động tạo một Phiếu công việc (Work Order)
                      để điều phối kỹ thuật xử lý.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">
                      Link ảnh chụp hiện trường (tùy chọn)
                    </Label>
                    <Input
                      value={item.photoUrl}
                      onChange={(e) =>
                        handleSetPhotoUrl(item.key, e.target.value)
                      }
                      placeholder="https://..."
                      className="h-8 text-xs bg-muted/40 border-border"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* General Note */}
        <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 space-y-2">
          <Label
            htmlFor="generalNote"
            className="text-xs font-semibold text-foreground/80"
          >
            Ghi chú tổng kết kiểm tra
          </Label>
          <textarea
            id="generalNote"
            rows={3}
            value={generalNote}
            onChange={(e) => setGeneralNote(e.target.value)}
            placeholder="Ghi chú thêm về vệ sinh, mùi phòng hoặc ý kiến cho ca làm việc tiếp theo..."
            className="w-full rounded-xl border border-border bg-muted/40 p-3 text-xs text-foreground outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none"
          />
        </div>

        {/* Bottom Sticky Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-card/95 border-t border-border p-3 sm:p-4 backdrop-blur-md z-30">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
            <div className="text-xs text-foreground/80">
              <span className="font-semibold text-foreground">
                Đã đánh giá {completedCount}/{totalCount}
              </span>
              <span className="text-muted-foreground hidden sm:inline">
                {" "}
                • {passedCount} Đạt • {failedCount} Lỗi
              </span>
            </div>

            <Button
              type="submit"
              disabled={isPending || completedCount < totalCount}
              className="h-11 px-6 font-bold text-xs uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-950/40 gap-2 disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ClipboardCheck className="w-4 h-4" />
              )}
              <span>Hoàn tất & Gửi biên bản</span>
            </Button>
          </div>
        </div>
      </form>

      {/* Completion Dialog */}
      <Dialog
        open={Boolean(completedResult)}
        onOpenChange={(open) => !open && setCompletedResult(null)}
      >
        <DialogContent className="max-w-md">
          {completedResult && (
            <>
              <DialogHeader className="text-center sm:text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 mx-auto flex items-center justify-center mb-2 border border-emerald-500/20">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <DialogTitle className="text-lg">
                  Đã lưu Biên bản kiểm tra!
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Kết quả đánh giá đã được ghi nhận vào hệ thống quản lý cơ sở
                  vật chất
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Score Banner */}
                <div className="p-4 rounded-xl bg-muted/40 border border-border text-center">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Điểm số biên bản
                  </span>
                  <span
                    className={`text-4xl font-black mt-1 block ${
                      completedResult.score >= 90
                        ? "text-emerald-700 dark:text-emerald-400"
                        : completedResult.score >= 75
                          ? "text-amber-700 dark:text-amber-400"
                          : "text-rose-700 dark:text-rose-400"
                    }`}
                  >
                    {completedResult.score}%
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">
                    {completedResult.score >= 90
                      ? "Phòng đạt tiêu chuẩn sạch đẹp & an toàn vận hành"
                      : completedResult.score >= 75
                        ? "Phòng đạt mức khá, cần khắc phục một số điểm nhỏ"
                        : "Phòng cần xử lý ngay các sự cố kỹ thuật trước khi đón khách"}
                  </p>
                </div>

                {/* Generated Work Orders Notice */}
                {completedResult.work_order_ids &&
                  completedResult.work_order_ids.length > 0 && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-300 space-y-2">
                      <div className="flex items-center gap-2 font-semibold text-rose-700 dark:text-rose-200">
                        <Wrench className="w-4 h-4 text-rose-700 dark:text-rose-400" />
                        <span>
                          Đã tự động khởi tạo{" "}
                          {completedResult.work_order_ids.length} Phiếu sự cố kỹ
                          thuật:
                        </span>
                      </div>
                      <p className="text-[11px] text-rose-700 dark:text-rose-300/80">
                        Phiếu sự cố đã được giao đến ban kỹ thuật xử lý ngay
                        theo thứ tự ưu tiên.
                      </p>
                      <Link
                        href="/facilities/work-orders"
                        className="inline-flex items-center gap-1 text-xs text-indigo-700 dark:text-indigo-400 hover:text-indigo-800 font-semibold pt-1 underline"
                      >
                        <span>Xem danh sách Phiếu sự cố kỹ thuật</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  )}
              </div>

              <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/facilities/maintenance")}
                  className="h-9 text-xs flex-1"
                >
                  Về trang Bảo trì
                </Button>
                <Button
                  size="sm"
                  onClick={handleStartAnother}
                  className="h-9 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex-1"
                >
                  Kiểm tra phòng khác
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
