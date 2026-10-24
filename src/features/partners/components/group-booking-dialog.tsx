"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveGroupBookingAction } from "../actions";
import {
  groupBookingStatuses,
  groupBookingStatusLabels,
  type SaveGroupBookingInput,
  saveGroupBookingSchema,
} from "../schemas";
import type {
  BranchOption,
  GroupBooking,
  GroupBookingStatus,
  Partner,
} from "../types";

interface GroupBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: BranchOption[];
  partners: Partner[];
  booking?: GroupBooking | null;
  defaultBranchId?: string;
  onSuccess?: () => void;
}

export function GroupBookingDialog({
  open,
  onOpenChange,
  branches,
  partners,
  booking,
  defaultBranchId,
  onSuccess,
}: GroupBookingDialogProps) {
  const isEditing = Boolean(booking?.id);

  const [branchId, setBranchId] = useState(
    booking?.branch_id || defaultBranchId || (branches[0]?.id ?? ""),
  );
  const [partnerId, setPartnerId] = useState(booking?.partner_id || "");
  const [groupName, setGroupName] = useState(booking?.group_name || "");
  const [leaderName, setLeaderName] = useState(booking?.leader_name || "");
  const [leaderPhone, setLeaderPhone] = useState(booking?.leader_phone || "");
  const [leaderEmail, setLeaderEmail] = useState(booking?.leader_email || "");

  // Format ISO strings to datetime-local values (YYYY-MM-DDTHH:mm)
  const defaultCheckIn = booking?.expected_check_in_at
    ? new Date(booking.expected_check_in_at).toISOString().slice(0, 16)
    : new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10) +
      "T14:00";
  const defaultCheckOut = booking?.expected_check_out_at
    ? new Date(booking.expected_check_out_at).toISOString().slice(0, 16)
    : new Date(Date.now() + 4 * 24 * 3600 * 1000).toISOString().slice(0, 10) +
      "T12:00";

  const [checkIn, setCheckIn] = useState(defaultCheckIn);
  const [checkOut, setCheckOut] = useState(defaultCheckOut);
  const [roomsCount, setRoomsCount] = useState(
    booking?.rooms_count !== undefined ? String(booking.rooms_count) : "5",
  );
  const [guestsCount, setGuestsCount] = useState(
    booking?.guests_count !== undefined ? String(booking.guests_count) : "10",
  );
  const [status, setStatus] = useState<GroupBookingStatus>(
    booking?.status || "confirmed",
  );
  const [estimatedAmount, setEstimatedAmount] = useState(
    booking?.estimated_amount !== undefined
      ? String(booking.estimated_amount)
      : "15000000",
  );
  const [depositAmount, setDepositAmount] = useState(
    booking?.deposit_amount !== undefined
      ? String(booking.deposit_amount)
      : "5000000",
  );
  const [billingNote, setBillingNote] = useState(booking?.billing_note || "");
  const [note, setNote] = useState(booking?.note || "");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const payload: SaveGroupBookingInput = {
      id: booking?.id || null,
      branch_id: branchId,
      partner_id: partnerId || null,
      group_name: groupName.trim(),
      leader_name: leaderName.trim(),
      leader_phone: leaderPhone.trim() || null,
      leader_email: leaderEmail.trim() || null,
      expected_check_in_at: new Date(checkIn).toISOString(),
      expected_check_out_at: new Date(checkOut).toISOString(),
      rooms_count: Number(roomsCount) || 1,
      guests_count: Number(guestsCount) || 1,
      status,
      estimated_amount: Number(estimatedAmount) || 0,
      deposit_amount: Number(depositAmount) || 0,
      billing_note: billingNote.trim() || null,
      note: note.trim() || null,
    };

    const validate = saveGroupBookingSchema.safeParse(payload);
    if (!validate.success) {
      const errMap: Record<string, string> = {};
      for (const issue of validate.error.issues) {
        const key = issue.path[0] as string;
        if (!errMap[key]) {
          errMap[key] = issue.message;
        }
      }
      setErrors(errMap);
      toast.error("Vui lòng kiểm tra lại thông tin khách đoàn");
      return;
    }

    try {
      setSubmitting(true);
      const res = await saveGroupBookingAction(payload);
      if (res.ok) {
        toast.success(
          isEditing
            ? `Cập nhật đoàn ${booking?.code || groupName} thành công`
            : `Tạo đoàn ${res.data.code} (${groupName}) thành công!`,
        );
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(res.error.message || "Không thể lưu thông tin đoàn");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi xử lý server";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? `Cập nhật đoàn [${booking?.code}]`
              : "Tạo mới lịch trình khách đoàn (MICE/Tour)"}
          </DialogTitle>
          <DialogDescription>
            Điều phối phòng, số lượng khách, thông tin trưởng đoàn và tạm ứng
            đặt cọc.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="group-branch">
                Cơ sở lưu trú tiếp nhận{" "}
                <span className="text-destructive">*</span>
              </Label>
              <select
                id="group-branch"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
              {errors.branch_id && (
                <p className="text-xs text-destructive">{errors.branch_id}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="group-partner">
                Công ty lữ hành / Đối tác gửi
              </Label>
              <select
                id="group-partner"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                value={partnerId}
                onChange={(e) => setPartnerId(e.target.value)}
              >
                <option value="">-- Khách đoàn tự đặt trực tiếp --</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="group-name">
                Tên đoàn / Mục đích chuyến đi{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="group-name"
                placeholder="VD: Đoàn Hội nghị MICE Ngân hàng VPBank, Tour Đà Nẵng 4N3Đ..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
              {errors.group_name && (
                <p className="text-xs text-destructive">{errors.group_name}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="leader-name">
                Trưởng đoàn / Hướng dẫn viên{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="leader-name"
                placeholder="VD: Nguyễn Thành Nam"
                value={leaderName}
                onChange={(e) => setLeaderName(e.target.value)}
              />
              {errors.leader_name && (
                <p className="text-xs text-destructive">{errors.leader_name}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="leader-phone">Số điện thoại liên lạc</Label>
              <Input
                id="leader-phone"
                placeholder="VD: 0988123456"
                value={leaderPhone}
                onChange={(e) => setLeaderPhone(e.target.value)}
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="leader-email">
                Email gửi xác nhận / Danh sách phòng
              </Label>
              <Input
                id="leader-email"
                type="email"
                placeholder="VD: nam.tourguide@gmail.com"
                value={leaderEmail}
                onChange={(e) => setLeaderEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="checkin-time">
                Dự kiến nhận phòng <span className="text-destructive">*</span>
              </Label>
              <Input
                id="checkin-time"
                type="datetime-local"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="checkout-time">
                Dự kiến trả phòng <span className="text-destructive">*</span>
              </Label>
              <Input
                id="checkout-time"
                type="datetime-local"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
              />
              {errors.expected_check_out_at && (
                <p className="text-xs text-destructive">
                  {errors.expected_check_out_at}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rooms-count">
                Số lượng phòng <span className="text-destructive">*</span>
              </Label>
              <Input
                id="rooms-count"
                type="number"
                min="1"
                value={roomsCount}
                onChange={(e) => setRoomsCount(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="guests-count">
                Số lượng khách (người lớn + trẻ em){" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="guests-count"
                type="number"
                min="1"
                value={guestsCount}
                onChange={(e) => setGuestsCount(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="est-amount">Dự toán doanh thu phòng (VNĐ)</Label>
              <Input
                id="est-amount"
                type="number"
                min="0"
                step="500000"
                value={estimatedAmount}
                onChange={(e) => setEstimatedAmount(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="deposit-amount">
                Tiền đã cọc / Tạm ứng (VNĐ)
              </Label>
              <Input
                id="deposit-amount"
                type="number"
                min="0"
                step="500000"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="group-status">Trạng thái điều phối</Label>
              <select
                id="group-status"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as GroupBookingStatus)
                }
              >
                {groupBookingStatuses.map((st) => (
                  <option key={st} value={st}>
                    {groupBookingStatusLabels[st]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="billing-note">
                Yêu cầu thanh toán & Xuất hóa đơn
              </Label>
              <Input
                id="billing-note"
                placeholder="VD: Xuất VAT cho Công ty CP..., thanh toán tiền mặt qua HDV"
                value={billingNote}
                onChange={(e) => setBillingNote(e.target.value)}
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="group-note">
                Ghi chú đặc biệt (Phòng gần nhau, ăn sáng, set quà...)
              </Label>
              <textarea
                id="group-note"
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Xếp phòng tầng cao, 2 phòng twin cho tài xế và HDV..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? "Đang lưu..."
                : isEditing
                  ? "Cập nhật đoàn"
                  : "Lưu hồ sơ đoàn"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
