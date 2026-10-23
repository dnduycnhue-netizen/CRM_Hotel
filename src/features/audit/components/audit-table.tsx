"use client";

import {
  Building2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Edit2,
  Eye,
  FileSpreadsheet,
  Plus,
  Trash2,
} from "lucide-react";
import React, { useState } from "react";
import { formatDateTimeVN } from "@/shared/utils/date";
import type { AuditLogItem } from "../types";
import { AuditDiffViewer } from "./audit-diff-viewer";

interface Props {
  initialLogs: AuditLogItem[];
  branches: Array<{ id: string; name: string }>;
}

export function AuditTable({ initialLogs, branches }: Props) {
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [selectedEntity, setSelectedEntity] = useState<string>("all");
  const [selectedAction, setSelectedAction] = useState<string>("all");
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);

  const filteredLogs = initialLogs.filter((log) => {
    if (selectedBranch !== "all" && log.branch_id !== selectedBranch)
      return false;
    if (selectedEntity !== "all" && log.entity !== selectedEntity) return false;
    if (selectedAction !== "all") {
      if (selectedAction === "crud_insert" && log.action !== "insert")
        return false;
      if (selectedAction === "crud_update" && log.action !== "update")
        return false;
      if (selectedAction === "crud_delete" && log.action !== "delete")
        return false;
      if (
        selectedAction === "security_view" &&
        !log.action.includes("view_full")
      )
        return false;
      if (
        selectedAction === "security_export" &&
        !log.action.includes("export")
      )
        return false;
    }
    return true;
  });

  const toggleExpand = (id: number) => {
    setExpandedRowId((prev) => (prev === id ? null : id));
  };

  const getActionBadge = (action: string) => {
    const act = action.toLowerCase();
    if (act === "insert") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <Plus className="w-3 h-3" /> Thêm mới
        </span>
      );
    }
    if (act === "update") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <Edit2 className="w-3 h-3" /> Chỉnh sửa
        </span>
      );
    }
    if (act === "delete") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <Trash2 className="w-3 h-3" /> Xóa
        </span>
      );
    }
    if (act.includes("view_full")) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          <Eye className="w-3 h-3" /> Xem CCCD đầy đủ
        </span>
      );
    }
    if (act.includes("export")) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
          <FileSpreadsheet className="w-3 h-3" /> Xuất Excel
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-300">
        {action}
      </span>
    );
  };

  const getEntityLabel = (entity: string) => {
    const map: Record<string, string> = {
      guests: "Khách hàng",
      stays: "Lượt ở",
      guest_notes: "Ghi chú khách",
      guest_flags: "Cờ cảnh báo",
      merge_requests: "Hợp nhất hồ sơ",
      work_orders: "Phiếu sự cố",
      room_blocks: "Khóa phòng",
      branches: "Cơ sở",
      rooms: "Phòng",
      profiles: "Tài khoản người dùng",
      role_permissions: "Phân quyền",
    };
    return map[entity] || entity;
  };

  return (
    <div className="space-y-4">
      {/* Filters bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center gap-3">
        {/* Branch Filter */}
        <div className="w-48">
          <label className="text-xs font-medium text-slate-400 block mb-1">
            Cơ sở:
          </label>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {branches.length > 1 && (
              <option value="all">Tất cả {branches.length} cơ sở</option>
            )}
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Entity Filter */}
        <div className="w-48">
          <label className="text-xs font-medium text-slate-400 block mb-1">
            Đối tượng:
          </label>
          <select
            value={selectedEntity}
            onChange={(e) => setSelectedEntity(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">Tất cả đối tượng</option>
            <option value="guests">Khách hàng</option>
            <option value="stays">Lượt ở</option>
            <option value="guest_flags">Cờ Blacklist / Chú ý</option>
            <option value="merge_requests">Hợp nhất hồ sơ</option>
            <option value="work_orders">Sự cố CSVC</option>
            <option value="room_blocks">Khóa phòng OOO</option>
            <option value="profiles">Tài khoản & Phân quyền</option>
          </select>
        </div>

        {/* Action Filter */}
        <div className="w-48">
          <label className="text-xs font-medium text-slate-400 block mb-1">
            Loại hành động:
          </label>
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">Tất cả hành động</option>
            <option value="crud_insert">Thêm mới (Insert)</option>
            <option value="crud_update">Chỉnh sửa (Update)</option>
            <option value="crud_delete">Xóa (Delete)</option>
            <option value="security_view">Xem CCCD đầy đủ</option>
            <option value="security_export">Xuất file Excel</option>
          </select>
        </div>

        <div className="ml-auto text-xs text-slate-400 pt-5">
          Hiển thị <strong>{filteredLogs.length}</strong> nhật ký
        </div>
      </div>

      {/* Logs Table */}
      {filteredLogs.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center text-slate-400">
          <ClipboardList className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-base font-medium text-slate-300">
            Không tìm thấy nhật ký thao tác phù hợp
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Hãy thử thay đổi điều kiện lọc ở trên.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-xs uppercase text-slate-400">
                  <th className="py-3 px-4 w-10"></th>
                  <th className="py-3 px-4">Thời gian</th>
                  <th className="py-3 px-4">Người thao tác</th>
                  <th className="py-3 px-4">Cơ sở</th>
                  <th className="py-3 px-4">Hành động</th>
                  <th className="py-3 px-4">Đối tượng</th>
                  <th className="py-3 px-4">ID Bản ghi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredLogs.map((log) => {
                  const isExpanded = expandedRowId === log.id;
                  const hasDetails = log.before || log.after || log.meta;

                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        onClick={() => hasDetails && toggleExpand(log.id)}
                        className={`transition-colors cursor-pointer ${
                          isExpanded
                            ? "bg-slate-800/60"
                            : "hover:bg-slate-800/30"
                        }`}
                      >
                        <td className="py-3 px-4 text-center">
                          {hasDetails ? (
                            isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-indigo-400 inline" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-500 inline" />
                            )
                          ) : null}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-300 whitespace-nowrap font-mono">
                          {formatDateTimeVN(log.occurred_at, "full")}
                        </td>
                        <td className="py-3 px-4 text-xs font-medium text-slate-200">
                          {log.actor_name ||
                            (log.actor_id
                              ? `${log.actor_id.substring(0, 8)}...`
                              : "Hệ thống (Cron)")}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-400">
                          {log.branch_name ? (
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-slate-500" />
                              {log.branch_name}
                            </span>
                          ) : (
                            "Toàn chuỗi"
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {getActionBadge(log.action)}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-300 font-medium">
                          {getEntityLabel(log.entity)}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500 font-mono">
                          {log.entity_id
                            ? `${log.entity_id.substring(0, 8)}...`
                            : "-"}
                        </td>
                      </tr>

                      {/* Expanded Diff Viewer */}
                      {isExpanded && (
                        <tr className="bg-slate-950/40">
                          <td
                            colSpan={7}
                            className="p-4 border-b border-slate-800/80"
                          >
                            <AuditDiffViewer
                              action={log.action}
                              before={log.before}
                              after={log.after}
                              meta={log.meta}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
