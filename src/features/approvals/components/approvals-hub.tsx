'use client';

import React, { useState } from 'react';
import { MergeRequestItem, PendingFlagItem } from '../types';
import { MergeApprovalCard } from './merge-approval-card';
import { FlagsApprovalTable } from './flags-approval-table';
import { GitMerge, ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react';

interface Props {
  mergeRequests: MergeRequestItem[];
  pendingFlags: PendingFlagItem[];
}

export function ApprovalsHub({ mergeRequests, pendingFlags }: Props) {
  const [activeTab, setActiveTab] = useState<'merges' | 'flags'>('merges');

  return (
    <div className="space-y-6">
      {/* Header Info Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Hồ sơ trùng cần gộp</p>
            <p className="text-2xl font-bold text-indigo-400 mt-1">{mergeRequests.length}</p>
          </div>
          <span className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400">
            <GitMerge className="w-6 h-6" />
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Cờ Blacklist chờ duyệt</p>
            <p className="text-2xl font-bold text-rose-400 mt-1">{pendingFlags.length}</p>
          </div>
          <span className="p-3 rounded-xl bg-rose-500/10 text-rose-400">
            <ShieldAlert className="w-6 h-6" />
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Tiêu chuẩn bảo mật</p>
            <p className="text-sm font-semibold text-emerald-400 mt-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Xác thực 2 lớp (RPC)
            </p>
          </div>
          <span className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
            <AlertCircle className="w-6 h-6" />
          </span>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex border-b border-slate-800 space-x-6">
        <button
          type="button"
          onClick={() => setActiveTab('merges')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'merges'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <GitMerge className="w-4 h-4" />
          Gộp hồ sơ trùng lặp
          {mergeRequests.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-indigo-500/20 text-indigo-300 font-bold">
              {mergeRequests.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('flags')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'flags'
              ? 'border-rose-500 text-rose-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          Xét duyệt cờ Blacklist & Chú ý
          {pendingFlags.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-rose-500/20 text-rose-300 font-bold">
              {pendingFlags.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'merges' ? (
        <div className="space-y-4">
          {mergeRequests.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center text-slate-400">
              <GitMerge className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-base font-medium text-slate-300">Không có yêu cầu gộp hồ sơ nào đang chờ duyệt</p>
              <p className="text-xs text-slate-500 mt-1">
                Hệ thống tự động phát hiện trùng CCCD/SĐT hoặc đề xuất thủ công từ Lễ tân sẽ hiển thị tại đây.
              </p>
            </div>
          ) : (
            mergeRequests.map((req) => <MergeApprovalCard key={req.id} request={req} />)
          )}
        </div>
      ) : (
        <FlagsApprovalTable flags={pendingFlags} />
      )}
    </div>
  );
}
