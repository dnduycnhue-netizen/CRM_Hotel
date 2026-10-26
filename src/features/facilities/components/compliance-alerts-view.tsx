"use client";

import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { useState } from "react";
import { formatDateVN } from "@/shared/utils/date";
import type { ComplianceAlertItem } from "../data/alerts";

interface Props {
  alerts: ComplianceAlertItem[];
  branches: Array<{ id: string; name: string }>;
}

export function ComplianceAlertsView({ alerts, branches }: Props) {
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filtered = alerts.filter((a) => {
    if (selectedBranch !== "all" && a.branch_id !== selectedBranch)
      return false;
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    return true;
  });

  const expiredCount = alerts.filter((a) => a.status === "expired").length;
  const urgentCount = alerts.filter((a) => a.status === "urgent").length;
  const warningCount = alerts.filter((a) => a.status === "warning").length;

  return (
    <div className="space-y-6">
      {/* Top metrics summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Đã hết hạn
            </p>
            <p className="text-2xl font-bold text-rose-700 dark:text-rose-400 mt-1">
              {expiredCount}
            </p>
          </div>
          <span className="p-3 rounded-xl bg-rose-500/10 text-rose-700 dark:text-rose-400">
            <ShieldAlert className="w-5 h-5" />
          </span>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Khẩn cấp (&le; 15 ngày)
            </p>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1">
              {urgentCount}
            </p>
          </div>
          <span className="p-3 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </span>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Sắp hết hạn (&le; 30 ngày)
            </p>
            <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400 mt-1">
              {warningCount}
            </p>
          </div>
          <span className="p-3 rounded-xl bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">
            <Clock className="w-5 h-5" />
          </span>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap items-center gap-3">
        {branches.length === 1 ? (
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Cơ sở:
            </label>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/80 border border-border/60 text-xs font-medium text-foreground">
              <Building2 className="w-3.5 h-3.5 text-indigo-700 dark:text-indigo-400" />
              <span>{branches[0]?.name}</span>
            </div>
          </div>
        ) : (
          <div className="w-52">
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Cơ sở:
            </label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full bg-muted/40 border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">Tất cả cơ sở</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="w-48">
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            Mức độ cảnh báo:
          </label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full bg-muted/40 border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">Tất cả mức độ</option>
            <option value="expired">Đã hết hạn</option>
            <option value="urgent">Khẩn cấp (&le; 15 ngày)</option>
            <option value="warning">Cảnh báo (&le; 30 ngày)</option>
            <option value="good">Còn hạn an toàn</option>
          </select>
        </div>

        <div className="ml-auto text-xs text-muted-foreground pt-5">
          Hiển thị <strong>{filtered.length}</strong> hồ sơ tuân thủ
        </div>
      </div>

      {/* Alerts Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
                <th className="py-3 px-4">Loại hồ sơ & Giấy tờ</th>
                <th className="py-3 px-4">Cơ sở áp dụng</th>
                <th className="py-3 px-4">Đơn vị cấp / Ghi chú</th>
                <th className="py-3 px-4">Ngày hết hạn</th>
                <th className="py-3 px-4">Thời gian còn lại</th>
                <th className="py-3 px-4">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-muted-foreground text-xs"
                  >
                    <CheckCircle2 className="w-8 h-8 text-emerald-700 dark:text-emerald-400 mx-auto mb-2" />
                    Tất cả hồ sơ pháp lý, bảo hiểm PCCC và kiểm định thiết bị
                    đang trong hạn an toàn!
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <span className="font-semibold text-foreground block">
                          {item.doc_type_name}
                        </span>
                        <div className="text-xs text-muted-foreground mt-0.5 space-x-2">
                          {item.doc_number && (
                            <span>Số: {item.doc_number}</span>
                          )}
                          {item.asset_name && (
                            <span>• Thiết bị: {item.asset_name}</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-xs text-foreground/80">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                          {item.branch_name}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        <div>{item.issuer || "-"}</div>
                        {item.note && (
                          <div className="text-muted-foreground italic mt-0.5">
                            {item.note}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-xs font-semibold text-foreground whitespace-nowrap">
                        {formatDateVN(item.expires_on)}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {item.days_remaining < 0 ? (
                          <span className="text-xs font-bold text-rose-700 dark:text-rose-400">
                            Quá hạn {Math.abs(item.days_remaining)} ngày
                          </span>
                        ) : (
                          <span
                            className={`text-xs font-bold ${
                              item.days_remaining <= 15
                                ? "text-amber-700 dark:text-amber-400"
                                : item.days_remaining <= 30
                                  ? "text-yellow-700 dark:text-yellow-400"
                                  : "text-emerald-700 dark:text-emerald-400"
                            }`}
                          >
                            Còn {item.days_remaining} ngày
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {item.status === "expired" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                            <ShieldAlert className="w-3.5 h-3.5" /> Hết hạn
                          </span>
                        )}
                        {item.status === "urgent" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                            <AlertTriangle className="w-3.5 h-3.5" /> Khẩn cấp
                          </span>
                        )}
                        {item.status === "warning" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-500/20">
                            <Clock className="w-3.5 h-3.5" /> Sắp hết hạn
                          </span>
                        )}
                        {item.status === "good" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3.5 h-3.5" /> An toàn
                          </span>
                        )}
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
