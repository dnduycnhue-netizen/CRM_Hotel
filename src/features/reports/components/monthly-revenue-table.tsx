'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileSpreadsheet,
  Building2,
  DollarSign,
  TrendingUp,
  Calendar,
  Layers,
  Loader2,
} from 'lucide-react';
import { MonthlyReportRow } from '../types';

interface MonthlyRevenueTableProps {
  initialRows: MonthlyReportRow[];
  year: number;
  branches: Array<{ id: string; name: string; code: string }>;
  initialBranchId?: string;
}

export function MonthlyRevenueTable({
  initialRows,
  year,
  branches,
  initialBranchId = 'all',
}: MonthlyRevenueTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleBranchChange = (bId: string) => {
    startTransition(() => {
      const params = new URLSearchParams();
      if (bId !== 'all') params.set('branchId', bId);
      params.set('year', year.toString());
      router.push(`/reports/monthly?${params.toString()}`);
    });
  };

  const formatVnd = (val?: number | null) => {
    if (val === null || val === undefined) return '—';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
            Báo cáo Doanh thu & Chỉ số ADR, RevPAR năm {year}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Tổng hợp dữ liệu kinh doanh 12 tháng, kết hợp số liệu thực tế CRM và số nền lịch sử
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />}
          <span className="text-xs text-slate-400 font-medium">Cơ sở:</span>
          <select
            value={initialBranchId}
            onChange={(e) => handleBranchChange(e.target.value)}
            disabled={isPending}
            className="text-xs py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-semibold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
          >
            <option value="all">Toàn bộ 8 cơ sở</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/70 dark:bg-slate-800/40 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Tháng</th>
                <th className="py-3.5 px-4">Nguồn dữ liệu</th>
                <th className="py-3.5 px-4">Lượt đến</th>
                <th className="py-3.5 px-4">Đêm phòng đã bán</th>
                <th className="py-3.5 px-4">Công suất (%)</th>
                <th className="py-3.5 px-4">Doanh thu phòng</th>
                <th className="py-3.5 px-4">ADR (Giá BQ/đêm)</th>
                <th className="py-3.5 px-4 text-right">RevPAR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {initialRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    Chưa có dữ liệu doanh thu tháng cho năm {year}.
                  </td>
                </tr>
              ) : (
                initialRows.map((row) => {
                  const mDate = new Date(row.month);
                  const monthName = `Tháng ${mDate.getMonth() + 1}/${mDate.getFullYear()}`;

                  return (
                    <tr
                      key={row.month}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                    >
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                        {monthName}
                      </td>

                      <td className="py-3.5 px-4 text-xs">
                        {row.source === 'app' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Hệ thống CRM
                          </span>
                        ) : row.source === 'baseline' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                            Số nền nhập tay
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">Kết hợp</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {row.arrivals?.toLocaleString('vi-VN') || 0}
                      </td>

                      <td className="py-3.5 px-4 text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {row.room_nights?.toLocaleString('vi-VN') || 0}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-extrabold text-xs text-indigo-600 dark:text-indigo-400">
                          {row.occupancy || 0}%
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-xs font-bold text-slate-900 dark:text-slate-100">
                        {formatVnd(row.room_revenue)}
                      </td>

                      <td className="py-3.5 px-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {formatVnd(row.adr)}
                      </td>

                      <td className="py-3.5 px-4 text-right text-xs font-extrabold text-emerald-600">
                        {formatVnd(row.revpar)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
