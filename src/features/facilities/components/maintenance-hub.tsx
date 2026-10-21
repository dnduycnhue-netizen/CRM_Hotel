'use client';

import React, { useState } from 'react';
import { PmPlanItem, InspectionItem } from '../data/maintenance';
import {
  Wrench,
  ClipboardCheck,
  Calendar,
  Building2,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Clock,
  User,
} from 'lucide-react';

interface Props {
  plans: PmPlanItem[];
  inspections: InspectionItem[];
  branches: Array<{ id: string; name: string }>;
}

export function MaintenanceHub({ plans, inspections, branches }: Props) {
  const [activeTab, setActiveTab] = useState<'plans' | 'inspections'>('plans');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');

  const filteredPlans = plans.filter((p) => {
    if (selectedBranch !== 'all' && p.branch_id !== selectedBranch) return false;
    return true;
  });

  const filteredInspections = inspections.filter((ins) => {
    if (selectedBranch !== 'all' && ins.branch_id !== selectedBranch) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Kế hoạch bảo trì định kỳ</p>
            <p className="text-2xl font-bold text-indigo-400 mt-1">{plans.length}</p>
          </div>
          <span className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400">
            <Wrench className="w-5 h-5" />
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Lượt kiểm tra đã thực hiện</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{inspections.length}</p>
          </div>
          <span className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
            <ClipboardCheck className="w-5 h-5" />
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Tự động sinh phiếu (Cron)</p>
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
            onClick={() => setActiveTab('plans')}
            className={`pb-2 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'plans'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wrench className="w-4 h-4" />
            Kế hoạch bảo trì ({filteredPlans.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('inspections')}
            className={`pb-2 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'inspections'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            Lịch sử kiểm tra ({filteredInspections.length})
          </button>
        </div>

        <div className="w-48">
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
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

      {/* Tab 1: Maintenance Plans */}
      {activeTab === 'plans' ? (
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
                    <h3 className="font-semibold text-slate-200 text-sm">{plan.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-slate-500" />
                        {plan.branch_name}
                      </span>
                      {plan.asset_name && <span>• Thiết bị: {plan.asset_name}</span>}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 whitespace-nowrap">
                    Chu kỳ: {plan.interval_days} ngày
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 pt-1 border-t border-slate-800/80">
                  <div>
                    <span className="text-slate-500">Hạn kế tiếp:</span>{' '}
                    <strong className="text-amber-400">{plan.next_due_date}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Đơn vị xử lý:</span>{' '}
                    <span>{plan.vendor_name || plan.assignee_name || 'Nội bộ KS'}</span>
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
                        <li className="text-slate-500">+{plan.checklist.length - 3} hạng mục khác...</li>
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
                    <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                      Chưa có biên bản kiểm tra nào được ghi nhận
                    </td>
                  </tr>
                ) : (
                  filteredInspections.map((ins) => (
                    <tr key={ins.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 text-xs text-slate-300 whitespace-nowrap">
                        {new Date(ins.performed_at).toLocaleString('vi-VN')}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-200">
                        <div className="font-medium">{ins.branch_name}</div>
                        {ins.room_number && (
                          <span className="text-slate-400">Phòng {ins.room_number}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs font-medium text-slate-200">
                        {ins.template_name}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-300">{ins.inspector_name}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-emerald-400 font-semibold">{ins.passed} Đạt</span>
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
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : ins.score >= 75
                                  ? 'bg-amber-500/10 text-amber-400'
                                  : 'bg-rose-500/10 text-rose-400'
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
    </div>
  );
}
