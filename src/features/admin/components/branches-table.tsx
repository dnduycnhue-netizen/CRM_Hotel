"use client";

import { Building2, Clock, Edit, Loader2, Phone, Plus } from "lucide-react";
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
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui";
import { saveBranchAction } from "../actions";
import type { Branch } from "../domain/types";

interface BranchesTableProps {
  branches: Branch[];
}

export function BranchesTable({ branches }: BranchesTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  // Form fields
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [nightCutoff, setNightCutoff] = useState("06:00");
  const [defaultCheckoutTime, setDefaultCheckoutTime] = useState("12:00");
  const [isActive, setIsActive] = useState(true);

  const totalRooms = branches.reduce((sum, b) => sum + (b.roomsCount || 0), 0);

  const handleOpenCreate = () => {
    setEditingBranch(null);
    setCode("");
    setName("");
    setPhone("");
    setAddress("");
    setNightCutoff("06:00");
    setDefaultCheckoutTime("12:00");
    setIsActive(true);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setCode(branch.code);
    setName(branch.name);
    setPhone(branch.phone || "");
    setAddress(branch.address || "");
    setNightCutoff(branch.nightCutoff || "06:00");
    setDefaultCheckoutTime(branch.defaultCheckoutTime || "12:00");
    setIsActive(branch.isActive);
    setIsDialogOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      toast.error("Vui lòng nhập đầy đủ mã và tên cơ sở");
      return;
    }

    startTransition(async () => {
      const res = await saveBranchAction({
        id: editingBranch?.id,
        code: code.trim().toUpperCase(),
        name: name.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        nightCutoff: nightCutoff.trim() || "06:00",
        defaultCheckoutTime: defaultCheckoutTime.trim() || "12:00",
        isActive,
      });

      if (res.ok) {
        toast.success(
          editingBranch
            ? `Đã cập nhật cơ sở ${name}`
            : `Đã thêm mới cơ sở ${name}`,
        );
        setIsDialogOpen(false);
        router.refresh();
      } else {
        toast.error(`Không thể lưu cơ sở: ${res.error.message || res.error.code}`);
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">
              Tổng cơ sở chuỗi
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-primary">
              {branches.length} Khách sạn
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">
              Tổng số phòng kinh doanh
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">
              {totalRooms} Phòng
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">
              Quy định giờ nhận / trả phòng
            </CardDescription>
            <CardTitle className="text-sm font-semibold flex items-center gap-2 pt-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>Cắt đêm: 06:00 · Trả: 12:00</span>
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Main Table */}
      <Card className="border-border/60 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/40">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">
                Danh sách Cơ sở Khách sạn
              </CardTitle>
              <CardDescription className="text-xs">
                Cấu hình thông tin cơ sở, giờ cắt đêm và liên hệ
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={handleOpenCreate}
              className="h-8 text-xs font-semibold gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Thêm cơ sở mới</span>
            </Button>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="text-xs bg-muted/30">
                <TableHead className="w-16">Mã</TableHead>
                <TableHead>Tên cơ sở</TableHead>
                <TableHead>Số phòng</TableHead>
                <TableHead>Điện thoại & Địa chỉ</TableHead>
                <TableHead>Giờ cắt đêm</TableHead>
                <TableHead>Giờ trả phòng</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branches.map((b) => (
                <TableRow key={b.id} className="text-xs hover:bg-muted/40">
                  <TableCell className="font-mono font-bold text-primary">
                    {b.code}
                  </TableCell>
                  <TableCell className="font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span>{b.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-semibold">
                      {b.roomsCount || 0} phòng
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-foreground font-medium">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span>{b.phone || "Chưa cập nhật"}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate max-w-xs">
                        {b.address || "Chưa cập nhật địa chỉ"}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">{b.nightCutoff}</TableCell>
                  <TableCell className="font-mono">
                    {b.defaultCheckoutTime}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={b.isActive ? "default" : "outline"}
                      className="text-[10px]"
                    >
                      {b.isActive ? "Đang hoạt động" : "Tạm ngưng"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEdit(b)}
                      className="h-7 w-7 p-0 hover:bg-muted"
                      title="Chỉnh sửa thông tin cơ sở"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Edit/Create Modal Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingBranch
                ? `Chỉnh sửa cơ sở: ${editingBranch.name}`
                : "Thêm cơ sở khách sạn mới"}
            </DialogTitle>
            <DialogDescription>
              Cập nhật thông tin chi tiết, đường dây nóng và cấu hình vận hành
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="branchCode" className="text-xs font-semibold">
                  Mã cơ sở *
                </Label>
                <Input
                  id="branchCode"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="VD: BOUTIQUE"
                  className="h-9 text-xs font-mono uppercase"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="branchName" className="text-xs font-semibold">
                  Tên khách sạn *
                </Label>
                <Input
                  id="branchName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: Boutique"
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="branchPhone" className="text-xs font-semibold">
                Số điện thoại liên hệ
              </Label>
              <Input
                id="branchPhone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="VD: 0236 3959 888"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="branchAddress" className="text-xs font-semibold">
                Địa chỉ chi tiết
              </Label>
              <Input
                id="branchAddress"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="VD: 150 Võ Nguyên Giáp, Sơn Trà, Đà Nẵng"
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="nightCutoff" className="text-xs font-semibold">
                  Giờ cắt đêm (Night audit)
                </Label>
                <Input
                  id="nightCutoff"
                  value={nightCutoff}
                  onChange={(e) => setNightCutoff(e.target.value)}
                  placeholder="06:00"
                  className="h-9 text-xs font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="checkoutTime" className="text-xs font-semibold">
                  Giờ trả phòng mặc định
                </Label>
                <Input
                  id="checkoutTime"
                  value={defaultCheckoutTime}
                  onChange={(e) => setDefaultCheckoutTime(e.target.value)}
                  placeholder="12:00"
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-muted/20">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold block text-foreground">
                  Trạng thái hoạt động
                </span>
                <span className="text-[11px] text-muted-foreground block">
                  Cơ sở đang mở cửa đón khách lưu trú
                </span>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isPending}
                className="h-9 text-xs"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="h-9 text-xs font-semibold gap-1.5"
              >
                {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>{editingBranch ? "Lưu thay đổi" : "Tạo cơ sở"}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
