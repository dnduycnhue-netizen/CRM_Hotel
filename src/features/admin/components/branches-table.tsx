'use client';

import type { Branch } from '../domain/types';
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
import { Building2, Phone, Clock, ExternalLink, Edit } from 'lucide-react';

interface BranchesTableProps {
  branches: Branch[];
}

export function BranchesTable({ branches }: BranchesTableProps) {
  const totalRooms = branches.reduce((sum, b) => sum + (b.roomsCount || 0), 0);

  return (
    <div className="space-y-4">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Tổng cơ sở chuỗi</CardDescription>
            <CardTitle className="text-2xl font-bold text-primary">{branches.length} Khách sạn</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Tổng số phòng kinh doanh</CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">{totalRooms} Phòng</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Quy định giờ nhận / trả phòng</CardDescription>
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
              <CardTitle className="text-base font-semibold">Danh sách 8 Cơ sở Khách sạn</CardTitle>
              <CardDescription className="text-xs">
                Cấu hình thông tin cơ sở, giờ cắt đêm và liên kết Google Review
              </CardDescription>
            </div>
            <Button size="sm" className="h-8 text-xs font-semibold">
              Thêm cơ sở mới
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
                        <span>{b.phone || 'Chưa cập nhật'}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate max-w-xs">{b.address}</p>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">{b.nightCutoff}</TableCell>
                  <TableCell className="font-mono">{b.defaultCheckoutTime}</TableCell>
                  <TableCell>
                    <Badge variant={b.isActive ? 'default' : 'outline'} className="text-[10px]">
                      {b.isActive ? 'Đang hoạt động' : 'Tạm ngưng'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
