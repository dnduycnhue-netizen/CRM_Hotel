"use client";

import {
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
  Globe,
  Hotel,
  Loader2,
  Share2,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { formatDateVN, getVnDateRange } from "@/shared/utils/date";
import { exportReportAction } from "../actions";
import type { ReportKpisResponse, ReportSeriesPoint } from "../types";

interface DashboardOverviewProps {
  data: ReportKpisResponse | null;
  series: ReportSeriesPoint[];
  branches: Array<{ id: string; name: string; code: string }>;
  initialBranchId?: string;
  initialPreset?: string;
  initialFrom?: string;
  initialTo?: string;
  canViewChain?: boolean;
  canExport?: boolean;
}

export function DashboardOverview({
  data,
  series,
  branches,
  initialBranchId = "all",
  initialPreset = "30days",
  initialFrom,
  initialTo,
  canViewChain = true,
  canExport = false,
}: DashboardOverviewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isExporting, setIsExporting] = useState(false);
  const [activeView, setActiveView] = useState<
    "chain" | "branches" | "channels"
  >("chain");

  const handleExportExcel = async () => {
    if (!data) return;
    try {
      setIsExporting(true);
      const res = await exportReportAction({
        from: data.range.from,
        to: data.range.to,
        branchId: initialBranchId,
      });
      if (!res.ok) {
        toast.error(
          `Không thể xuất báo cáo: ${res.error.message || res.error.code}`,
        );
        return;
      }
      const byteCharacters = atob(res.data.base64);
      const byteArray = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteArray[i] = byteCharacters.charCodeAt(i);
      }
      const blob = new Blob([byteArray], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.data.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Xuất báo cáo Excel thành công!");
    } catch (err: any) {
      console.error("Lỗi xuất báo cáo Excel:", err);
      toast.error(
        err?.message
          ? `Lỗi tạo tệp Excel: ${err.message}`
          : "Đã xảy ra lỗi khi tạo tệp Excel báo cáo",
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handlePresetChange = (preset: "7days" | "30days" | "thisMonth") => {
    const r = getVnDateRange(preset);
    startTransition(() => {
      const params = new URLSearchParams();
      if (initialBranchId && initialBranchId !== "all")
        params.set("branchId", initialBranchId);
      params.set("preset", preset);
      params.set("from", r.from);
      params.set("to", r.to);
      router.push(`/reports?${params.toString()}`);
    });
  };

  const handleBranchChange = (bId: string) => {
    startTransition(() => {
      const params = new URLSearchParams();
      if (bId !== "all") params.set("branchId", bId);
      if (initialPreset) params.set("preset", initialPreset);
      if (initialFrom) params.set("from", initialFrom);
      if (initialTo) params.set("to", initialTo);
      router.push(`/reports?${params.toString()}`);
    });
  };

  if (!data) {
    return (
      <div className="p-12 text-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
        Chưa có số liệu báo cáo cho khoảng thời gian này hoặc không đủ quyền
        truy cập.
      </div>
    );
  }

  const {
    current,
    compare,
    by_branch,
    by_channel,
    by_nationality,
    range,
    compare_range,
  } = data;

  const getDelta = (curr: number, prev?: number | null) => {
    if (prev === undefined || prev === null || prev === 0) return null;
    const diff = curr - prev;
    const pct = (diff / prev) * 100;
    return {
      diff,
      pct: pct.toFixed(1),
      isPositive: diff >= 0,
    };
  };

  const occDelta = compare
    ? (current.occupancy - compare.occupancy).toFixed(1)
    : null;
  const _arrivalsDelta = compare
    ? getDelta(current.arrivals, compare.arrivals)
    : null;
  const returnDelta = compare
    ? (current.returning_rate - compare.returning_rate).toFixed(1)
    : null;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/40">
              Phân hệ Vận hành & Công suất
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
            {canViewChain && initialBranchId === "all"
              ? "Báo cáo điều hành & Công suất chuỗi 8 khách sạn"
              : `Báo cáo điều hành & Công suất cơ sở: ${branches.find((b) => b.id === initialBranchId)?.name || "Cơ sở"}`}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {canViewChain && initialBranchId === "all"
              ? "Phân tích 240 phòng toàn chuỗi"
              : `Phân tích cơ sở: ${branches.find((b) => b.id === initialBranchId)?.name || initialBranchId}`}{" "}
            ({formatDateVN(range.from)} – {formatDateVN(range.to)})
            {compare_range && (
              <span className="text-indigo-600 dark:text-indigo-400 font-medium ml-1">
                · So sánh cùng kỳ năm trước (YoY)
              </span>
            )}
          </p>
        </div>

        {/* Tab chuyển đổi giữa các module báo cáo & Nút Xuất Excel */}
        <div className="flex flex-wrap items-center gap-3">
          {canExport && (
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-xs text-xs disabled:opacity-50"
            >
              {isExporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-3.5 h-3.5" />
              )}
              <span>{isExporting ? "Đang xuất..." : "Xuất báo cáo"}</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/60 text-xs self-start sm:self-auto">
            <Link
              href="/reports"
              className="px-3 py-1.5 rounded-xl font-semibold bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm transition"
            >
              Tổng quan KPI
            </Link>
            <Link
              href="/reports/monthly"
              className="px-3 py-1.5 rounded-xl font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
            >
              Doanh thu 12 tháng
            </Link>
            <Link
              href="/reports/facilities"
              className="px-3 py-1.5 rounded-xl font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
            >
              CSVC & Kỹ thuật
            </Link>
          </div>
        </div>
      </div>

      {/* Filter Toolbar (Cơ sở & Khoảng ngày) */}
      <div className="p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Chọn cơ sở */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl">
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-semibold text-slate-600 dark:text-slate-300">
              Cơ sở:
            </span>
            <select
              value={initialBranchId}
              onChange={(e) => handleBranchChange(e.target.value)}
              disabled={isPending}
              className="bg-transparent font-bold text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer"
            >
              {canViewChain && <option value="all">Toàn bộ 8 khách sạn</option>}
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Chọn mốc thời gian */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => handlePresetChange("7days")}
              disabled={isPending}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                initialPreset === "7days"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              7 ngày qua
            </button>
            <button
              type="button"
              onClick={() => handlePresetChange("30days")}
              disabled={isPending}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                initialPreset === "30days"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              30 ngày qua
            </button>
            <button
              type="button"
              onClick={() => handlePresetChange("thisMonth")}
              disabled={isPending}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                initialPreset === "thisMonth"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Tháng này
            </button>
          </div>
        </div>

        {/* Góc nhìn sub-views & Trạng thái tải */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveView("chain")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                activeView === "chain"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Tổng quan chuỗi
            </button>
            <button
              type="button"
              onClick={() => setActiveView("branches")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                activeView === "branches"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Theo 8 cơ sở
            </button>
            <button
              type="button"
              onClick={() => setActiveView("channels")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                activeView === "channels"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Kênh & Quốc tịch
            </button>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground font-mono">
            {isPending ? (
              <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-semibold animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Đang tải...
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {formatDateVN(range.from)} – {formatDateVN(range.to)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 4 Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Công suất buồng phòng */}
        <div className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Công suất phòng (Occupancy)
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
              <Hotel className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              {current.occupancy}%
            </div>
            {occDelta !== null && (
              <div className="flex items-center gap-1 text-xs font-semibold mt-1">
                {Number(occDelta) >= 0 ? (
                  <span className="text-emerald-600 flex items-center">
                    <TrendingUp className="w-3.5 h-3.5 mr-0.5" />+{occDelta}%
                  </span>
                ) : (
                  <span className="text-rose-600 flex items-center">
                    <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
                    {occDelta}%
                  </span>
                )}
                <span className="text-slate-400 font-normal">
                  so với cùng kỳ ({compare?.occupancy}%)
                </span>
              </div>
            )}
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(current.occupancy, 100)}%` }}
            />
          </div>
        </div>

        {/* Card 2: Tổng lượt khách & Đêm phòng */}
        <div className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Đêm phòng đã bán (Room Nights)
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              {current.room_nights.toLocaleString("vi-VN")}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Khả dụng: <strong>{current.available_room_nights}</strong> đêm ·
              Khóa OOO: <strong>{current.blocked_room_nights}</strong>
            </div>
          </div>
          <div className="text-[11px] text-slate-400">
            {current.arrivals} lượt đến · {current.guests} khách lưu trú
          </div>
        </div>

        {/* Card 3: Khách quay lại & Khách ở chéo chuỗi */}
        <div className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Tỷ lệ khách quen quay lại
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              {current.returning_rate}%
            </div>
            {returnDelta !== null && (
              <div className="flex items-center gap-1 text-xs font-semibold mt-1">
                {Number(returnDelta) >= 0 ? (
                  <span className="text-emerald-600 flex items-center">
                    <TrendingUp className="w-3.5 h-3.5 mr-0.5" />+{returnDelta}%
                  </span>
                ) : (
                  <span className="text-rose-600 flex items-center">
                    <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
                    {returnDelta}%
                  </span>
                )}
                <span className="text-slate-400 font-normal">
                  so với kỳ trước
                </span>
              </div>
            )}
          </div>
          <div className="text-[11px] text-slate-500">
            <strong>{current.cross_branch_guests}</strong> khách ở chéo giữa 8
            khách sạn
          </div>
        </div>

        {/* Card 4: Số ngày ở bình quân & Tỷ lệ hủy */}
        <div className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Thời gian ở bình quân (ALOS)
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              {current.alos}{" "}
              <span className="text-base font-medium text-slate-400">
                đêm/lượt
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Tỷ lệ hủy phòng:{" "}
              <strong className="text-slate-700 dark:text-slate-300">
                {current.cancel_rate}%
              </strong>{" "}
              ({current.cancellations} lượt)
            </div>
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Khách mới kỳ này: {current.new_guests} (
            {100 - current.returning_rate}%)
          </div>
        </div>
      </div>

      {/* View 1: Chain Overview & Time Series Chart */}
      {activeView === "chain" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trend Chart (2 cols) */}
          <div className="lg:col-span-2 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                  Xu hướng công suất buồng phòng theo thời gian
                </h3>
                <p className="text-xs text-slate-400">
                  So sánh trực quan biến động công suất (%) kỳ này vs cùng kỳ
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 font-semibold text-indigo-600">
                  <span className="w-3 h-3 rounded-full bg-indigo-600" /> Kỳ này
                </span>
                <span className="flex items-center gap-1.5 font-semibold text-slate-400">
                  <span className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-700" />{" "}
                  Cùng kỳ năm trước
                </span>
              </div>
            </div>

            {/* Simple SVG / CSS Trend Bars */}
            <div className="pt-4 h-64 flex items-end gap-1.5 overflow-x-auto pb-2">
              {series.map((point, idx) => {
                const curH = Math.min(point.cur?.occupancy || 0, 100);
                const cmpH = Math.min(point.cmp?.occupancy || 0, 100);

                return (
                  <div
                    key={idx}
                    className="flex-1 min-w-[20px] flex flex-col items-center gap-1 h-full justify-end group relative"
                  >
                    {/* Tooltip */}
                    <div className="absolute -top-12 bg-slate-900 text-white text-[10px] py-1 px-2 rounded-lg opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-20">
                      {new Date(point.bucket).toLocaleDateString("vi-VN")}:{" "}
                      {curH}%{cmpH > 0 && ` (Cùng kỳ: ${cmpH}%)`}
                    </div>

                    <div className="w-full flex items-end gap-0.5 h-full">
                      {cmpH > 0 && (
                        <div
                          className="w-1/2 bg-slate-200 dark:bg-slate-700 rounded-t-md transition-all duration-300"
                          style={{ height: `${cmpH}%` }}
                        />
                      )}
                      <div
                        className="w-full bg-indigo-600 rounded-t-md transition-all duration-300 group-hover:bg-indigo-500"
                        style={{ height: `${curH}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-slate-400 truncate max-w-full">
                      {new Date(point.bucket).getDate()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top 3 & Bottom 3 Branches Quick Rank */}
          <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
              Xếp hạng công suất 8 khách sạn
            </h3>
            <div className="space-y-3 pt-1">
              {[...by_branch]
                .sort((a, b) => b.current.occupancy - a.current.occupancy)
                .map((b, idx) => (
                  <div
                    key={b.branch_id}
                    className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center ${
                          idx === 0
                            ? "bg-amber-500 text-white"
                            : idx === 1
                              ? "bg-slate-400 text-white"
                              : idx === 2
                                ? "bg-amber-700 text-white"
                                : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-bold text-xs text-slate-900 dark:text-slate-100">
                          {b.branch}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {b.current.room_nights} đêm phòng đã bán
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-sm text-indigo-600 dark:text-indigo-400">
                        {b.current.occupancy}%
                      </div>
                      {b.compare && (
                        <div className="text-[10px] text-slate-400">
                          Cùng kỳ: {b.compare.occupancy}%
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* View 2: Branches Comparison Table */}
      {activeView === "branches" && (
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
              Bảng so sánh chi tiết hiệu quả kinh doanh 8 khách sạn
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              So sánh công suất, số đêm phòng, tỷ lệ khách quen và tỷ lệ hủy
              theo từng cơ sở
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/70 dark:bg-slate-800/40 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Cơ sở khách sạn</th>
                  <th className="py-3.5 px-4">Công suất kỳ này</th>
                  <th className="py-3.5 px-4">Cùng kỳ (YoY)</th>
                  <th className="py-3.5 px-4">Đêm phòng bán</th>
                  <th className="py-3.5 px-4">Khách đến</th>
                  <th className="py-3.5 px-4">Tỷ lệ khách quen</th>
                  <th className="py-3.5 px-4">ALOS</th>
                  <th className="py-3.5 px-4">Hủy phòng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {by_branch.map((b) => {
                  const diffOcc = b.compare
                    ? (b.current.occupancy - b.compare.occupancy).toFixed(1)
                    : null;

                  return (
                    <tr
                      key={b.branch_id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                    >
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                        {b.branch}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-extrabold text-sm text-indigo-600 dark:text-indigo-400">
                          {b.current.occupancy}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold">
                        {diffOcc !== null ? (
                          Number(diffOcc) >= 0 ? (
                            <span className="text-emerald-600">
                              +{diffOcc}%
                            </span>
                          ) : (
                            <span className="text-rose-600">{diffOcc}%</span>
                          )
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold">
                        {b.current.room_nights}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-400">
                        {b.current.arrivals} lượt ({b.current.guests} khách)
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-400">
                        {b.current.returning_rate}%
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-400">
                        {b.current.alos} đêm
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {b.current.cancel_rate}% ({b.current.cancellations})
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View 3: Channels & Nationalities */}
      {activeView === "channels" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Channels */}
          <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
              <Share2 className="w-5 h-5 text-indigo-600" />
              Cơ cấu kênh bán & Nguồn khách
            </h3>

            <div className="space-y-3">
              {by_channel.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Chưa có dữ liệu kênh bán trong khoảng thời gian này.
                </div>
              ) : (
                by_channel.map((ch) => (
                  <div
                    key={ch.channel}
                    className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-slate-100">
                        {ch.channel}
                      </div>
                      <div className="text-[10px] text-slate-400 capitalize">
                        Loại kênh: {ch.kind}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
                        {ch.current} lượt
                      </div>
                      {ch.compare !== null && ch.compare !== undefined && (
                        <div className="text-[10px] text-slate-400">
                          Cùng kỳ: {ch.compare}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Nationalities */}
          <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
              <Globe className="w-5 h-5 text-indigo-600" />
              Phân bố Quốc tịch khách lưu trú
            </h3>

            <div className="space-y-3">
              {by_nationality.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Chưa có dữ liệu quốc tịch khách.
                </div>
              ) : (
                by_nationality.map((nat) => (
                  <div
                    key={nat.nationality}
                    className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 font-bold text-xs flex items-center justify-center uppercase">
                        {nat.nationality}
                      </span>
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                        {nat.nationality === "VN"
                          ? "Việt Nam"
                          : nat.nationality}
                      </span>
                    </div>
                    <div className="font-extrabold text-sm text-slate-800 dark:text-slate-200">
                      {nat.guests} khách
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
