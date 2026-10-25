"use client";

import { History, Search } from "lucide-react";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { VoucherRedemption } from "../types";

interface Props {
  redemptions: VoucherRedemption[];
}

export function RedemptionsHistoryTable({ redemptions }: Props) {
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = redemptions.filter((r) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    const matchCode = r.voucher_code?.toLowerCase().includes(q) || false;
    const matchTitle = r.voucher_title?.toLowerCase().includes(q) || false;
    const matchGuest = r.guest_name?.toLowerCase().includes(q) || false;
    const matchBranch = r.branch_name?.toLowerCase().includes(q) || false;
    return matchCode || matchTitle || matchGuest || matchBranch;
  });

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-slate-900 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
            <History className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">
              Nhật ký Đổi Voucher ({filtered.length})
            </h3>
            <p className="text-xs text-slate-400">
              Lịch sử các lần áp dụng mã voucher cho khách hàng và lượt lưu trú
            </p>
          </div>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo mã, khách, cơ sở..."
            className="h-8 pl-8 pr-3 text-xs rounded-md bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Bảng nhật ký */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-800/60">
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-xs text-slate-400 font-medium">
                Thời gian đổi
              </TableHead>
              <TableHead className="text-xs text-slate-400 font-medium">
                Mã Voucher
              </TableHead>
              <TableHead className="text-xs text-slate-400 font-medium">
                Chương trình ưu đãi
              </TableHead>
              <TableHead className="text-xs text-slate-400 font-medium">
                Khách hàng
              </TableHead>
              <TableHead className="text-xs text-slate-400 font-medium">
                Cơ sở áp dụng
              </TableHead>
              <TableHead className="text-xs text-slate-400 font-medium text-right">
                Số tiền chiết khấu
              </TableHead>
              <TableHead className="text-xs text-slate-400 font-medium">
                Ghi chú
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow className="border-slate-800">
                <TableCell
                  colSpan={7}
                  className="text-center py-12 text-slate-500 text-xs"
                >
                  Chưa có lịch sử đổi voucher nào
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow
                  key={r.id}
                  className="border-slate-800 hover:bg-slate-800/40 transition-colors"
                >
                  <TableCell className="text-xs text-slate-400">
                    {new Date(r.redeemed_at).toLocaleString("vi-VN", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>

                  <TableCell className="font-mono text-xs font-semibold text-emerald-400">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                      {r.voucher_code}
                    </span>
                  </TableCell>

                  <TableCell className="text-xs text-slate-200">
                    {r.voucher_title || "Ưu đãi thành viên"}
                  </TableCell>

                  <TableCell className="text-xs font-medium text-slate-200">
                    {r.guest_name}
                  </TableCell>

                  <TableCell className="text-xs text-slate-300">
                    {r.branch_name}
                  </TableCell>

                  <TableCell className="text-xs font-bold text-emerald-400 text-right">
                    -{new Intl.NumberFormat("vi-VN").format(r.discount_applied)}{" "}
                    đ
                  </TableCell>

                  <TableCell className="text-xs text-slate-400 max-w-[200px] truncate">
                    {r.note || "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
