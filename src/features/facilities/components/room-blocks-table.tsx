"use client";

import { Loader2, Lock, Plus, Unlock, User } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/shared/ui";
import { formatDateVN } from "@/shared/utils/date";
import { releaseRoomBlockAction, setRoomBlockAction } from "../actions";
import type { RoomBlockItem } from "../types";

interface RoomBlocksTableProps {
  initialBlocks: RoomBlockItem[];
  branches: Array<{ id: string; name: string; code: string }>;
  rooms: Array<{ id: string; number: string; type: string; branch_id: string }>;
  currentBranchId: string | null;
}

export function RoomBlocksTable({
  initialBlocks,
  branches,
  rooms,
  currentBranchId,
}: RoomBlocksTableProps) {
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form modal state
  const [showModal, setShowModal] = useState(false);
  const [modalBranch, setModalBranch] = useState(
    currentBranchId || branches[0]?.id || "",
  );
  const [modalRoom, setModalRoom] = useState("");
  const [modalReason, setModalReason] = useState("");
  const [modalEndsAt, setModalEndsAt] = useState("");

  const [confirmReleaseBlock, setConfirmReleaseBlock] =
    useState<RoomBlockItem | null>(null);

  const filteredBlocks = initialBlocks.filter((b) => {
    if (selectedBranch !== "all" && b.branch_id !== selectedBranch)
      return false;
    return true;
  });

  const modalRooms = rooms.filter((r) => r.branch_id === modalBranch);

  const handleCreateBlock = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!modalRoom) {
      setErrorMsg("Vui lòng chọn phòng cần khóa");
      return;
    }

    startTransition(async () => {
      const res = await setRoomBlockAction({
        room_id: modalRoom,
        reason: modalReason.trim(),
        ends_at: modalEndsAt ? new Date(modalEndsAt).toISOString() : null,
      });

      if (res.ok) {
        toast.success("Đã khóa phòng ngừng bán thành công");
        setShowModal(false);
        setModalReason("");
        setModalEndsAt("");
      } else {
        setErrorMsg(res.error.message);
        toast.error(res.error.message || "Không thể khóa phòng");
      }
    });
  };

  const handleReleaseBlockClick = (block: RoomBlockItem) => {
    if (block.work_order_id) {
      toast.error(
        `Phòng này được khóa bởi Phiếu sự cố #${block.work_order_number}. Vui lòng nghiệm thu và đóng phiếu tại trang Phiếu sự cố.`,
      );
      return;
    }
    setConfirmReleaseBlock(block);
  };

  const handleExecuteRelease = (block: RoomBlockItem) => {
    startTransition(async () => {
      const res = await releaseRoomBlockAction(block.id);
      if (res.ok) {
        toast.success(`Đã mở bán lại phòng ${block.room_number}`);
        setConfirmReleaseBlock(null);
      } else {
        toast.error(res.error.message || "Không thể mở bán lại phòng");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Lock className="w-6 h-6 text-amber-500" />
            Khóa phòng ngừng bán (Out of Order / OOO)
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Quản lý các phòng tạm ngừng kinh doanh do cải tạo, giữ chỗ đoàn hoặc
            đang xử lý kỹ thuật
          </p>
        </div>

        <Button
          onClick={() => setShowModal(true)}
          className="rounded-xl font-medium bg-amber-600 hover:bg-amber-700 text-white"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Khóa phòng thủ công
        </Button>
      </div>

      {/* Filter toolbar */}
      <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">Lọc theo cơ sở:</span>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="text-xs py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 font-medium text-slate-800 dark:text-slate-200 outline-none"
          >
            {branches.length > 1 && (
              <option value="all">
                Tất cả {branches.length} cơ sở ({initialBlocks.length} phòng
                đang khóa)
              </option>
            )}
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-400">
          Tổng số:{" "}
          <strong className="text-amber-600">{filteredBlocks.length}</strong>{" "}
          phòng
        </div>
      </div>

      {/* List */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/70 dark:bg-slate-800/40 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Cơ sở & Phòng</th>
                <th className="py-3.5 px-4">Lý do khóa ngừng bán</th>
                <th className="py-3.5 px-4">Thời gian khóa</th>
                <th className="py-3.5 px-4">Nguồn khóa</th>
                <th className="py-3.5 px-4">Người thực hiện</th>
                <th className="py-3.5 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredBlocks.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-12 text-center text-slate-400 text-xs"
                  >
                    Hiện không có phòng nào bị khóa ngừng bán.
                  </td>
                </tr>
              ) : (
                filteredBlocks.map((block) => (
                  <tr
                    key={block.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold text-xs">
                          {block.room_number}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100">
                            Phòng {block.room_number}
                          </div>
                          <div className="text-xs text-slate-400">
                            {block.branch_name}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                      {block.reason}
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      <div>Từ: {formatDateVN(block.starts_at)}</div>
                      {block.ends_at && (
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Đến: {formatDateVN(block.ends_at)}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-xs">
                      {block.work_order_id ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Phiếu #{block.work_order_number}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600">
                          Thủ công
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-xs">
                      <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400">
                        <User className="w-3 h-3 text-slate-400" />
                        {block.created_by_name || "Hệ thống"}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReleaseBlockClick(block)}
                        disabled={isPending}
                        className="h-8 text-xs font-semibold rounded-lg text-emerald-600 hover:text-emerald-700"
                      >
                        <Unlock className="w-3.5 h-3.5 mr-1" />
                        Mở bán lại
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Room Block Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-500" />
                Khóa phòng thủ công
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-600 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateBlock} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Cơ sở khách sạn
                </label>
                <select
                  value={modalBranch}
                  onChange={(e) => {
                    setModalBranch(e.target.value);
                    setModalRoom("");
                  }}
                  className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 outline-none"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Chọn phòng khóa <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={modalRoom}
                  onChange={(e) => setModalRoom(e.target.value)}
                  className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 outline-none"
                >
                  <option value="">-- Chọn số phòng --</option>
                  {modalRooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      Phòng {r.number} ({r.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Lý do khóa phòng <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  value={modalReason}
                  onChange={(e) => setModalReason(e.target.value)}
                  placeholder="VD: Cải tạo sơn tường, Giữ phòng cho đoàn đối tác, Bảo dưỡng tổng thể..."
                  rows={2}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs outline-none resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Dự kiến kết thúc khóa (Tùy chọn)
                </label>
                <input
                  type="date"
                  value={modalEndsAt}
                  onChange={(e) => setModalEndsAt(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl text-xs"
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={isPending || !modalRoom || !modalReason.trim()}
                  className="rounded-xl px-5 bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs"
                >
                  {isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 mr-1" />
                  )}
                  Khóa phòng ngay
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Release Block Modal */}
      {confirmReleaseBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shrink-0">
                <Unlock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Mở bán lại phòng {confirmReleaseBlock.room_number}?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {confirmReleaseBlock.branch_name}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Xác nhận gỡ phong tỏa phòng ngừng bán. Phòng sẽ ngay lập tức hiển
              thị sẵn sàng đón khách trên sơ đồ phòng và hệ thống Check-in.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmReleaseBlock(null)}
                className="rounded-xl"
              >
                Hủy bỏ
              </Button>
              <Button
                type="button"
                disabled={isPending}
                onClick={() => handleExecuteRelease(confirmReleaseBlock)}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              >
                {isPending ? "Đang mở..." : "Xác nhận mở bán"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
