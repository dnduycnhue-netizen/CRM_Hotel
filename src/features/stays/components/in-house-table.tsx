"use client";

import {
  AlertCircle,
  Ban,
  Clock,
  DoorClosed,
  Loader2,
  LogOut,
  Phone,
  Search,
  UserCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Badge,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui";
import { formatDateTimeVN } from "@/shared/utils/date";
import { cancelStayAction, checkoutStayAction } from "../actions";
import type { InHouseStay } from "../domain/types";
import { StayCompanionsDialog } from "./stay-companions-dialog";

interface InHouseTableProps {
  stays: InHouseStay[];
  currentBranchId: string;
  branchName: string;
}

export function InHouseTable({
  stays,
  currentBranchId,
  branchName,
}: InHouseTableProps) {
  const [isPending, startTransition] = useTransition();
  const [activeStayList, setActiveStayList] = useState(stays);
  const [searchTerm, setSearchTerm] = useState("");

  const [statusFilter, setStatusFilter] = useState<
    "all" | "in_house" | "overdue"
  >("all");
  const [dateFilter, setDateFilter] = useState<
    "all" | "today_in" | "today_out"
  >("all");

  // Dialog state cho Trả phòng
  const [checkoutTarget, setCheckoutTarget] = useState<{
    stayId: string;
    roomNumber: string;
    guestName: string;
  } | null>(null);

  // Dialog state cho Hủy phòng
  const [cancelTarget, setCancelTarget] = useState<{
    stayId: string;
    roomNumber: string;
    checkInAt: string;
  } | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  // Dialog state cho Người đi cùng
  const [companionStayTarget, setCompanionStayTarget] = useState<{
    stayId: string;
    roomNumber: string;
  } | null>(null);

  const filteredStays = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return activeStayList.filter((s) => {
      // 1. Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const match =
          s.roomNumber.toLowerCase().includes(q) ||
          s.primaryGuestName.toLowerCase().includes(q) ||
          s.primaryGuestPhone?.includes(q);
        if (!match) return false;
      }

      // 2. Status filter
      if (statusFilter === "in_house" && s.isOverdue) return false;
      if (statusFilter === "overdue" && !s.isOverdue) return false;

      // 3. Date filter
      if (dateFilter === "today_in") {
        const inDate = new Date(s.checkInAt).toISOString().slice(0, 10);
        if (inDate !== todayStr) return false;
      }
      if (dateFilter === "today_out") {
        const outDate = new Date(s.expectedCheckOutAt)
          .toISOString()
          .slice(0, 10);
        if (outDate !== todayStr) return false;
      }

      return true;
    });
  }, [activeStayList, searchTerm, statusFilter, dateFilter]);

  const confirmCheckout = () => {
    if (!checkoutTarget) return;
    const { stayId, roomNumber } = checkoutTarget;

    startTransition(async () => {
      const res = await checkoutStayAction(stayId, currentBranchId);
      if (res.ok) {
        toast.success(
          `Đã hoàn tất trả phòng ${roomNumber}! Phòng sẵn sàng đón khách.`,
        );
        setActiveStayList((prev) => prev.filter((s) => s.id !== stayId));
        setCheckoutTarget(null);
      } else {
        toast.error(res.error.message);
      }
    });
  };

  const confirmCancel = () => {
    if (!cancelTarget) return;
    if (cancelReason.trim().length < 5) {
      toast.error("Lý do hủy phải có tối thiểu 5 ký tự!");
      return;
    }

    const { stayId, roomNumber } = cancelTarget;
    startTransition(async () => {
      const res = await cancelStayAction(stayId, currentBranchId, cancelReason);
      if (res.ok) {
        toast.success(`Đã hủy lượt ở phòng ${roomNumber}!`);
        setActiveStayList((prev) => prev.filter((s) => s.id !== stayId));
        setCancelTarget(null);
        setCancelReason("");
      } else {
        toast.error(res.error.message);
      }
    });
  };

  const overdueCount = activeStayList.filter((s) => s.isOverdue).length;
  const totalGuests = activeStayList.reduce((sum, s) => sum + s.guestCount, 0);

  return (
    <div className="space-y-5">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Phòng đang có khách */}
        <div className="p-4 rounded-xl border border-border/70 bg-card shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Phòng có khách
            </span>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <DoorClosed className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-foreground tracking-tight">
              {activeStayList.length}
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              phòng đang ở
            </span>
          </div>
          <div className="mt-2 h-1 w-full bg-blue-500/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${Math.min(100, activeStayList.length * 10)}%` }}
            />
          </div>
        </div>

        {/* Card 2: Tổng số khách lưu trú */}
        <div className="p-4 rounded-xl border border-border/70 bg-card shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Tổng số khách
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-foreground tracking-tight">
              {totalGuests}
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              người lưu trú
            </span>
          </div>
          <div className="mt-2 h-1 w-full bg-emerald-500/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full"
              style={{ width: `${Math.min(100, totalGuests * 5)}%` }}
            />
          </div>
        </div>

        {/* Card 3: Quá hạn giờ trả */}
        <div
          className={`p-4 rounded-xl border shadow-xs relative overflow-hidden ${
            overdueCount > 0
              ? "border-rose-500/40 bg-rose-500/5"
              : "border-border/70 bg-card"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Quá hạn trả phòng
            </span>
            <div
              className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                overdueCount > 0
                  ? "bg-rose-500/15 text-rose-600 animate-pulse"
                  : "bg-emerald-500/10 text-emerald-600"
              }`}
            >
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-3xl font-extrabold tracking-tight ${
                overdueCount > 0
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {overdueCount}
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              {overdueCount > 0 ? "cần kiểm tra ngay" : "đúng tiến độ"}
            </span>
          </div>
          <div className="mt-2 h-1 w-full bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${overdueCount > 0 ? "bg-rose-500" : "bg-emerald-500"}`}
              style={{ width: overdueCount > 0 ? "100%" : "0%" }}
            />
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="border-border/70 shadow-xs overflow-hidden rounded-xl">
        <CardHeader className="pb-3 border-b border-border/50 bg-card/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Users className="h-5 w-5 text-amber-500" />
                <span>Danh Sách Khách Đang Ở ({branchName})</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Cập nhật tức thì, hỗ trợ tìm nhanh theo tên khách, phòng, số
                điện thoại
              </CardDescription>
            </div>

            {/* Quick search input & Filters & Action button */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Lọc số phòng, tên khách..."
                  className="pl-8.5 h-8.5 text-xs rounded-lg bg-background"
                />
              </div>

              <select
                aria-label="Lọc trạng thái lưu trú"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value as "all" | "in_house" | "overdue",
                  )
                }
                className="h-8.5 text-xs rounded-lg border border-input bg-background px-2.5 shadow-xs focus:outline-none focus:ring-1 focus:ring-ring text-muted-foreground"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="in_house">Đang ở bình thường</option>
                <option value="overdue">Quá hạn trả phòng</option>
              </select>

              <select
                aria-label="Lọc thời gian lưu trú"
                value={dateFilter}
                onChange={(e) =>
                  setDateFilter(
                    e.target.value as "all" | "today_in" | "today_out",
                  )
                }
                className="h-8.5 text-xs rounded-lg border border-input bg-background px-2.5 shadow-xs focus:outline-none focus:ring-1 focus:ring-ring text-muted-foreground"
              >
                <option value="all">Tất cả ngày</option>
                <option value="today_in">Nhận phòng hôm nay</option>
                <option value="today_out">Trả phòng hôm nay</option>
              </select>

              <Link
                href="/check-in"
                className="inline-flex items-center h-8.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-xs shrink-0 transition-all hover:scale-[1.02]"
              >
                <UserCheck className="h-3.5 w-3.5 mr-1.5" />
                <span>+ Check-in mới</span>
              </Link>
            </div>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="text-xs bg-muted/30">
                <TableHead className="w-28 font-bold">Số phòng</TableHead>
                <TableHead className="font-bold">Khách đại diện</TableHead>
                <TableHead className="font-bold">Số khách</TableHead>
                <TableHead className="font-bold">Giờ nhận phòng</TableHead>
                <TableHead className="font-bold">Dự kiến trả</TableHead>
                <TableHead className="font-bold">Kênh nguồn</TableHead>
                <TableHead className="font-bold">Trạng thái</TableHead>
                <TableHead className="text-right font-bold">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStays.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-44 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2.5 py-4">
                      <div className="h-12 w-12 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground">
                        <DoorClosed className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">
                        {searchTerm
                          ? "Không tìm thấy lượt ở phù hợp"
                          : "Chưa có phòng nào đang ở tại cơ sở này"}
                      </p>
                      <p className="text-xs text-muted-foreground max-w-sm">
                        {searchTerm
                          ? "Thử tìm với từ khóa khác"
                          : 'Bấm nút "Check-in mới" để tiếp nhận khách nhận phòng tức thì.'}
                      </p>
                      {!searchTerm && (
                        <Link
                          href="/check-in"
                          className="mt-2 inline-flex items-center h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-all"
                        >
                          <UserCheck className="h-3.5 w-3.5 mr-1.5" />
                          <span>Tiến hành Check-in</span>
                        </Link>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredStays.map((s) => (
                  <TableRow
                    key={s.id}
                    className="text-xs hover:bg-muted/40 transition-colors"
                  >
                    <TableCell className="font-bold text-foreground">
                      <div className="flex items-center gap-1.5">
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold text-xs">
                          {s.roomNumber}
                        </span>
                        <span className="font-semibold text-sm">
                          P.{s.roomNumber}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground block pl-7">
                        {s.roomType || "Tiêu chuẩn"}
                      </span>
                    </TableCell>

                    <TableCell>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground text-xs">
                            {s.primaryGuestName}
                          </span>
                          {s.tierName && (
                            <Badge
                              variant="default"
                              className={`text-[9px] py-0 px-1.5 font-bold ${
                                s.tierName === "Vàng"
                                  ? "bg-amber-500 text-black"
                                  : s.tierName === "Bạc"
                                    ? "bg-slate-400 text-white"
                                    : "bg-amber-800 text-white"
                              }`}
                            >
                              {s.tierName}
                            </Badge>
                          )}
                        </div>
                        {s.primaryGuestPhone && (
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                            <Phone className="h-2.5 w-2.5" />
                            {s.primaryGuestPhone}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="font-medium text-foreground">
                      <button
                        type="button"
                        onClick={() =>
                          setCompanionStayTarget({
                            stayId: s.id,
                            roomNumber: s.roomNumber,
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted/60 hover:bg-muted text-foreground transition border border-border/40 hover:border-indigo-400 group cursor-pointer"
                        title="Xem và quản lý người đi cùng"
                      >
                        <Users className="w-3.5 h-3.5 text-indigo-500 group-hover:scale-110 transition-transform" />
                        <span>{s.guestCount} người</span>
                      </button>
                    </TableCell>

                    <TableCell className="text-muted-foreground font-mono text-xs">
                      {formatDateTimeVN(s.checkInAt)}
                    </TableCell>

                    <TableCell className="font-mono text-xs">
                      <span
                        className={
                          s.isOverdue
                            ? "text-rose-600 font-bold flex items-center gap-1"
                            : "text-foreground"
                        }
                      >
                        {s.isOverdue && (
                          <AlertCircle className="h-3 w-3 text-rose-600 shrink-0" />
                        )}
                        {formatDateTimeVN(s.expectedCheckOutAt)}
                      </span>
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline" className="text-[10px] bg-card">
                        {s.sourceChannelName}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      {s.isOverdue ? (
                        <Badge
                          variant="destructive"
                          className="text-[10px] animate-pulse"
                        >
                          Quá hạn trả
                        </Badge>
                      ) : (
                        <Badge
                          variant="default"
                          className="text-[10px] bg-emerald-600 hover:bg-emerald-600 text-white"
                        >
                          Đang ở
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setCheckoutTarget({
                              stayId: s.id,
                              roomNumber: s.roomNumber,
                              guestName: s.primaryGuestName,
                            })
                          }
                          disabled={isPending}
                          className="h-8 text-xs font-bold px-3 text-emerald-700 dark:text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/10 hover:border-emerald-500 transition-all rounded-lg"
                        >
                          <LogOut className="h-3.5 w-3.5 mr-1" />
                          Trả phòng
                        </Button>
                        {(() => {
                          const hoursSinceCheckIn =
                            (Date.now() - new Date(s.checkInAt).getTime()) /
                            (3600 * 1000);
                          const isLateCancel = hoursSinceCheckIn > 6;
                          return (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setCancelTarget({
                                  stayId: s.id,
                                  roomNumber: s.roomNumber,
                                  checkInAt: s.checkInAt,
                                });
                                setCancelReason("");
                              }}
                              disabled={isPending}
                              className={`h-8 w-8 p-0 rounded-lg ${
                                isLateCancel
                                  ? "text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                                  : "text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                              }`}
                              title={
                                isLateCancel
                                  ? "Đã nhận phòng quá 6h (Yêu cầu quyền quản trị chuỗi)"
                                  : "Hủy lượt ở (trong 6h)"
                              }
                            >
                              <Ban className="h-3.5 w-3.5" />
                            </Button>
                          );
                        })()}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Dialog Xác nhận Trả phòng */}
      <Dialog
        open={!!checkoutTarget}
        onOpenChange={(open) => !open && setCheckoutTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <LogOut className="h-5 w-5" />
              <span>Xác nhận trả phòng {checkoutTarget?.roomNumber}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              Hoàn tất thủ tục check-out cho khách{" "}
              <strong className="text-foreground">
                {checkoutTarget?.guestName}
              </strong>
              . Phòng sẵn sàng để đón khách tiếp theo.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCheckoutTarget(null)}
              disabled={isPending}
            >
              Hủy bỏ
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={confirmCheckout}
              disabled={isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {isPending && (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              )}
              Xác nhận trả phòng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Xác nhận Hủy lượt ở */}
      <Dialog
        open={!!cancelTarget}
        onOpenChange={(open) => !open && setCancelTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <Ban className="h-5 w-5" />
              <span>Hủy lượt ở phòng {cancelTarget?.roomNumber}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              {cancelTarget?.checkInAt &&
              (Date.now() - new Date(cancelTarget.checkInAt).getTime()) /
                (3600 * 1000) >
                6
                ? "Lượt ở đã nhận phòng quá 6 giờ. Cần thẩm quyền quản lý chuỗi để thực hiện hủy trễ."
                : "Thao tác này chỉ áp dụng trong vòng 6 giờ từ khi tạo. Vui lòng nhập lý do hủy bắt buộc để lưu nhật ký kiểm toán."}
            </DialogDescription>
          </DialogHeader>

          {cancelTarget?.checkInAt &&
            (Date.now() - new Date(cancelTarget.checkInAt).getTime()) /
              (3600 * 1000) >
              6 && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-700 dark:text-amber-400 text-xs flex items-start gap-2">
                <Clock className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                <div>
                  <span className="font-semibold">
                    Cảnh báo hủy trễ (&gt; 6 giờ):
                  </span>{" "}
                  Thao tác này sẽ ghi nhận log kiểm toán đặc biệt và yêu cầu
                  quyền chuỗi.
                </div>
              </div>
            )}

          <div className="space-y-2 py-2">
            <Label
              htmlFor="cancelReason"
              className="text-xs font-bold text-foreground"
            >
              Lý do hủy (tối thiểu 5 ký tự) *
            </Label>
            <Input
              id="cancelReason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="VD: Khách đổi ý không nhận phòng, nhầm phòng..."
              className="text-xs rounded-xl"
              autoFocus
            />
          </div>

          <DialogFooter className="mt-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCancelTarget(null)}
              disabled={isPending}
            >
              Đóng
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={confirmCancel}
              disabled={isPending || cancelReason.trim().length < 5}
              className="font-bold"
            >
              {isPending && (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              )}
              Xác nhận hủy lượt ở
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Quản lý Người đi cùng (§2) */}
      <StayCompanionsDialog
        stayId={companionStayTarget?.stayId || null}
        roomNumber={companionStayTarget?.roomNumber || ""}
        branchId={currentBranchId}
        isOpen={!!companionStayTarget}
        onClose={() => setCompanionStayTarget(null)}
        onGuestsUpdated={(newCount) => {
          setActiveStayList((prev) =>
            prev.map((item) =>
              item.id === companionStayTarget?.stayId
                ? { ...item, guestCount: newCount }
                : item,
            ),
          );
        }}
      />
    </div>
  );
}
