'use client';

import { useState, useTransition } from 'react';
import type { InHouseStay } from '../domain/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui';
import { Badge } from '@/shared/ui';
import { Button } from '@/shared/ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui';
import { checkoutStayAction, cancelStayAction } from '../actions';
import {
  Users,
  DoorClosed,
  Clock,
  LogOut,
  AlertCircle,
  Sparkles,
  Phone,
  Ban,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

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

  const handleCheckout = (stayId: string, roomNumber: string, guestName: string) => {
    if (!confirm(`Xác nhận trả phòng ${roomNumber} cho khách ${guestName}?`)) {
      return;
    }

    startTransition(async () => {
      const res = await checkoutStayAction(stayId, currentBranchId);
      if (res.ok) {
        toast.success(`Đã hoàn tất trả phòng ${roomNumber}!`);
        setActiveStayList((prev) => prev.filter((s) => s.id !== stayId));
      } else {
        toast.error(res.error.message);
      }
    });
  };

  const handleCancel = (stayId: string, roomNumber: string) => {
    const reason = prompt(`Nhập lý do hủy lượt ở phòng ${roomNumber} (tối thiểu 5 ký tự):`);
    if (!reason) return;

    if (reason.trim().length < 5) {
      toast.error('Lý do hủy phải có tối thiểu 5 ký tự!');
      return;
    }

    startTransition(async () => {
      const res = await cancelStayAction(stayId, currentBranchId, reason);
      if (res.ok) {
        toast.success(`Đã hủy lượt ở phòng ${roomNumber}!`);
        setActiveStayList((prev) => prev.filter((s) => s.id !== stayId));
      } else {
        toast.error(res.error.message);
      }
    });
  };

  const overdueCount = activeStayList.filter((s) => s.isOverdue).length;

  return (
    <div className="space-y-4">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Phòng đang có khách</CardDescription>
            <CardTitle className="text-2xl font-bold text-primary">
              {activeStayList.length} Phòng
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Tổng số khách lưu trú</CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">
              {activeStayList.reduce((sum, s) => sum + s.guestCount, 0)} Khách
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Quá hạn giờ trả phòng</CardDescription>
            <CardTitle className={`text-2xl font-bold ${overdueCount > 0 ? 'text-amber-500' : 'text-emerald-600'}`}>
              {overdueCount} Phòng
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Main Stays Table */}
      <Card className="border-border/60 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/40">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Danh Sách Khách Đang Ở ({branchName})
              </CardTitle>
              <CardDescription className="text-xs">
                Cập nhật thời gian thực, phím tắt: [C] trả phòng, [E] chỉnh sửa
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="text-xs bg-muted/40">
                <TableHead className="w-24">Số phòng</TableHead>
                <TableHead>Khách đại diện</TableHead>
                <TableHead>Số người</TableHead>
                <TableHead>Giờ nhận phòng</TableHead>
                <TableHead>Dự kiến trả</TableHead>
                <TableHead>Kênh nguồn</TableHead>
                <TableHead>Tình trạng</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeStayList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-xs text-muted-foreground">
                    Hiện không có lượt ở nào tại cơ sở này
                  </TableCell>
                </TableRow>
              ) : (
                activeStayList.map((s) => (
                  <TableRow key={s.id} className="text-xs hover:bg-muted/40">
                    <TableCell className="font-bold text-foreground">
                      <div className="flex items-center gap-1.5">
                        <DoorClosed className="h-4 w-4 text-primary" />
                        <span className="text-sm">Phòng {s.roomNumber}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground block">{s.roomType}</span>
                    </TableCell>

                    <TableCell>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">{s.primaryGuestName}</span>
                          {s.tierName && (
                            <Badge
                              variant="default"
                              className={`text-[9px] py-0 px-1 font-bold ${
                                s.tierName === 'Vàng'
                                  ? 'bg-yellow-500 text-black'
                                  : s.tierName === 'Bạc'
                                  ? 'bg-slate-400 text-white'
                                  : 'bg-amber-700 text-white'
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

                    <TableCell className="font-medium text-muted-foreground">
                      {s.guestCount} khách
                    </TableCell>

                    <TableCell className="text-muted-foreground font-mono">
                      {s.checkInAt.replace('T', ' ').slice(0, 16)}
                    </TableCell>

                    <TableCell className="font-mono">
                      <span className={s.isOverdue ? 'text-destructive font-bold' : 'text-foreground'}>
                        {s.expectedCheckOutAt.replace('T', ' ').slice(0, 16)}
                      </span>
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {s.sourceChannelName}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      {s.isOverdue ? (
                        <Badge variant="destructive" className="text-[10px] animate-pulse">
                          Quá giờ trả
                        </Badge>
                      ) : (
                        <Badge variant="default" className="text-[10px] bg-emerald-600 hover:bg-emerald-600">
                          Đang ở
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCheckout(s.id, s.roomNumber, s.primaryGuestName)}
                          disabled={isPending}
                          className="h-7 text-xs font-semibold px-2.5 text-primary border-primary/40 hover:bg-primary/10"
                        >
                          <LogOut className="h-3.5 w-3.5 mr-1" />
                          Trả phòng
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancel(s.id, s.roomNumber)}
                          disabled={isPending}
                          className="h-7 text-xs px-2 text-muted-foreground hover:text-destructive"
                          title="Hủy lượt ở (trong 6h)"
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
