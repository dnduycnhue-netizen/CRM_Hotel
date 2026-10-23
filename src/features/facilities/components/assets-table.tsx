"use client";

import {
  AlertTriangle,
  Boxes,
  Building2,
  DoorOpen,
  QrCode,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/shared/ui";
import { formatDateVN } from "@/shared/utils/date";
import { updateAssetStatusAction } from "../actions";
import type { Asset, AssetStatus } from "../types";

interface AssetsTableProps {
  initialAssets: Asset[];
  branches: Array<{ id: string; name: string; code: string }>;
  currentBranchId: string | null;
}

export function AssetsTable({
  initialAssets,
  branches,
  currentBranchId,
}: AssetsTableProps) {
  const [selectedBranch, setSelectedBranch] = useState<string>(
    branches.length === 1 ? branches[0].id : currentBranchId || "all",
  );
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isPending, startTransition] = useTransition();
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [targetStatus, setTargetStatus] = useState<AssetStatus>("in_use");
  const [statusNote, setStatusNote] = useState("");

  const handleOpenStatusModal = (asset: Asset) => {
    setEditingAsset(asset);
    setTargetStatus(asset.status);
    setStatusNote(asset.note || "");
  };

  const handleUpdateStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAsset) return;

    startTransition(async () => {
      const res = await updateAssetStatusAction({
        id: editingAsset.id,
        branch_id: editingAsset.branch_id,
        status: targetStatus,
        note: statusNote.trim() || undefined,
        disposed_reason:
          targetStatus === "disposed"
            ? statusNote.trim() || "Thanh lý"
            : undefined,
      });

      if (res.ok) {
        toast.success(`Đã cập nhật trạng thái thiết bị ${editingAsset.code}`);
        setEditingAsset(null);
      } else {
        toast.error(
          res.error.message || "Không thể cập nhật trạng thái thiết bị",
        );
      }
    });
  };

  const filtered = initialAssets.filter((a) => {
    if (selectedBranch !== "all" && a.branch_id !== selectedBranch)
      return false;
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchCode = a.code.toLowerCase().includes(q);
      const matchName = a.name.toLowerCase().includes(q);
      const matchRoom = a.room_number ? a.room_number.includes(q) : false;
      if (!matchCode && !matchName && !matchRoom) return false;
    }
    return true;
  });

  const getStatusBadge = (s: AssetStatus) => {
    switch (s) {
      case "in_use":
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Đang hoạt động
          </span>
        );
      case "broken":
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            Bị hỏng
          </span>
        );
      case "under_repair":
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Đang sửa chữa
          </span>
        );
      case "in_storage":
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
            Trong kho
          </span>
        );
      case "disposed":
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500">
            Đã thanh lý
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
            {s}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Boxes className="w-6 h-6 text-indigo-600" />
            Danh mục tài sản & Trang thiết bị
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Quản lý mã tem QR, vị trí lắp đặt, hạn bảo hành và tình trạng hoạt
            động tại 8 khách sạn
          </p>
        </div>

        <Link href="/facilities/report">
          <Button className="rounded-xl font-medium bg-indigo-600 hover:bg-indigo-700 text-white">
            <AlertTriangle className="w-4 h-4 mr-1.5" />
            Báo hỏng thiết bị
          </Button>
        </Link>
      </div>

      {/* Filter toolbar */}
      <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex-1 max-w-xs">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo mã QR, tên thiết bị, số phòng..."
            className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 outline-none"
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Cơ sở:</span>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="text-xs py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent font-medium text-slate-800 dark:text-slate-200 outline-none"
            >
              {branches.length > 1 && (
                <option value="all">Toàn bộ {branches.length} cơ sở</option>
              )}
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Tình trạng:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent font-medium text-slate-800 dark:text-slate-200 outline-none"
            >
              <option value="all">Tất cả tình trạng</option>
              <option value="in_use">Đang hoạt động</option>
              <option value="broken">Bị hỏng</option>
              <option value="under_repair">Đang sửa chữa</option>
              <option value="in_storage">Trong kho</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/70 dark:bg-slate-800/40 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Mã tem QR / Thiết bị</th>
                <th className="py-3.5 px-4">Nhóm phân loại</th>
                <th className="py-3.5 px-4">Vị trí lắp đặt</th>
                <th className="py-3.5 px-4">Hạn bảo hành</th>
                <th className="py-3.5 px-4">Tình trạng</th>
                <th className="py-3.5 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-12 text-center text-slate-400 text-xs"
                  >
                    Không tìm thấy trang thiết bị nào phù hợp bộ lọc.
                  </td>
                </tr>
              ) : (
                filtered.map((a) => (
                  <tr
                    key={a.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                          <QrCode className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {a.name}
                          </div>
                          <div className="font-mono text-[11px] text-slate-400">
                            {a.code}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-400">
                      {a.category_name || "Khác"}
                    </td>

                    <td className="py-3.5 px-4 text-xs">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {a.branch_name}
                      </div>
                      {a.room_number ? (
                        <div className="flex items-center gap-1 text-slate-500 mt-0.5">
                          <DoorOpen className="w-3.5 h-3.5 text-slate-400" />
                          Phòng {a.room_number}
                        </div>
                      ) : a.location_name ? (
                        <div className="flex items-center gap-1 text-slate-500 mt-0.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          {a.location_name}
                        </div>
                      ) : (
                        <span className="text-slate-400">Kho cơ sở</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      {a.warranty_until ? (
                        <span>{formatDateVN(a.warranty_until)}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">{getStatusBadge(a.status)}</td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenStatusModal(a)}
                          className="h-8 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900"
                        >
                          <RefreshCw className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          Đổi trạng thái
                        </Button>
                        <Link
                          href={`/facilities/report?asset=${a.id}&branch=${a.branch_id}`}
                        >
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-xs font-semibold rounded-lg text-indigo-600 hover:text-indigo-700"
                          >
                            Báo sự cố
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Status Modal */}
      {editingAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-indigo-600" />
                  Cập nhật trạng thái thiết bị
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {editingAsset.name} ({editingAsset.code})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingAsset(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Trạng thái vận hành:
                </label>
                <select
                  value={targetStatus}
                  onChange={(e) =>
                    setTargetStatus(e.target.value as AssetStatus)
                  }
                  className="w-full text-xs py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 outline-none"
                >
                  <option value="in_use">Đang hoạt động</option>
                  <option value="under_repair">Đang sửa chữa / bảo hành</option>
                  <option value="broken">Bị hỏng (chờ kỹ thuật)</option>
                  <option value="in_storage">Trong kho lưu trữ</option>
                  <option value="disposed">Đã thanh lý</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Ghi chú / Lý do:
                </label>
                <textarea
                  rows={3}
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="Nhập chi tiết tình trạng hoặc lý do thanh lý..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingAsset(null)}
                  className="rounded-xl"
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                >
                  {isPending ? "Đang lưu..." : "Lưu trạng thái"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
