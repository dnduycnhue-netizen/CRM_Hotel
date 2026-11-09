"use client";

import {
  ArrowRight,
  Clock,
  DoorOpen,
  History,
  Info,
  Loader2,
  User,
} from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui";
import { formatDateTimeVN } from "@/shared/utils/date";
import { getStayRoomMovesAction } from "../actions";
import type { StayRoomMove } from "../domain/types";
import { MOVE_REASON_LABELS } from "../schemas";

interface RoomMoveHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stay: {
    stayId: string;
    roomNumber: string;
    guestName: string;
  } | null;
}

export function RoomMoveHistoryDialog({
  open,
  onOpenChange,
  stay,
}: RoomMoveHistoryDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [moves, setMoves] = useState<StayRoomMove[]>([]);

  useEffect(() => {
    if (open && stay?.stayId) {
      startTransition(async () => {
        const res = await getStayRoomMovesAction(stay.stayId);
        if (res.ok) {
          setMoves(res.data);
        }
      });
    }
  }, [open, stay?.stayId]);

  if (!stay) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <History className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle>Lịch sử đổi phòng</DialogTitle>
              <DialogDescription>
                Khách:{" "}
                <span className="font-semibold text-foreground">
                  {stay.guestName}
                </span>{" "}
                (Hiện ở phòng {stay.roomNumber})
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-3">
          {isPending ? (
            <div className="py-8 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-xs">Đang tải lịch sử chuyển phòng...</span>
            </div>
          ) : moves.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Chưa có ghi nhận chuyển phòng nào cho lượt ở này.
            </div>
          ) : (
            <div className="relative border-l border-muted-foreground/20 ml-3.5 space-y-4 py-1">
              {moves.map((m, idx) => (
                <div key={m.id} className="relative pl-6">
                  {/* Timeline icon */}
                  <div className="absolute -left-2 top-0.5 h-4 w-4 rounded-full bg-primary/20 border border-primary flex items-center justify-center">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  </div>

                  <div className="bg-card border rounded-xl p-3 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1 font-mono text-[11px]">
                        <Clock className="h-3 w-3" />
                        {formatDateTimeVN(m.movedAt)}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        Lần {moves.length - idx}
                      </Badge>
                    </div>

                    {/* Room visual */}
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <span className="px-2 py-0.5 bg-muted rounded-md text-foreground">
                        {m.fromRoomNumber}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="px-2 py-0.5 bg-primary/10 text-primary font-bold rounded-md">
                        {m.toRoomNumber}
                      </span>
                    </div>

                    {/* Category & note */}
                    <div className="text-xs space-y-1">
                      <div className="font-medium text-foreground text-[11px]">
                        {MOVE_REASON_LABELS[m.reasonCategory] ||
                          m.reasonCategory}
                      </div>
                      <p className="text-[11px] text-muted-foreground bg-muted/30 p-2 rounded-lg italic">
                        &ldquo;{m.reasonNote}&rdquo;
                      </p>
                    </div>

                    <div className="text-[10px] text-muted-foreground flex items-center gap-1 pt-1 border-t">
                      <User className="h-3 w-3" />
                      <span>Thực hiện bởi: {m.movedByName || "Nhân viên"}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

