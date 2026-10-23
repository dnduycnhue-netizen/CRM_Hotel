"use client";

import {
  AlertTriangle,
  Building2,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserX,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type React from "react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@/shared/ui";
import { removeFlagAction } from "../actions";
import type { PendingFlagItem } from "../types";

interface Props {
  flags: PendingFlagItem[];
}

export function ActiveFlagsTable({ flags }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedFlag, setSelectedFlag] = useState<PendingFlagItem | null>(
    null,
  );
  const [removeReason, setRemoveReason] = useState("");

  const handleOpenRemove = (flag: PendingFlagItem) => {
    setSelectedFlag(flag);
    setRemoveReason("");
  };

  const handleConfirmRemove = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFlag) return;
    if (!removeReason.trim() || removeReason.trim().length < 5) {
      toast.error("Vui lòng nhập lý do gỡ cờ tối thiểu 5 ký tự");
      return;
    }

    startTransition(async () => {
      const res = await removeFlagAction({
        id: selectedFlag.id,
        reason: removeReason.trim(),
      });

      if (res.ok) {
        toast.success(`Đã gỡ cờ cho khách ${selectedFlag.guest_name}`);
        setSelectedFlag(null);
        setRemoveReason("");
        router.refresh();
      } else {
        toast.error(res.error.message || "Thao tác gỡ cờ thất bại");
      }
    });
  };

  if (flags.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center text-slate-400">
        <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
        <p className="text-base font-medium text-slate-300">
          Không có cờ Blacklist nào đang hiệu lực
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Danh sách khách bị hạn chế hoặc cấm lưu trú sẽ hiển thị tại đây.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/50 text-xs uppercase text-slate-400">
                <th className="py-3 px-4">Khách hàng</th>
                <th className="py-3 px-4">Loại cờ</th>
                <th className="py-3 px-4">Cơ sở áp dụng</th>
                <th className="py-3 px-4">Lý do ghi nhận</th>
                <th className="py-3 px-4">Ngày áp dụng</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {flags.map((flag) => {
                const isBlacklist = flag.flag_type === "blacklist";
                return (
                  <tr
                    key={flag.id}
                    className="hover:bg-slate-800/30 transition-colors"
                  >
                    {/* Guest info */}
                    <td className="py-3 px-4">
                      <Link
                        href={`/guests/${flag.guest_id}`}
                        className="font-medium text-slate-200 hover:text-indigo-400 transition-colors"
                      >
                        {flag.guest_name}
                      </Link>
                      <div className="text-xs text-slate-400 mt-0.5 space-x-2">
                        {flag.guest_phone && <span>{flag.guest_phone}</span>}
                        {flag.guest_doc_masked && (
                          <span>• CCCD: {flag.guest_doc_masked}</span>
                        )}
                      </div>
                    </td>

                    {/* Flag Type */}
                    <td className="py-3 px-4">
                      {isBlacklist ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/25">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          Blacklist Toàn Chuỗi
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/25">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Chú ý cơ sở
                        </span>
                      )}
                    </td>

                    {/* Branch */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Building2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>{flag.branch_name || "Toàn chuỗi"}</span>
                      </div>
                    </td>

                    {/* Reason */}
                    <td className="py-3 px-4 max-w-xs">
                      <p className="text-xs text-slate-300 line-clamp-2">
                        {flag.reason}
                      </p>
                    </td>

                    {/* Time */}
                    <td className="py-3 px-4 text-xs text-slate-400">
                      {new Date(flag.proposed_at).toLocaleDateString("vi-VN")}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenRemove(flag)}
                        className="h-8 text-xs text-rose-400 border-rose-500/30 hover:bg-rose-500/10 hover:border-rose-500/50 gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Gỡ cờ</span>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Remove Flag Confirmation Dialog */}
      <Dialog
        open={!!selectedFlag}
        onOpenChange={(open) => !open && setSelectedFlag(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-400">
              <UserX className="h-5 w-5" />
              <span>Gỡ cờ cảnh báo / Blacklist</span>
            </DialogTitle>
            <DialogDescription>
              Khách hàng:{" "}
              <span className="font-bold text-foreground">
                {selectedFlag?.guest_name}
              </span>
              . Thao tác này sẽ phục hồi trạng thái bình thường của hồ sơ khách
              hàng.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmRemove} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="removeReason" className="text-xs font-semibold">
                Lý do gỡ cờ (Bắt buộc theo chuẩn kiểm toán) *
              </Label>
              <Input
                id="removeReason"
                value={removeReason}
                onChange={(e) => setRemoveReason(e.target.value)}
                placeholder="VD: Khách đã thanh toán đủ bồi thường hư hại..."
                className="h-9 text-xs"
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedFlag(null)}
                disabled={isPending}
                className="h-9 text-xs"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="h-9 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white gap-1.5"
              >
                {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Xác nhận gỡ cờ</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
