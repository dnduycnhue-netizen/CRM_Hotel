import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui';
import { Button } from '@/shared/ui';
import { Input } from '@/shared/ui';
import { Label } from '@/shared/ui';
import { Badge } from '@/shared/ui';
import {
  UserCheck,
  Search,
  Sparkles,
  Phone,
  CreditCard,
  Building,
  Calendar,
  AlertCircle,
} from 'lucide-react';

export const metadata = {
  title: 'Check-in | CRM Chuỗi Khách Sạn',
  description: 'Thủ tục nhận phòng nhanh cho khách lẻ, khách đoàn và khách quen',
};

export default function CheckInPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Title & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <UserCheck className="h-6 w-6 text-primary" />
            Check-in Khách Hàng
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Nhập SĐT hoặc CCCD để tự động điền hồ sơ khách cũ trong vòng &lt; 300ms
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs py-1 px-2.5 font-normal">
            Phím tắt: <kbd className="font-semibold text-primary">Tab</kbd> chuyển ô · <kbd className="font-semibold text-primary">Enter</kbd> Lưu
          </Badge>
        </div>
      </div>

      {/* Main Grid: 60% Form (Left) | 40% Guest Card (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold">Thông tin nhận phòng</CardTitle>
              <CardDescription className="text-xs">
                Mục tiêu hoàn tất check-in &lt; 30 giây cho khách mới, &lt; 10 giây cho khách cũ
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Định danh nhanh */}
              <div className="space-y-1.5">
                <Label htmlFor="identity" className="text-xs font-semibold flex items-center justify-between">
                  <span>1. Ô định danh (SĐT / CCCD / Passport)</span>
                  <span className="text-[11px] text-muted-foreground font-normal">Tự nhận diện định dạng</span>
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="identity"
                    placeholder="Gõ SĐT (09xx) hoặc 12 số CCCD / Passport..."
                    className="pl-9 h-10 text-sm font-medium"
                    autoFocus
                  />
                </div>
              </div>

              {/* Họ tên & Giới tính & Ngày sinh */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-6 space-y-1.5">
                  <Label htmlFor="fullName" className="text-xs">Họ và tên</Label>
                  <Input id="fullName" placeholder="NGUYEN VAN A" className="h-9 text-xs uppercase" />
                </div>
                <div className="sm:col-span-3 space-y-1.5">
                  <Label htmlFor="gender" className="text-xs">Giới tính</Label>
                  <select id="gender" className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs">
                    <option value="male">Nam</option>
                    <option value="female">Nữ</option>
                    <option value="other">Khác</option>
                  </select>
                </div>
                <div className="sm:col-span-3 space-y-1.5">
                  <Label htmlFor="dob" className="text-xs">Ngày sinh</Label>
                  <Input id="dob" placeholder="dd/mm/yyyy" className="h-9 text-xs" />
                </div>
              </div>

              {/* Số phòng & Nguồn khách & Ngày dự kiến trả */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
                <div className="sm:col-span-4 space-y-1.5">
                  <Label htmlFor="room" className="text-xs font-semibold">Phòng trống</Label>
                  <Input id="room" placeholder="VD: 201, 305..." className="h-9 text-xs font-medium" />
                </div>
                <div className="sm:col-span-4 space-y-1.5">
                  <Label htmlFor="source" className="text-xs font-semibold">Nguồn khách *</Label>
                  <select id="source" className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs">
                    <option value="walk_in">Khách vãng lai (Quầy)</option>
                    <option value="direct_phone">Đặt trước qua điện thoại</option>
                    <option value="ota_booking">Booking.com</option>
                    <option value="ota_agoda">Agoda</option>
                    <option value="corporate">Công ty / Đối tác hợp đồng</option>
                  </select>
                </div>
                <div className="sm:col-span-4 space-y-1.5">
                  <Label htmlFor="checkoutDate" className="text-xs font-semibold">Ngày trả phòng</Label>
                  <Input id="checkoutDate" type="date" className="h-9 text-xs" />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 flex items-center justify-between border-t border-border/40">
                <span className="text-[11px] text-muted-foreground">
                  Dữ liệu tự lưu nháp an toàn
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-9 text-xs">
                    Hủy bỏ (Esc)
                  </Button>
                  <Button size="sm" className="h-9 text-xs font-semibold px-5">
                    Lưu Check-in (Enter)
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Guest 360 Card Preview */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-border/60 shadow-sm bg-muted/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  Hồ Sơ Khách 360°
                </CardTitle>
                <Badge variant="secondary" className="text-[10px] uppercase font-semibold">
                  Chưa chọn khách
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Thông tin hồ sơ, lịch sử lưu trú và hạng thành viên toàn chuỗi
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="rounded-lg border border-dashed border-border/70 p-6 text-center text-muted-foreground space-y-2">
                <UserCheck className="h-8 w-8 mx-auto opacity-40" />
                <p>Nhập số điện thoại hoặc CCCD ở ô bên trái để tải thông tin khách cũ.</p>
              </div>

              {/* Tiêu chí phân hạng mẫu */}
              <div className="rounded-lg bg-card p-3 border border-border/40 space-y-2">
                <div className="font-semibold text-foreground text-xs">Quy định tích lũy hạng toàn chuỗi:</div>
                <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                  <div className="p-2 rounded bg-muted/50 border border-border/30">
                    <span className="font-bold text-slate-700 dark:text-slate-300 block">Đồng</span>
                    <span className="text-muted-foreground">≥ 2 lần · -3%</span>
                  </div>
                  <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30">
                    <span className="font-bold text-amber-700 dark:text-amber-400 block">Bạc</span>
                    <span className="text-muted-foreground">≥ 5 lần · -5%</span>
                  </div>
                  <div className="p-2 rounded bg-yellow-500/10 border border-yellow-500/30">
                    <span className="font-bold text-yellow-700 dark:text-yellow-400 block">Vàng</span>
                    <span className="text-muted-foreground">≥ 10 lần · -10%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
