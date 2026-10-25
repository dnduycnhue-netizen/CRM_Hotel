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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-card border border-border/80 rounded-2xl shadow-2xs">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15">
            <History className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Nhật ký Đổi Voucher ({filtered.length})
            </h3>
            <p className="text-xs text-muted-foreground">
              Lịch sử các lần áp dụng mã voucher cho khách hàng và lượt lưu trú
            </p>
          </div>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo mã, khách, cơ sở..."
            className="h-8.5 pl-8 pr-3 text-xs rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition"
          />
        </div>
      </div>

      {/* Bảng nhật ký */}
      <div className="bg-card border border-border/80 rounded-2xl shadow-2xs overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="border-border/60 hover:bg-transparent">
              <TableHead className="text-xs text-muted-foreground font-semibold">
                Thời gian đổi
              </TableHead>
              <TableHead className="text-xs text-muted-foreground font-semibold">
                Mã Voucher
              </TableHead>
              <TableHead className="text-xs text-muted-foreground font-semibold">
                Chương trình ưu đãi
              </TableHead>
              <TableHead className="text-xs text-muted-foreground font-semibold">
                Khách hàng
              </TableHead>
              <TableHead className="text-xs text-muted-foreground font-semibold">
                Cơ sở áp dụng
              </TableHead>
              <TableHead className="text-xs text-muted-foreground font-semibold text-right">
                Số tiền chiết khấu
              </TableHead>
              <TableHead className="text-xs text-muted-foreground font-semibold">
                Ghi chú
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow className="border-border/60">
                <TableCell
                  colSpan={7}
                  className="text-center py-12 text-muted-foreground text-xs"
                >
                  Chưa có lịch sử đổi voucher nào
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow
                  key={r.id}
                  className="border-border/60 hover:bg-muted/30 transition-colors"
                >
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(r.redeemed_at).toLocaleString("vi-VN", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>

                  <TableCell className="font-mono text-xs font-semibold">
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      {r.voucher_code}
                    </span>
                  </TableCell>

                  <TableCell className="text-xs text-foreground">
                    {r.voucher_title || "Ưu đãi thành viên"}
                  </TableCell>

                  <TableCell className="text-xs font-medium text-foreground">
                    {r.guest_name}
                  </TableCell>

                  <TableCell className="text-xs text-muted-foreground">
                    {r.branch_name}
                  </TableCell>

                  <TableCell className="text-xs font-bold text-emerald-600 dark:text-emerald-400 text-right">
                    -{new Intl.NumberFormat("vi-VN").format(r.discount_applied)}{" "}
                    đ
                  </TableCell>

                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
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
