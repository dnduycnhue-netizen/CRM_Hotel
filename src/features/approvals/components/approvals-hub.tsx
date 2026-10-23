"use client";

import { CheckCircle2, GitMerge, ShieldAlert, ShieldCheck } from "lucide-react";
import React, { useState } from "react";
import type { MergeRequestItem, PendingFlagItem } from "../types";
import { ActiveFlagsTable } from "./active-flags-table";
import { FlagsApprovalTable } from "./flags-approval-table";
import { MergeApprovalCard } from "./merge-approval-card";

interface Props {
  mergeRequests: MergeRequestItem[];
  pendingFlags: PendingFlagItem[];
  activeFlags?: PendingFlagItem[];
}

export function ApprovalsHub({
  mergeRequests,
  pendingFlags,
  activeFlags = [],
}: Props) {
  const [activeTab, setActiveTab] = useState<
    "merges" | "flags" | "active_flags"
  >("merges");

  return (
    <div className="space-y-6">
      {/* Header Info Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">
              Hồ sơ trùng cần gộp
            </p>
            <p className="text-2xl font-bold text-indigo-400 mt-1">
              {mergeRequests.length}
            </p>
          </div>
          <span className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400">
            <GitMerge className="w-6 h-6" />
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">
              Cờ Blacklist chờ duyệt
            </p>
            <p className="text-2xl font-bold text-rose-400 mt-1">
              {pendingFlags.length}
            </p>
          </div>
          <span className="p-3 rounded-xl bg-rose-500/10 text-rose-400">
            <ShieldAlert className="w-6 h-6" />
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">
              Cờ Blacklist đang hiệu lực
            </p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              {activeFlags.length}
            </p>
          </div>
          <span className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
            <ShieldCheck className="w-6 h-6" />
          </span>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex border-b border-slate-800 space-x-6">
        <button
          type="button"
          onClick={() => setActiveTab("merges")}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "merges"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <GitMerge className="w-4 h-4" />
          <span>Gộp hồ sơ trùng lặp</span>
          {mergeRequests.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-indigo-500/20 text-indigo-300 font-bold">
              {mergeRequests.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("flags")}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "flags"
              ? "border-rose-500 text-rose-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Xét duyệt cờ Blacklist & Chú ý</span>
          {pendingFlags.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-rose-500/20 text-rose-300 font-bold">
              {pendingFlags.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("active_flags")}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "active_flags"
              ? "border-emerald-500 text-emerald-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Danh sách cờ đang áp dụng</span>
          {activeFlags.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/20 text-emerald-300 font-bold">
              {activeFlags.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === "merges" ? (
        <div className="space-y-4">
          {mergeRequests.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center text-slate-400">
              <GitMerge className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-base font-medium text-slate-300">
                Không có yêu cầu gộp hồ sơ nào đang chờ duyệt
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Hệ thống tự động phát hiện trùng CCCD/SĐT hoặc đề xuất thủ công
                từ Lễ tân sẽ hiển thị tại đây.
              </p>
            </div>
          ) : (
            mergeRequests.map((req) => (
              <MergeApprovalCard key={req.id} request={req} />
            ))
          )}
        </div>
      ) : activeTab === "flags" ? (
        <FlagsApprovalTable flags={pendingFlags} />
      ) : (
        <ActiveFlagsTable flags={activeFlags} />
      )}
    </div>
  );
}
