"use client";

import {
  AlertTriangle,
  ArrowRight,
  DoorOpen,
  Loader2,
  Wrench,
} from "lucide-react";
import type React from "react";
import { useId, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import type { RoomItem } from "@/features/admin/domain/types";
import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui";
import { changeStayRoomAction } from "../actions";
import {
  MOVE_REASON_LABELS,
  type MoveReasonCategory,
  moveReasonCategories,
} from "../schemas";

interface ChangeRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stay: {
    stayId: string;
    branchId: string;
    guestName: string;
    currentRoomId: string;
    currentRoomNumber: string;
    currentRoomType: string;
  } | null;
  rooms: RoomItem[];
  onSuccess?: () => void;
}

export function ChangeRoomDialog({
  open,
  onOpenChange,
  stay,
  rooms,
  onSuccess,
}: ChangeRoomDialogProps) {
  const [isPending, startTransition] = useTransition();

  const [toRoomId, setToRoomId] = useState("");
  const [reasonCategory, setReasonCategory] =
    useState<MoveReasonCategory>("maintenance");
  const [reasonNote, setReasonNote] = useState("");
  const [createWorkOrder, setCreateWorkOrder] = useState(false);
  const [workOrderPriority, setWorkOrderPriority] = useState<
    "urgent" | "high" | "normal" | "low"
  >("high");

  const toRoomSelectId = useId();
  const reasonCategorySelectId = useId();
  const workOrderPrioritySelectId = useId();

  // Reset form khi mở dialog mới
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setToRoomId("");
      setReasonCategory("maintenance");
      setReasonNote("");
      setCreateWorkOrder(false);
      setWorkOrderPriority("high");
    }
    onOpenChange(nextOpen);
  };

  // Lọc các phòng có thể chuyển đến (thuộc cơ sở, active, khác phòng hiện tại, không có khách ở, không bị khóa)
  const availableRooms = useMemo(() => {
    if (!stay) return [];
    return rooms.filter(
      (r) =>
        r.isActive &&
        !r.isOccupied &&
        !r.isBlocked &&
        r.id !== stay.currentRoomId,
    );
  }, [rooms, stay]);

  // Gom nhóm phòng theo tầng
  const roomsByFloor = useMemo(() => {
    const map = new Map<number, RoomItem[]>();
    availableRooms.forEach((r) => {
      const fl = r.floor || 1;
      const list = map.get(fl) || [];
      list.push(r);
      map.set(fl, list);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [availableRooms]);

  const selectedRoom = useMemo(() => {
    return availableRooms.find((r) => r.id === toRoomId);
  }, [availableRooms, toRoomId]);

  const isUpgrade = Boolean(
    selectedRoom &&
      stay &&
      (selectedRoom.roomType || "").toLowerCase() !==
        (stay.currentRoomType || "").toLowerCase(),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stay) return;

    if (!toRoomId) {
      toast.error("Vui lòng chọn phòng chuyển đến");
      return;
    }

    if (reasonNote.trim().length < 5) {
      toast.error("Lý do chi tiết cần tối thiểu 5 ký tự");
      return;
    }

    startTransition(async () => {
      const res = await changeStayRoomAction({
        stayId: stay.stayId,
        branchId: stay.branchId,
        toRoomId,
        reasonCategory,
        reasonNote: reasonNote.trim(),
        createWorkOrder: reasonCategory === "maintenance" && createWorkOrder,
        workOrderTitle:
          reasonCategory === "maintenance"
            ? `Sự cố phòng ${stay.currentRoomNumber}: ${reasonNote.trim()}`
            : undefined,
        workOrderPriority,
      });

      if (!res.ok) {
        toast.error(res.error?.message || "Không thể đổi phòng cho khách");
        return;
      }

      toast.success(
        `Đã chuyển phòng thành công: ${res.data.fromRoomNumber} ➔ ${res.data.toRoomNumber}`,
        {
          description: res.data.workOrderNumber
            ? `Đã tự động tạo Phiếu sửa chữa #${res.data.workOrderNumber} cho phòng cũ ${res.data.fromRoomNumber}`
            : undefined,
          duration: 5000,
        },
      );

      handleOpenChange(false);
      onSuccess?.();
    });
  };

  if (!stay) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <DoorOpen className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle>Đổi phòng cho khách</DialogTitle>
                <DialogDescription>
                  Chuyển phòng lưu trú cho khách{" "}
                  <span className="font-semibold text-foreground">
                    {stay.guestName}
                  </span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Visual chuyển đổi phòng */}
            <div className="p-3 bg-muted/50 rounded-xl border flex items-center justify-between text-xs">
              <div className="flex flex-col">
                <span className="text-muted-foreground">Phòng hiện tại</span>
                <span className="font-bold text-base text-foreground flex items-center gap-1.5">
                  {stay.currentRoomNumber}
                  <Badge variant="outline" className="text-[10px] font-normal">
                    {stay.currentRoomType}
                  </Badge>
                </span>
              </div>

              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-background border text-muted-foreground shadow-xs">
                <ArrowRight className="h-4 w-4" />
              </div>

              <div className="flex flex-col items-end">
                <span className="text-muted-foreground">Phòng mới</span>
                {selectedRoom ? (
                  <span className="font-bold text-base text-primary flex items-center gap-1.5">
                    {selectedRoom.number}
                    <Badge
                      variant={isUpgrade ? "default" : "outline"}
                      className="text-[10px]"
                    >
                      {selectedRoom.roomType}
                    </Badge>
                  </span>
                ) : (
                  <span className="text-muted-foreground italic">
                    Chưa chọn
                  </span>
                )}
              </div>
            </div>

            {/* Chọn phòng mới */}
            <div className="space-y-1.5">
              <Label htmlFor={toRoomSelectId} className="text-xs font-semibold">
                Phòng chuyển đến <span className="text-rose-500">*</span>
              </Label>
              {availableRooms.length === 0 ? (
                <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>
                    Hiện không còn phòng trống nào khác tại cơ sở này.
                  </span>
                </div>
              ) : (
                <Select
                  value={toRoomId}
                  onValueChange={(val) => setToRoomId(val || "")}
                >
                  <SelectTrigger id={toRoomSelectId} className="h-9 text-xs">
                    <SelectValue placeholder="-- Chọn phòng trống --" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {roomsByFloor.map(([floor, floorRooms]) => (
                      <div key={floor}>
                        <div className="px-2 py-1 text-[11px] font-bold text-muted-foreground bg-muted/40">
                          Tầng {floor}
                        </div>
                        {floorRooms.map((r) => (
                          <SelectItem
                            key={r.id}
                            value={r.id}
                            className="text-xs"
                          >
                            <div className="flex items-center justify-between w-full gap-3">
                              <span className="font-semibold">{r.number}</span>
                              <span className="text-muted-foreground text-[11px]">
                                {r.roomType}
                              </span>
                              {r.isCleaning && (
                                <span className="text-amber-600 font-medium text-[10px]">
                                  (Đang dọn)
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {selectedRoom?.isCleaning && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-1">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  Phòng này vừa trả phòng, vui lòng xác nhận buồng phòng đã dọn
                  sạch trước khi giao chìa khóa.
                </p>
              )}
            </div>

            {/* Chọn lý do đổi phòng */}
            <div className="space-y-1.5">
              <Label
                htmlFor={reasonCategorySelectId}
                className="text-xs font-semibold"
              >
                Nhóm lý do đổi phòng <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={reasonCategory}
                onValueChange={(val) =>
                  val && setReasonCategory(val as MoveReasonCategory)
                }
              >
                <SelectTrigger
                  id={reasonCategorySelectId}
                  className="h-9 text-xs"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {moveReasonCategories.map((cat) => (
                    <SelectItem key={cat} value={cat} className="text-xs">
                      {MOVE_REASON_LABELS[cat]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Ghi chú chi tiết lý do */}
            <div className="space-y-1.5">
              <Label htmlFor="reasonNote" className="text-xs font-semibold">
                Ghi chú chi tiết lý do <span className="text-rose-500">*</span>
              </Label>
              <textarea
                id="reasonNote"
                value={reasonNote}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setReasonNote(e.target.value)
                }
                placeholder="Ví dụ: Máy lạnh phòng 302 chảy nước không mát, chuyển khách sang 405 phòng tương đương..."
                rows={3}
                className="flex min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              />
              <p className="text-[10px] text-muted-foreground">
                Tối thiểu 5 ký tự. Thông tin này sẽ được lưu vào lịch sử lưu trú
                và nhật ký hệ thống.
              </p>
            </div>

            {/* Tùy chọn tạo phiếu sửa chữa nếu là sự cố CSVC */}
            {reasonCategory === "maintenance" && (
              <div className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-xl space-y-3">
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="createWo"
                    checked={createWorkOrder}
                    onCheckedChange={(c) => setCreateWorkOrder(Boolean(c))}
                    className="mt-0.5"
                  />
                  <div className="space-y-0.5">
                    <Label
                      htmlFor="createWo"
                      className="text-xs font-medium cursor-pointer text-foreground flex items-center gap-1.5"
                    >
                      <Wrench className="h-3.5 w-3.5 text-rose-600" />
                      Tự động tạo Phiếu sửa chữa (Work Order) cho phòng cũ{" "}
                      {stay.currentRoomNumber}
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Báo ngay cho bộ phận Kỹ thuật đến kiểm tra và khắc phục sự
                      cố vừa ghi nhận.
                    </p>
                  </div>
                </div>

                {createWorkOrder && (
                  <div className="pl-6 pt-1 space-y-1.5">
                    <Label
                      htmlFor={workOrderPrioritySelectId}
                      className="text-[11px] font-medium"
                    >
                      Độ ưu tiên xử lý
                    </Label>
                    <Select
                      value={workOrderPriority}
                      onValueChange={(val) =>
                        val && setWorkOrderPriority(val as any)
                      }
                    >
                      <SelectTrigger
                        id={workOrderPrioritySelectId}
                        className="h-8 text-xs bg-background"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="urgent" className="text-xs">
                          🔴 Khẩn cấp (Cần xử lý ngay)
                        </SelectItem>
                        <SelectItem value="high" className="text-xs">
                          🟠 Cao (Ưu tiên trong ngày)
                        </SelectItem>
                        <SelectItem value="normal" className="text-xs">
                          🟢 Bình thường
                        </SelectItem>
                        <SelectItem value="low" className="text-xs">
                          ⚪ Thấp
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={
                isPending || !toRoomId || reasonNote.trim().length < 5
              }
              className="gap-1.5"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Xác nhận Đổi phòng
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
