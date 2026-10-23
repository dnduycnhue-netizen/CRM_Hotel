"use client";

import { Building, DoorClosed, Filter } from "lucide-react";
import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui";
import type { Branch, RoomItem } from "../domain/types";

interface RoomsTableProps {
  rooms: RoomItem[];
  branches: Branch[];
}

export function RoomsTable({ rooms, branches }: RoomsTableProps) {
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [searchNumber, setSearchNumber] = useState<string>("");

  const filteredRooms = rooms.filter((r) => {
    const matchBranch =
      selectedBranch === "all" ||
      r.branchId === selectedBranch ||
      r.branchCode === selectedBranch;
    const matchNumber = !searchNumber || r.number.includes(searchNumber);
    return matchBranch && matchNumber;
  });

  return (
    <Card className="border-border/60 shadow-sm overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold">
              Danh mục 240 Phòng Toàn Chuỗi
            </CardTitle>
            <CardDescription className="text-xs">
              Quản lý số phòng, tầng và loại phòng theo từng khách sạn
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2.5 text-xs font-medium"
            >
              <option value="all">Tất cả 8 cơ sở (240 phòng)</option>
              {branches.map((b) => (
                <option key={b.id} value={b.code}>
                  {b.name} ({b.roomsCount || 0} phòng)
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Gõ số phòng..."
              value={searchNumber}
              onChange={(e) => setSearchNumber(e.target.value)}
              className="h-8 w-28 rounded-md border border-input bg-background px-2.5 text-xs"
            />
          </div>
        </div>
      </CardHeader>
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
            <TableRow className="text-xs bg-muted/40">
              <TableHead className="w-16">Cơ sở</TableHead>
              <TableHead>Số phòng</TableHead>
              <TableHead>Tầng</TableHead>
              <TableHead>Hạng / Loại phòng</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Hành động</TableHead>
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
              filteredRooms.map((r) => (
                <TableRow key={r.id} className="text-xs hover:bg-muted/40">
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="font-mono text-[10px] font-bold"
                    >
                      {r.branchCode}
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
                      {r.roomType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="default"
                      className="text-[10px] bg-emerald-600 hover:bg-emerald-600"
                    >
                      Hoạt động
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[11px] px-2 text-primary"
                    >
                      Sửa
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
