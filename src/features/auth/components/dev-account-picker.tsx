"use client";

import { Zap } from "lucide-react";

interface DevAccountPickerProps {
  onSelect: (email: string) => void;
}

const DEV_TEST_ACCOUNTS = [
  {
    role: "Chủ chuỗi",
    email: "owner@hotel.vn",
    scope: "Toàn quyền",
    badgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  },
  {
    role: "Quản lý",
    email: "quanly.boutique@hotel.vn",
    scope: "Boutique",
    badgeClass: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  },
  {
    role: "Lễ tân",
    email: "letan.boutique@hotel.vn",
    scope: "Boutique",
    badgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  },
  {
    role: "Sales",
    email: "sales@hotel.vn",
    scope: "Toàn chuỗi",
    badgeClass: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  },
  {
    role: "Kỹ thuật",
    email: "kythuat@hotel.vn",
    scope: "CSVC",
    badgeClass: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  },
];

export default function DevAccountPicker({ onSelect }: DevAccountPickerProps) {
  return (
    <div className="space-y-2 rounded-xl bg-slate-800/40 border border-slate-700/60 p-3">
      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
        <span className="flex items-center gap-1.5 text-amber-300">
          <Zap className="h-3.5 w-3.5" />
          Môi trường DEV — Điền nhanh email:
        </span>
        <span className="text-[10px] text-slate-400">Chỉ điền email</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
        {DEV_TEST_ACCOUNTS.map((acc) => (
          <button
            key={acc.email}
            type="button"
            onClick={() => onSelect(acc.email)}
            className={`py-1.5 px-2 rounded-lg border text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${acc.badgeClass} flex flex-col justify-between`}
          >
            <div className="font-bold text-[11px] leading-tight">
              {acc.role}
            </div>
            <div className="text-[9px] opacity-75 mt-0.5">{acc.scope}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
