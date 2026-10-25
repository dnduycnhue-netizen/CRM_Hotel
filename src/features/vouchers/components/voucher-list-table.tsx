"use client";

import {
  Calendar,
  Check,
  Copy,
  DollarSign,
  Gift,
  Plus,
  Search,
  Tag,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Voucher } from "../types";
import { CreateVoucherDialog } from "./create-voucher-dialog";
import { RedeemVoucherDialog } from "./redeem-voucher-dialog";

interface Props {
  initialVouchers: Voucher[];
  branches: Array<{ id: string; name: string }>;
  guests: Array<{ id: string; full_name: string; phone: string | null }>;
  defaultBranchId?: string;
  onRefresh?: () => void;
}

export function VoucherListTable({
  initialVouchers,
  branches,
  guests,
  defaultBranchId,
  onRefresh,
}: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [redeemDialogOpen, setRedeemDialogOpen] = useState(false);
  const [selectedVoucherForRedeem, setSelectedVoucherForRedeem] = useState<
    | {
        code: string;
        branchId?: string;
        guestId?: string;
      }
    | undefined
  >(undefined);

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      toast.error(
        "Không thể sao chép tự động, vui lòng chọn và copy mã thủ công",
      );
      return;
    }
    setCopiedCode(code);
    toast.success(`Đã sao chép mã voucher ${code}`);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  const filteredVouchers = initialVouchers.filter((v) => {
    // Lọc theo trạng thái
    if (statusFilter !== "all" && v.status !== statusFilter) {
      return false;
    }

    // Lọc theo từ khóa tìm kiếm
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchCode = v.code.toLowerCase().includes(q);
      const matchTitle = v.title.toLowerCase().includes(q);
      const matchGuest = v.target_guest_name
        ? v.target_guest_name.toLowerCase().includes(q)
        : false;
      if (!matchCode && !matchTitle && !matchGuest) return false;
    }

    return true;
  });

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-card border border-border/80 rounded-2xl shadow-2xs">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/15">
            <Tag className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Quản lý Voucher & Mã giảm giá ({filteredVouchers.length})
            </h3>
            <p className="text-xs text-muted-foreground">
              Phát hành ưu đãi, kiểm soát ngân sách chiết khấu và theo dõi lượt
              đổi
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo mã hoặc tên..."
              className="h-8.5 pl-8 pr-3 text-xs rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition"
            />
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSelectedVoucherForRedeem(undefined);
              setRedeemDialogOpen(true);
            }}
            className="h-8.5 rounded-xl border-border text-foreground hover:bg-muted gap-1.5 text-xs font-medium"
          >
            <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Áp dụng Voucher
          </Button>

          <Button
            size="sm"
            onClick={() => setCreateDialogOpen(true)}
            className="h-8.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 text-xs font-medium shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Tạo Voucher mới
          </Button>
        </div>
      </div>

      {/* Bảng danh sách voucher */}
      <div className="bg-card border border-border/80 rounded-2xl shadow-2xs overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="border-border/60 hover:bg-transparent">
              <TableHead className="text-xs text-muted-foreground font-semibold">
                Mã Voucher
              </TableHead>
              <TableHead className="text-xs text-muted-foreground font-semibold">
                Chương trình / Tiêu đề
              </TableHead>
              <TableHead className="text-xs text-muted-foreground font-semibold">
                Mức giảm
              </TableHead>
              <TableHead className="text-xs text-muted-foreground font-semibold">
                Hạn mức & Đơn tối thiểu
              </TableHead>
              <TableHead className="text-xs text-muted-foreground font-semibold">
                Thời hạn hiệu lực
              </TableHead>
              <TableHead className="text-xs text-muted-foreground font-semibold">
                Lượt dùng
              </TableHead>
              <TableHead className="text-xs text-muted-foreground font-semibold">
                Phạm vi áp dụng
              </TableHead>
              <TableHead className="text-xs text-muted-foreground font-semibold text-right">
                Thao tác
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVouchers.length === 0 ? (
              <TableRow className="border-border/60">
                <TableCell
                  colSpan={8}
                  className="text-center py-12 text-muted-foreground text-xs"
                >
                  Không tìm thấy voucher nào phù hợp
                </TableCell>
              </TableRow>
            ) : (
              filteredVouchers.map((v) => {
                const isExpired = new Date(v.valid_to) < new Date();
                const isOutOfLimit = v.used_count >= v.usage_limit;

                return (
                  <TableRow
                    key={v.id}
                    className="border-border/60 hover:bg-muted/30 transition-colors"
                  >
                    {/* Mã Voucher */}
                    <TableCell className="font-mono text-xs font-semibold">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                          {v.code}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyCode(v.code)}
                          title="Sao chép mã"
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {copiedCode === v.code ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </TableCell>

                    {/* Tên chương trình */}
                    <TableCell>
                      <div className="text-xs font-medium text-foreground">
                        {v.title}
                      </div>
                      {v.note && (
                        <div className="text-[11px] text-muted-foreground line-clamp-1">
                          {v.note}
                        </div>
                      )}
                    </TableCell>

                    {/* Mức giảm */}
                    <TableCell className="text-xs font-semibold">
                      {v.discount_type === "percent" ? (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          Giảm {v.discount_value}%
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          -
                          {new Intl.NumberFormat("vi-VN").format(
                            v.discount_value,
                          )}{" "}
                          đ
                        </span>
                      )}
                    </TableCell>

                    {/* Hạn mức & Tối thiểu */}
                    <TableCell className="text-xs text-foreground">
                      <div>
                        Đơn tối thiểu:{" "}
                        <strong className="text-foreground">
                          {v.min_spend_amount > 0
                            ? `${new Intl.NumberFormat("vi-VN").format(v.min_spend_amount)} đ`
                            : "0 đ"}
                        </strong>
                      </div>
                      {v.max_discount_amount && (
                        <div className="text-[11px] text-muted-foreground">
                          Tối đa:{" "}
                          {new Intl.NumberFormat("vi-VN").format(
                            v.max_discount_amount,
                          )}{" "}
                          đ
                        </div>
                      )}
                    </TableCell>

                    {/* Hạn hiệu lực */}
                    <TableCell className="text-xs text-foreground">
                      <div className="flex items-center gap-1 text-[11px]">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        <span>
                          {v.valid_from} → {v.valid_to}
                        </span>
                      </div>
                      {isExpired ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] text-rose-600 border-rose-500/30 bg-rose-50 dark:bg-rose-950/20 mt-0.5"
                        >
                          Đã hết hạn
                        </Badge>
                      ) : isOutOfLimit ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] text-amber-600 border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 mt-0.5"
                        >
                          Đã dùng hết
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[10px] text-emerald-600 border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 mt-0.5"
                        >
                          Đang hiệu lực
                        </Badge>
                      )}
                    </TableCell>

                    {/* Lượt dùng */}
                    <TableCell className="text-xs text-foreground">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span>
                          {v.used_count} / {v.usage_limit}
                        </span>
                        {isOutOfLimit && (
                          <span className="text-rose-600 dark:text-rose-400 font-semibold">
                            Đã hết lượt
                          </span>
                        )}
                      </div>
                      <div className="w-20 bg-muted rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            isOutOfLimit ? "bg-rose-500" : "bg-primary"
                          }`}
                          style={{
                            width: `${Math.min(
                              100,
                              (v.used_count / v.usage_limit) * 100,
                            )}%`,
                          }}
                        />
                      </div>
                    </TableCell>

                    {/* Phạm vi áp dụng */}
                    <TableCell className="text-xs text-foreground">
                      <div>
                        {v.target_guest_name ? (
                          <span className="text-primary font-medium">
                            {v.target_guest_name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            Tất cả khách
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {v.applicable_branch_name || "Toàn chuỗi"}
                      </div>
                    </TableCell>

                    {/* Thao tác */}
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={
                          isExpired || isOutOfLimit || v.status !== "active"
                        }
                        onClick={() => {
                          setSelectedVoucherForRedeem({
                            code: v.code,
                            branchId: v.applicable_branch_id || undefined,
                            guestId: v.target_guest_id || undefined,
                          });
                          setRedeemDialogOpen(true);
                        }}
                        className="h-7 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 font-medium"
                      >
                        Đổi mã
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog tạo voucher mới */}
      <CreateVoucherDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        branches={branches}
        guests={guests}
        onSuccess={() => onRefresh?.()}
      />

      {/* Dialog đổi voucher */}
      <RedeemVoucherDialog
        open={redeemDialogOpen}
        onOpenChange={setRedeemDialogOpen}
        branches={branches}
        guests={guests}
        defaultCode={selectedVoucherForRedeem?.code}
        defaultBranchId={selectedVoucherForRedeem?.branchId || defaultBranchId}
        defaultGuestId={selectedVoucherForRedeem?.guestId}
        onSuccess={() => onRefresh?.()}
      />
    </div>
  );
}
