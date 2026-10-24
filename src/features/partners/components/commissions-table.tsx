"use client";

import { Check, CreditCard, Filter, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { decideCommissionAction } from "../actions";
import { commissionStatusLabels } from "../schemas";
import type { CommissionStatus, PartnerCommission } from "../types";

interface CommissionsTableProps {
  commissions: PartnerCommission[];
  canManageCommission: boolean;
  onRefresh?: () => void;
}

export function CommissionsTable({
  commissions,
  canManageCommission,
  onRefresh,
}: CommissionsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const filtered = commissions.filter((c) => {
    const matchesSearch =
      c.partner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.group_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.branch_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || c.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleDecision = async (
    id: string,
    action: "approve" | "pay" | "cancel",
  ) => {
    const actionName =
      action === "approve"
        ? "phê duyệt"
        : action === "pay"
          ? "xác nhận chi trả"
          : "hủy bỏ";

    if (!confirm(`Bạn có chắc chắn muốn ${actionName} khoản hoa hồng này?`)) {
      return;
    }

    try {
      setProcessingId(id);
      const res = await decideCommissionAction({ id, action });
      if (res.ok) {
        toast.success(`Đã ${actionName} hoa hồng thành công`);
        onRefresh?.();
      } else {
        toast.error(res.error.message || `Không thể ${actionName} hoa hồng`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi xử lý server";
      toast.error(msg);
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: CommissionStatus) => {
    switch (status) {
      case "pending":
        return (
          <Badge
            variant="outline"
            className="border-amber-500 text-amber-600 bg-amber-50/50 dark:bg-amber-950/20"
          >
            {commissionStatusLabels.pending}
          </Badge>
        );
      case "approved":
        return (
          <Badge
            variant="outline"
            className="border-blue-500 text-blue-600 bg-blue-50/50 dark:bg-blue-950/20"
          >
            {commissionStatusLabels.approved}
          </Badge>
        );
      case "paid":
        return (
          <Badge
            variant="outline"
            className="border-emerald-500 text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20"
          >
            {commissionStatusLabels.paid}
          </Badge>
        );
      case "cancelled":
        return (
          <Badge
            variant="outline"
            className="border-destructive text-destructive bg-destructive/10"
          >
            {commissionStatusLabels.cancelled}
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Input
            placeholder="Tìm theo đối tác, mã đoàn, cơ sở..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="pending">Chờ phê duyệt</option>
            <option value="approved">Đã duyệt (Chờ chi)</option>
            <option value="paid">Đã thanh toán</option>
            <option value="cancelled">Đã hủy</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Đối tác lữ hành</TableHead>
              <TableHead>Cơ sở</TableHead>
              <TableHead>Căn cứ / Mã đoàn</TableHead>
              <TableHead className="text-right">Doanh thu phòng</TableHead>
              <TableHead className="text-right">Tỷ lệ</TableHead>
              <TableHead className="text-right">Số tiền hoa hồng</TableHead>
              <TableHead>Trạng thái</TableHead>
              {canManageCommission && (
                <TableHead className="text-right">Hành động</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canManageCommission ? 8 : 7}
                  className="h-28 text-center text-muted-foreground"
                >
                  Không tìm thấy khoản kê hoa hồng nào.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {item.partner_name || "Đối tác ngoài"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.branch_name || "Tất cả cơ sở"}
                  </TableCell>
                  <TableCell>
                    {item.group_code ? (
                      <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                        {item.group_code}
                      </span>
                    ) : item.stay_id ? (
                      <span className="text-xs text-muted-foreground">
                        Lượt ở lẻ
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Thỏa thuận ngoài
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {item.base_revenue.toLocaleString("vi-VN")} đ
                  </TableCell>
                  <TableCell className="text-right text-xs">
                    {item.rate_pct !== null ? `${item.rate_pct}%` : "--"}
                  </TableCell>
                  <TableCell className="text-right font-semibold font-mono text-emerald-600 dark:text-emerald-400">
                    {item.amount.toLocaleString("vi-VN")} đ
                  </TableCell>
                  <TableCell>{getStatusBadge(item.status)}</TableCell>
                  {canManageCommission && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {item.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2 text-xs border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                              disabled={processingId === item.id}
                              onClick={() => handleDecision(item.id, "approve")}
                            >
                              <Check className="h-3.5 w-3.5 mr-1" />
                              Duyệt
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10"
                              disabled={processingId === item.id}
                              onClick={() => handleDecision(item.id, "cancel")}
                            >
                              <X className="h-3.5 w-3.5 mr-1" />
                              Hủy
                            </Button>
                          </>
                        )}
                        {item.status === "approved" && (
                          <Button
                            size="sm"
                            variant="default"
                            className="h-8 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                            disabled={processingId === item.id}
                            onClick={() => handleDecision(item.id, "pay")}
                          >
                            <CreditCard className="h-3.5 w-3.5 mr-1" />
                            Chi trả
                          </Button>
                        )}
                        {item.status === "paid" && (
                          <span className="text-xs text-muted-foreground">
                            Đã tất toán
                          </span>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
