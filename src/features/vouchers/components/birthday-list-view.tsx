"use client";

import {
  Cake,
  Calendar,
  CheckCircle,
  Gift,
  Phone,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UpcomingBirthdayGuest } from "../types";
import { RecordGreetingDialog } from "./record-greeting-dialog";

interface Props {
  initialBirthdays: UpcomingBirthdayGuest[];
  branches: Array<{ id: string; name: string }>;
  onRefresh?: () => void;
}

export function BirthdayListView({
  initialBirthdays,
  branches,
  onRefresh,
}: Props) {
  const [selectedDays, setSelectedDays] = useState<string>("30");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedGuestForGreeting, setSelectedGuestForGreeting] =
    useState<UpcomingBirthdayGuest | null>(null);
  const [greetingDialogOpen, setGreetingDialogOpen] = useState(false);

  // Lọc dữ liệu theo bộ lọc client-side
  const filteredGuests = initialBirthdays.filter((guest) => {
    // Lọc theo ngày
    const maxDays = Number(selectedDays);
    if (guest.days_until > maxDays) return false;

    // Lọc theo tìm kiếm tên hoặc số điện thoại
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = guest.full_name.toLowerCase().includes(q);
      const matchPhone = guest.phone ? guest.phone.includes(q) : false;
      if (!matchName && !matchPhone) return false;
    }

    return true;
  });

  return (
    <div className="space-y-4">
      {/* Bộ lọc thanh công cụ */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-slate-900 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-lg bg-pink-500/10 text-pink-400">
            <Cake className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">
              Danh sách Sinh nhật khách hàng ({filteredGuests.length})
            </h3>
            <p className="text-xs text-slate-400">
              Theo dõi và chủ động gửi thiệp mừng, set quà & voucher độc quyền
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Bộ lọc khoảng ngày */}
          <div className="flex items-center gap-1.5">
            <Select
              value={selectedDays}
              onValueChange={(val) => val && setSelectedDays(val)}
            >
              <SelectTrigger className="w-[140px] bg-slate-800 border-slate-700 text-slate-200 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700 text-slate-200 text-xs">
                <SelectItem value="0">Hôm nay</SelectItem>
                <SelectItem value="7">7 ngày tới</SelectItem>
                <SelectItem value="14">14 ngày tới</SelectItem>
                <SelectItem value="30">30 ngày tới</SelectItem>
                <SelectItem value="60">60 ngày tới</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Ô tìm kiếm nhanh */}
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm tên hoặc SĐT..."
            className="h-8 px-3 text-xs rounded-md bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Danh sách thẻ sinh nhật */}
      {filteredGuests.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/50 border border-slate-800 rounded-xl space-y-3">
          <Cake className="w-10 h-10 text-slate-600 mx-auto" />
          <h4 className="text-sm font-medium text-slate-300">
            Không có khách hàng nào có sinh nhật trong khoảng thời gian đã chọn
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Hãy thử mở rộng khoảng thời gian xem (ví dụ: 30 ngày hoặc 60 ngày
            tới) để lên kế hoạch chuẩn bị quà tặng.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredGuests.map((guest) => {
            const isToday = guest.days_until === 0;
            const isSoon = guest.days_until <= 3 && !isToday;

            return (
              <Card
                key={guest.guest_id}
                className={`p-4 bg-slate-900 border transition-all ${
                  isToday
                    ? "border-pink-500/60 shadow-lg shadow-pink-500/10"
                    : isSoon
                      ? "border-amber-500/40"
                      : "border-slate-800 hover:border-slate-700"
                }`}
              >
                {/* Header card */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                        isToday
                          ? "bg-pink-500 text-white animate-pulse"
                          : "bg-slate-800 text-slate-300 border border-slate-700"
                      }`}
                    >
                      {guest.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
                        {guest.full_name}
                      </h4>
                      <p className="text-xs text-slate-400">
                        {guest.phone || "Chưa có SĐT"}
                      </p>
                    </div>
                  </div>

                  {/* Badge đếm ngược ngày */}
                  {isToday ? (
                    <Badge className="bg-pink-500 text-white font-semibold text-[11px] gap-1 px-2.5 py-0.5">
                      <Sparkles className="w-3 h-3" /> Hôm nay!
                    </Badge>
                  ) : isSoon ? (
                    <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] px-2">
                      Còn {guest.days_until} ngày
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-slate-400 border-slate-700 text-[11px] px-2"
                    >
                      Sau {guest.days_until} ngày
                    </Badge>
                  )}
                </div>

                {/* Thông tin sinh nhật & Hạng VIP */}
                <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1 text-slate-400">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      Sinh nhật:
                    </span>
                    <span className="font-medium text-slate-200">
                      {guest.dob} (Tuổi {guest.age})
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Hạng thành viên:</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                      {guest.tier_name || "Thành viên"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Lịch sử lưu trú:</span>
                    <span className="text-slate-300 font-medium">
                      {guest.total_stays} lượt ở
                    </span>
                  </div>

                  {/* Quyền riêng tư theo Nghị định 13/2023 */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400">
                      Quyền nhận tin (NĐ 13):
                    </span>
                    {guest.marketing_consent ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                        <CheckCircle className="w-3 h-3" /> Đã đồng ý
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-amber-400">
                        <ShieldAlert className="w-3 h-3" /> Chưa đồng ý
                      </span>
                    )}
                  </div>
                </div>

                {/* Trạng thái chăm sóc & Lời chúc */}
                <div className="mt-3 p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs">
                  {guest.greeting_status === "sent" ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-medium text-[11px]">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Đã chúc mừng sinh nhật năm nay</span>
                      </div>
                      {guest.greeting_voucher_code && (
                        <div className="text-[11px] text-slate-300 flex items-center gap-1">
                          <Gift className="w-3 h-3 text-pink-400" />
                          <span>Voucher tặng: </span>
                          <span className="font-mono text-pink-400 font-semibold">
                            {guest.greeting_voucher_code}
                          </span>
                        </div>
                      )}
                      {guest.greeting_gift && (
                        <p className="text-[11px] text-slate-400">
                          Quà: {guest.greeting_gift}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[11px]">
                        Chưa ghi nhận chăm sóc năm nay
                      </span>
                    </div>
                  )}
                </div>

                {/* Nút hành động */}
                <div className="mt-3 pt-2">
                  <Button
                    size="sm"
                    variant={
                      guest.greeting_status === "sent" ? "outline" : "default"
                    }
                    onClick={() => {
                      setSelectedGuestForGreeting(guest);
                      setGreetingDialogOpen(true);
                    }}
                    className={`w-full h-8 text-xs gap-1.5 ${
                      guest.greeting_status === "sent"
                        ? "border-slate-700 text-slate-300 hover:bg-slate-800"
                        : "bg-pink-600 hover:bg-pink-500 text-white"
                    }`}
                  >
                    <Cake className="w-3.5 h-3.5" />
                    {guest.greeting_status === "sent"
                      ? "Cập nhật lời chúc / Tặng thêm"
                      : "Gửi lời chúc & Tặng voucher"}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal gửi lời chúc & tặng voucher */}
      {selectedGuestForGreeting && (
        <RecordGreetingDialog
          open={greetingDialogOpen}
          onOpenChange={setGreetingDialogOpen}
          guest={selectedGuestForGreeting}
          branches={branches}
          onSuccess={() => {
            onRefresh?.();
          }}
        />
      )}
    </div>
  );
}
