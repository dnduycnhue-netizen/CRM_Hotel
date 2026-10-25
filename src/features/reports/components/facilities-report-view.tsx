"use client";

import {
  Bed,
  Building2,
  Calendar,
  Clock,
  DollarSign,
  Layers,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/shared/ui";
import { formatDateVN, getVnDateRange } from "@/shared/utils/date";
import type { FacilityReportResponse } from "../types";

interface FacilitiesReportViewProps {
  data: FacilityReportResponse | null;
  branches: Array<{ id: string; name: string; code: string }>;
  initialBranchId?: string;
  initialPreset?: string;
  initialFrom?: string;
  initialTo?: string;
}

export function FacilitiesReportView({
  data,
  branches,
  initialBranchId = "all",
  initialPreset = "30days",
  initialFrom,
  initialTo,
}: FacilitiesReportViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handlePresetChange = (preset: "7days" | "30days" | "thisMonth") => {
    const r = getVnDateRange(preset);
    startTransition(() => {
      const params = new URLSearchParams();
      if (initialBranchId && initialBranchId !== "all")
        params.set("branchId", initialBranchId);
      params.set("preset", preset);
      params.set("from", r.from);
      params.set("to", r.to);
      router.push(`/reports/facilities?${params.toString()}`);
    });
  };

  const handleBranchChange = (bId: string) => {
    startTransition(() => {
      const params = new URLSearchParams();
      if (bId !== "all") params.set("branchId", bId);
      if (initialPreset) params.set("preset", initialPreset);
      if (initialFrom) params.set("from", initialFrom);
      if (initialTo) params.set("to", initialTo);
      router.push(`/reports/facilities?${params.toString()}`);
    });
  };

  const curr = data?.current;
  const _comp = data?.compare;

  const formatVND = (num: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(num);
  };

  const totalCategoryCost = (curr?.by_category || []).reduce(
    (sum, item) => sum + (item.cost || 0),
    0,
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/40">
              Phân hệ Kỹ thuật & CSVC
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Wrench className="w-6 h-6 text-indigo-600" />
            Báo cáo Vận hành Cơ sở vật chất & Bảo trì
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {initialBranchId === "all"
              ? branches.length === 1
                ? `Cơ sở: ${branches[0]?.name}`
                : `Thống kê toàn chuỗi ${branches.length} khách sạn`
              : `Cơ sở: ${branches.find((b) => b.id === initialBranchId)?.name || initialBranchId}`}
            {initialFrom &&
              initialTo &&
              ` (${formatDateVN(initialFrom)} – ${formatDateVN(initialTo)})`}
          </p>
        </div>

        {/* Tab chuyển đổi giữa các module báo cáo */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/60 text-xs self-start sm:self-auto">
          <Link
            href="/reports"
            className="px-3 py-1.5 rounded-xl font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
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
            className="px-3 py-1.5 rounded-xl font-semibold bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm transition"
          >
            CSVC & Kỹ thuật
          </Link>
        </div>
      </div>

      {/* Filter Toolbar (Cơ sở & Khoảng ngày) */}
      <div className="p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Chọn cơ sở */}
          {branches.length === 1 ? (
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200">
              <Building2 className="w-3.5 h-3.5 text-indigo-500" />
              <span>{branches[0]?.name}</span>
            </div>
          ) : (
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
                <option value="all">
                  Toàn chuỗi ({branches.length} khách sạn)
                </option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Chọn nhanh mốc thời gian */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => handlePresetChange("7days")}
              disabled={isPending}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                initialPreset === "7days"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              7 ngày qua
            </button>
            <button
              type="button"
              onClick={() => handlePresetChange("30days")}
              disabled={isPending}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                initialPreset === "30days"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              30 ngày qua
            </button>
            <button
              type="button"
              onClick={() => handlePresetChange("thisMonth")}
              disabled={isPending}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                initialPreset === "thisMonth"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Tháng này
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/facilities/work-orders">
            <Button
              size="sm"
              variant="outline"
              className="h-8 rounded-xl text-xs font-semibold"
            >
              Quản lý Phiếu sự cố
            </Button>
          </Link>
          <Link href="/facilities/report">
            <Button
              size="sm"
              className="h-8 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              + Báo sự cố mới
            </Button>
          </Link>
        </div>
      </div>

      {!curr ? (
        <div className="p-12 text-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
          Chưa có dữ liệu cơ sở vật chất cho khoảng thời gian đã chọn.
        </div>
      ) : (
        <>
          {/* Main 6 KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Tổng sự cố phát sinh */}
            <div className="p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Sự cố phát sinh
                </span>
                <span className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
                  <Wrench className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
                  {curr.created}
                </span>
                <span className="text-xs text-slate-400">phiếu</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
                <span title="Bao gồm các phiếu sự cố có trạng thái Hoàn thành hoặc Đã đóng">
                  Đã nghiệm thu xong:
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {curr.completed} phiếu (
                  {curr.created > 0
                    ? Math.round((curr.completed / curr.created) * 100)
                    : 0}
                  %)
                </span>
              </div>
            </div>

            {/* 2. Tỷ lệ xử lý đúng hạn SLA */}
            <div className="p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Đúng hạn SLA
                </span>
                <span className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {curr.on_time_rate != null ? `${curr.on_time_rate}%` : "—"}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
                <span>Mục tiêu chuỗi:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  &ge; 90%
                </span>
              </div>
            </div>

            {/* 3. Thời gian giải quyết trung bình (MTTR) */}
            <div className="p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Thời gian xử lý bình quân (MTTR)
                </span>
                <span className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
                  {curr.avg_resolve_hours != null
                    ? `${curr.avg_resolve_hours}`
                    : "—"}
                </span>
                <span className="text-xs text-slate-400">
                  {curr.avg_resolve_hours != null ? "giờ / sự cố" : "chưa có phát sinh"}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
                <span>Khẩn cấp (&le; 4h) / Bình thường (&le; 72h)</span>
              </div>
            </div>

            {/* 4. Tổng chi phí sửa chữa bảo trì */}
            <div className="p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Tổng chi phí bảo trì
                </span>
                <span className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                  {formatVND(curr.total_cost)}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
                <span>Gồm nhân công + vật tư + đối tác ngoài</span>
              </div>
            </div>

            {/* 5. Bảo trì định kỳ (PM) */}
            <div className="p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Bảo trì định kỳ (PM)
                </span>
                <span className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">
                  {curr.pm_due > 0 && curr.pm_on_time_rate != null
                    ? `${curr.pm_on_time_rate}%`
                    : "—"}
                </span>
                <span className="text-xs text-slate-400">
                  {curr.pm_due > 0 ? "đúng hạn" : "không có kỳ hạn"}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
                <span>Kế hoạch tới hạn kỳ này:</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {curr.pm_due > 0 ? `${curr.pm_due} lượt` : "Không có kế hoạch tới hạn"}
                </span>
              </div>
            </div>

            {/* 6. Đêm phòng ngừng bán (OOO) */}
            <div className="p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Phòng ngừng bán do hỏng (OOO)
                </span>
                <span className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center">
                  <Bed className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-rose-600 dark:text-rose-400">
                  {curr.blocked_room_nights}
                </span>
                <span className="text-xs text-slate-400">đêm phòng</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
                <span>Tác động tới doanh thu tiềm năng</span>
              </div>
            </div>
          </div>

          {/* Breakdown Table: Sự cố và chi phí theo nhóm thiết bị */}
          <div className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-600" />
                  Cơ cấu sự cố & Chi phí bảo trì theo Phân loại thiết bị
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Chi tiết tỷ trọng số lượng hư hỏng và chi phí phát sinh thực
                  tế
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/70 dark:bg-slate-800/40 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Nhóm thiết bị / Hạng mục</th>
                    <th className="py-3 px-4 text-center">Số phiếu sự cố</th>
                    <th className="py-3 px-4 text-right">Chi phí bảo trì</th>
                    <th className="py-3 px-4 text-right">Tỷ trọng chi phí</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {!curr.by_category || curr.by_category.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-8 text-center text-slate-400 text-xs"
                      >
                        Chưa có sự cố nào phát sinh theo danh mục trong kỳ này.
                      </td>
                    </tr>
                  ) : (
                    curr.by_category.map((item, idx) => {
                      const costPct =
                        totalCategoryCost > 0
                          ? ((item.cost || 0) / totalCategoryCost) * 100
                          : 0;
                      return (
                        <tr
                          key={idx}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                        >
                          <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200 text-xs">
                            {item.category || "Khác"}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-slate-700 dark:text-slate-300 text-xs">
                            {item.orders}
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-slate-100 text-xs">
                            {formatVND(item.cost || 0)}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-24 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-indigo-600 rounded-full"
                                  style={{
                                    width: `${Math.min(costPct, 100)}%`,
                                  }}
                                />
                              </div>
                              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 w-10 text-right">
                                {costPct.toFixed(1)}%
                              </span>
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
        </>
      )}
    </div>
  );
}
