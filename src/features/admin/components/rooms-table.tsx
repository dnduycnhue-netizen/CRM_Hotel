"use client";

import {
  AlertTriangle,
  DoorClosed,
  Edit,
  Loader2,
  Plus,
  Power,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
import {
  createRoomAction,
  deactivateRoomAction,
  deleteRoomPermanentAction,
  reactivateRoomAction,
  updateRoomAction,
} from "../actions";
import type { Branch, RoomItem } from "../domain/types";

interface RoomsTableProps {
  rooms: RoomItem[];
  branches: Branch[];
  isOwner?: boolean;
  defaultBranchId?: string;
}

export function RoomsTable({
  rooms,
  branches,
  isOwner = false,
  defaultBranchId = "all",
}: RoomsTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [selectedBranch, setSelectedBranch] = useState<string>(
    isOwner
      ? defaultBranchId
      : defaultBranchId !== "all"
        ? defaultBranchId
        : branches[0]?.id || "all",
  );
  const [searchNumber, setSearchNumber] = useState<string>("");

  // Dialog Form Thêm / Sửa
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<RoomItem | null>(null);
  const [branchId, setBranchId] = useState<string>("");
  const [roomNumber, setRoomNumber] = useState<string>("");
  const [floor, setFloor] = useState<string>("");
  const [roomType, setRoomType] = useState<string>("Standard");
  const [openedOn, setOpenedOn] = useState<string>("");

  // Dialog xác nhận xóa vĩnh viễn
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingRoom, setDeletingRoom] = useState<RoomItem | null>(null);

  // Dialog xác nhận ngừng kinh doanh
  const [deactivatingRoom, setDeactivatingRoom] = useState<RoomItem | null>(
    null,
  );

  const filteredRooms = rooms.filter((r) => {
    const matchBranch =
      selectedBranch === "all" ||
      r.branchId === selectedBranch ||
      r.branchCode === selectedBranch;
    const matchNumber = !searchNumber || r.number.includes(searchNumber);
    return matchBranch && matchNumber;
  });

  const handleOpenCreate = () => {
    setEditingRoom(null);
    setBranchId(
      selectedBranch !== "all" ? selectedBranch : branches[0]?.id || "",
    );
    setRoomNumber("");
    setFloor("1");
    setRoomType("Standard");
    setOpenedOn(new Date().toISOString().split("T")[0]);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (r: RoomItem) => {
    setEditingRoom(r);
    setBranchId(r.branchId);
    setRoomNumber(r.number);
    setFloor(r.floor ? String(r.floor) : "1");
    setRoomType(r.roomType || "Standard");
    setOpenedOn("");
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!roomNumber.trim()) {
      toast.error("Vui lòng nhập số phòng");
      return;
    }
    if (!editingRoom && !branchId) {
      toast.error("Vui lòng chọn cơ sở");
      return;
    }

    startTransition(async () => {
      if (editingRoom) {
        const res = await updateRoomAction(
          editingRoom.id,
          editingRoom.branchId,
          {
            number: roomNumber.trim(),
            floor: floor ? Number(floor) : null,
            room_type: roomType.trim() || null,
            opened_on: openedOn || null,
          },
        );
        if (res.ok) {
          toast.success(`Đã cập nhật phòng ${roomNumber}!`);
          setIsDialogOpen(false);
          router.refresh();
        } else {
          toast.error(res.error.message || "Lỗi khi cập nhật phòng");
        }
      } else {
        const res = await createRoomAction({
          branch_id: branchId,
          number: roomNumber.trim(),
          floor: floor ? Number(floor) : null,
          room_type: roomType.trim() || null,
          opened_on: openedOn || null,
        });
        if (res.ok) {
          toast.success(`Đã thêm phòng ${roomNumber} thành công!`);
          setIsDialogOpen(false);
          router.refresh();
        } else {
          toast.error(res.error.message || "Lỗi khi tạo phòng mới");
        }
      }
    });
  };

  const handleToggleActive = (r: RoomItem) => {
    if (r.isActive !== false) {
      setDeactivatingRoom(r);
    } else {
      startTransition(async () => {
        const res = await reactivateRoomAction(r.id, r.branchId);
        if (res.ok) {
          toast.success(`Phòng ${r.number} đã mở bán lại`);
          router.refresh();
        } else {
          toast.error(res.error.message || "Lỗi khi mở bán lại phòng");
        }
      });
    }
  };

  const handleConfirmDeactivate = () => {
    if (!deactivatingRoom) return;
    startTransition(async () => {
      const res = await deactivateRoomAction(
        deactivatingRoom.id,
        deactivatingRoom.branchId,
      );
      if (res.ok) {
        toast.success(`Phòng ${deactivatingRoom.number} đã ngừng kinh doanh`);
        setDeactivatingRoom(null);
        router.refresh();
      } else {
        toast.error(res.error.message || "Lỗi khi ngừng kinh doanh phòng");
      }
    });
  };

  const handleConfirmDeletePermanent = () => {
    if (!deletingRoom) return;
    startTransition(async () => {
      const res = await deleteRoomPermanentAction(
        deletingRoom.id,
        deletingRoom.branchId,
      );
      if (res.ok) {
        toast.success(`Đã xóa vĩnh viễn phòng ${deletingRoom.number}!`);
        setIsDeleteDialogOpen(false);
        setDeletingRoom(null);
        router.refresh();
      } else {
        toast.error(res.error.message || "Lỗi khi xóa phòng");
      }
    });
  };

  return (
    <>
      <Card className="border-border/60 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/40">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold">
                {isOwner ? "Danh mục Phòng Toàn Chuỗi" : "Danh mục Phòng Cơ Sở"}
              </CardTitle>
              <CardDescription className="text-xs">
                Quản lý số phòng, tầng, loại phòng và tình trạng kinh doanh
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedBranch}
                disabled={!isOwner && branches.length <= 1}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2.5 text-xs font-medium"
              >
                {isOwner && (
                  <option value="all">Tất cả {branches.length} cơ sở</option>
                )}
                {branches.map((b) => {
                  const actualCount = rooms.filter(
                    (r) => r.branchId === b.id,
                  ).length;
                  return (
                    <option key={b.id} value={b.id}>
                      {b.name} ({actualCount || b.roomsCount || 0} phòng)
                    </option>
                  );
                })}
              </select>
              <input
                type="text"
                placeholder="Gõ số phòng..."
                value={searchNumber}
                onChange={(e) => setSearchNumber(e.target.value)}
                className="h-8 w-28 rounded-md border border-input bg-background px-2.5 text-xs"
              />
              <Button
                size="sm"
                onClick={handleOpenCreate}
                className="h-8 px-3 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Thêm phòng</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
              <TableRow className="text-xs bg-muted/40">
                <TableHead className="w-20">Cơ sở</TableHead>
                <TableHead>Số phòng</TableHead>
                <TableHead>Tầng</TableHead>
                <TableHead>Hạng / Loại phòng</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRooms.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-32 text-center text-xs text-muted-foreground"
                  >
                    Không tìm thấy phòng nào phù hợp với bộ lọc
                  </TableCell>
                </TableRow>
              ) : (
                filteredRooms.map((r) => {
                  const isDeactivated = r.isActive === false;
                  return (
                    <TableRow
                      key={r.id}
                      className={`text-xs hover:bg-muted/40 ${isDeactivated ? "opacity-60 bg-muted/10" : ""}`}
                    >
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="font-mono text-[10px] font-bold"
                        >
                          {r.branchCode || r.branchName}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-bold text-foreground">
                        <div className="flex items-center gap-1.5">
                          <DoorClosed className="h-3.5 w-3.5 text-primary" />
                          <span>Phòng {r.number}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        Tầng {r.floor || 1}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px]">
                          {r.roomType || "Standard"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {isDeactivated ? (
                          <Badge
                            variant="destructive"
                            className="text-[10px] bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                          >
                            Ngừng kinh doanh
                          </Badge>
                        ) : (
                          <Badge
                            variant="default"
                            className="text-[10px] bg-emerald-600 hover:bg-emerald-600 text-white"
                          >
                            Hoạt động
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenEdit(r)}
                            className="h-7 px-2 text-xs gap-1"
                            title="Sửa thông tin phòng"
                          >
                            <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="hidden sm:inline">Sửa</span>
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleActive(r)}
                            disabled={isPending}
                            className={`h-7 px-2 text-[11px] gap-1 ${
                              isDeactivated
                                ? "text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                                : "text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                            }`}
                            title={
                              isDeactivated
                                ? "Mở bán lại phòng này"
                                : "Ngừng kinh doanh phòng này"
                            }
                          >
                            {isDeactivated ? (
                              <>
                                <RotateCcw className="h-3 w-3" />
                                <span>Mở lại</span>
                              </>
                            ) : (
                              <>
                                <Power className="h-3 w-3" />
                                <span>Ngừng KD</span>
                              </>
                            )}
                          </Button>

                          {isOwner && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setDeletingRoom(r);
                                setIsDeleteDialogOpen(true);
                              }}
                              className="h-7 px-2 text-xs text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
                              title="Xóa vĩnh viễn (Chỉ khi chưa có lượt ở)"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Dialog Thêm / Sửa Phòng */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingRoom
                ? `Sửa Thông Tin Phòng ${editingRoom.number}`
                : "Thêm Phòng Mới"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {editingRoom
                ? "Cập nhật thông tin số phòng, tầng hoặc hạng phòng."
                : "Tạo phòng mới trong danh mục kinh doanh của chi nhánh."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            {!editingRoom && (
              <div className="space-y-1.5">
                <Label
                  htmlFor="branch_select"
                  className="text-xs font-semibold"
                >
                  Cơ sở / Khách sạn *
                </Label>
                <select
                  id="branch_select"
                  value={branchId}
                  disabled={!isOwner && branches.length <= 1}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="room_number" className="text-xs font-semibold">
                  Số phòng *
                </Label>
                <Input
                  id="room_number"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  placeholder="VD: 101, 702..."
                  className="h-9 text-xs font-bold"
                  maxLength={10}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="floor" className="text-xs font-semibold">
                  Tầng
                </Label>
                <Input
                  id="floor"
                  type="number"
                  min={1}
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                  placeholder="1"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="room_type" className="text-xs font-semibold">
                Hạng / Loại phòng
              </Label>
              <Input
                id="room_type"
                value={roomType}
                onChange={(e) => setRoomType(e.target.value)}
                placeholder="Standard, Deluxe, Suite, Family..."
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="opened_on" className="text-xs font-semibold">
                Ngày bắt đầu mở bán
              </Label>
              <Input
                id="opened_on"
                type="date"
                value={openedOn}
                onChange={(e) => setOpenedOn(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDialogOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isPending}
              onClick={handleSave}
              className="gap-1.5"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{editingRoom ? "Lưu thay đổi" : "Tạo phòng"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Xác nhận Ngừng kinh doanh */}
      <Dialog
        open={!!deactivatingRoom}
        onOpenChange={(open) => {
          if (!open) setDeactivatingRoom(null);
        }}
      >
        <DialogContent className="sm:max-w-md border-amber-500/30">
          <DialogHeader>
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle>Xác Nhận Ngừng Kinh Doanh Phòng</DialogTitle>
            </div>
            <DialogDescription className="text-xs pt-1">
              Bạn có chắc chắn muốn ngừng kinh doanh{" "}
              <strong>Phòng {deactivatingRoom?.number}</strong>?
            </DialogDescription>
          </DialogHeader>

          <p className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg border border-border/50">
            Khi ngừng kinh doanh, phòng này sẽ bị khóa không cho phép đặt phòng
            hoặc check-in mới. Lịch sử lưu trú và dữ liệu cũ vẫn được bảo lưu
            trọn vẹn, và bạn có thể mở bán lại bất kỳ lúc nào.
          </p>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeactivatingRoom(null)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isPending}
              onClick={handleConfirmDeactivate}
              className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Xác nhận ngừng kinh doanh</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Xác nhận Xóa vĩnh viễn */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md border-rose-500/30">
          <DialogHeader>
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle>Xác Nhận Xóa Vĩnh Viễn Phòng</DialogTitle>
            </div>
            <DialogDescription className="text-xs pt-1">
              Hành động này{" "}
              <strong className="text-rose-600">không thể khôi phục</strong>.
              Bạn có chắc chắn muốn xóa vĩnh viễn{" "}
              <strong>Phòng {deletingRoom?.number}</strong>?
            </DialogDescription>
          </DialogHeader>

          <p className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg border border-border/50">
            Lưu ý: Hệ thống sẽ từ chối xóa nếu phòng đã phát sinh lịch sử lưu
            trú hoặc đang có khóa bảo trì (OOO). Trong trường hợp đó, bạn nên
            chọn chức năng <strong>Ngừng kinh doanh</strong>.
          </p>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={isPending}
              onClick={handleConfirmDeletePermanent}
              className="gap-1.5 bg-rose-600 hover:bg-rose-700"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Xác nhận xóa vĩnh viễn</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
