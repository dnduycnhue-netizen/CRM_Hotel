'use client';

import React from 'react';
import { ArrowRight, Info, PlusCircle, MinusCircle, RefreshCw } from 'lucide-react';

interface Props {
  action: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  meta: Record<string, unknown> | null;
}

export function AuditDiffViewer({ action, before, after, meta }: Props) {
  // Event log without before/after but with metadata
  if (!before && !after && meta) {
    return (
      <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs space-y-2">
        <div className="flex items-center gap-1.5 text-indigo-400 font-semibold">
          <Info className="w-4 h-4" />
          <span>Thông tin nhật ký truy cập (Event Metadata)</span>
        </div>
        <pre className="p-2.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">
          {JSON.stringify(meta, null, 2)}
        </pre>
      </div>
    );
  }

  // Insert: only after
  if (!before && after) {
    const keys = Object.keys(after);
    return (
      <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs space-y-2">
        <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
          <PlusCircle className="w-4 h-4" />
          <span>Thêm mới bản ghi ({keys.length} trường)</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
          {keys.map((k) => (
            <div key={k} className="p-1.5 rounded bg-emerald-950/20 border border-emerald-900/40">
              <span className="font-semibold text-slate-400">{k}: </span>
              <span className="text-emerald-300">{formatValue(after[k])}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Delete: only before
  if (before && !after) {
    const keys = Object.keys(before);
    return (
      <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs space-y-2">
        <div className="flex items-center gap-1.5 text-rose-400 font-semibold">
          <MinusCircle className="w-4 h-4" />
          <span>Đã xóa bản ghi ({keys.length} trường)</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
          {keys.map((k) => (
            <div key={k} className="p-1.5 rounded bg-rose-950/20 border border-rose-900/40">
              <span className="font-semibold text-slate-400">{k}: </span>
              <span className="text-rose-300">{formatValue(before[k])}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Update: compare before and after
  if (before && after) {
    const allKeys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
    const changedKeys = allKeys.filter(
      (k) => JSON.stringify(before[k]) !== JSON.stringify(after[k])
    );

    if (changedKeys.length === 0) {
      return (
        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-400">
          Không có trường dữ liệu nào bị thay đổi.
        </div>
      );
    }

    return (
      <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs space-y-2">
        <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
          <RefreshCw className="w-4 h-4" />
          <span>Có {changedKeys.length} trường dữ liệu thay đổi</span>
        </div>
        <div className="space-y-1.5">
          {changedKeys.map((k) => (
            <div
              key={k}
              className="p-2 rounded bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px]"
            >
              <span className="font-semibold text-slate-300 w-32 shrink-0">{k}:</span>
              <div className="flex items-center gap-2 flex-1 flex-wrap">
                <span className="px-1.5 py-0.5 rounded bg-rose-950/40 text-rose-400 border border-rose-900/40 line-through">
                  {formatValue(before[k])}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-900/40 font-medium">
                  {formatValue(after[k])}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-500">
      Không có thông tin chi tiết thay đổi.
    </div>
  );
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return 'null';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}
