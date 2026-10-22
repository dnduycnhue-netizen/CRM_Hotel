'use client';

import React, { useState, useTransition, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/shared/ui';
import { Button } from '@/shared/ui';
import { Input } from '@/shared/ui';
import { Label } from '@/shared/ui';
import { Badge } from '@/shared/ui';
import { Switch } from '@/shared/ui';
import { Checkbox } from '@/shared/ui';
import {
  lookupGuestAction,
  checkInGuestAction,
  type GuestLookupResult,
} from '../actions';
import { classifyQuery } from '../domain/query-classifier';
import { normalizeFullName, normalizeVnPhone } from '../domain/normalize';
import {
  UserCheck,
  Search,
  Sparkles,
  Phone,
  CreditCard,
  Building,
  Calendar,
  AlertTriangle,
  History,
  FileText,
  Percent,
  CheckCircle2,
  Loader2,
  DoorClosed,
  Crown,
  ShieldCheck,
  Check,
  BedDouble,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';

interface CheckInFormProps {
  currentBranchId: string;
  branchName: string;
  rooms: Array<{
    id: string;
    number: string;
    roomType: string | null;
    isOccupied?: boolean;
    isBlocked?: boolean;
  }>;
}

export function CheckInForm({
  currentBranchId,
  branchName,
  rooms,
}: CheckInFormProps) {
  const [isPending, startTransition] = useTransition();
  const [isLookingUp, setIsLookingUp] = useState(false);

  // Form Fields
  const [queryValue, setQueryValue] = useState('');
  const [detectedKind, setDetectedKind] = useState<string>('phone');
  const [guestId, setGuestId] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [docNumber, setDocNumber] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [sourceChannel, setSourceChannel] = useState('walk_in');
  const [expectedCheckOut, setExpectedCheckOut] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0] + 'T12:00';
  });

  // Manager backdated mode
  const [isBackdated, setIsBackdated] = useState(false);
  const [actualCheckIn, setActualCheckIn] = useState('');
  const [actualCheckOut, setActualCheckOut] = useState('');

  // Blacklist
  const [blacklistAck, setBlacklistAck] = useState(false);

  // Guest 360 preview data
  const [guestData, setGuestData] = useState<GuestLookupResult | null>(null);

  // Auto classify and lookup
  useEffect(() => {
    if (!queryValue || queryValue.length < 9) {
      return;
    }

    const { kind, cleanValue } = classifyQuery(queryValue);
    setDetectedKind(kind);

    if (kind === 'phone' || kind === 'cccd' || kind === 'passport') {
      const timer = setTimeout(async () => {
        setIsLookingUp(true);
        const res = await lookupGuestAction(currentBranchId, kind, cleanValue);
        setIsLookingUp(false);

        if (res.ok && res.data) {
          const g = res.data;
          setGuestData(g);
          setGuestId(g.guestId);
          setFullName(g.fullName);
          setGender((g.gender as any) || 'male');
          if (g.dob) setDob(g.dob);
          if (g.phone) setPhone(g.phone);
          if (g.docNumberMasked) setDocNumber(g.docNumberMasked);
          toast.success(`Nhận diện khách cũ: ${g.fullName} (${g.totalStays} lượt ở)`);
        } else {
          // New guest
          if (kind === 'phone') setPhone(cleanValue);
          if (kind === 'cccd') setDocNumber(cleanValue);
          setGuestData(null);
          setGuestId(null);
        }
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [queryValue, currentBranchId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRoomId) {
      toast.error('Vui lòng chọn số phòng nhận');
      return;
    }

    if (!fullName) {
      toast.error('Vui lòng nhập họ và tên khách');
      return;
    }

    if (guestData?.hasBlacklist && !blacklistAck) {
      toast.error('Khách có cảnh báo vi phạm. Vui lòng tick xác nhận đã đọc!');
      return;
    }

    startTransition(async () => {
      const res = await checkInGuestAction({
        branchId: currentBranchId,
        roomId: selectedRoomId,
        guestId: guestId || undefined,
        fullName: normalizeFullName(fullName),
        gender,
        dob: dob || undefined,
        phone: phone ? normalizeVnPhone(phone) : undefined,
        documentType: detectedKind === 'passport' ? 'passport' : 'cccd',
        documentNumber: docNumber || undefined,
        sourceChannelCode: sourceChannel,
        expectedCheckOutAt: expectedCheckOut,
        isBackdated,
        actualCheckInAt: actualCheckIn || undefined,
        actualCheckOutAt: actualCheckOut || undefined,
        blacklistAck,
      });

      if (res.ok) {
        toast.success(`Check-in thành công cho khách ${fullName}!`);
        // Reset form
        setQueryValue('');
        setFullName('');
        setPhone('');
        setDocNumber('');
        setGuestData(null);
        setGuestId(null);
        setSelectedRoomId('');
        setBlacklistAck(false);
      } else {
        toast.error(res.error.message || 'Lỗi khi thực hiện check-in');
      }
    });
  };

  // Group rooms by floor (extracted from room number, e.g. 701 -> Tầng 7)
  const roomsByFloor = useMemo(() => {
    const map = new Map<number, typeof rooms>();
    for (const r of rooms) {
      const floor = r.number.length >= 3 ? parseInt(r.number.slice(0, -2), 10) : 1;
      if (!map.has(floor)) map.set(floor, []);
      map.get(floor)!.push(r);
    }
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0]); // top floors first
  }, [rooms]);

  return (
    <div className="space-y-6">
      {/* Top Welcome & KPI Header Banner */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border/70 bg-gradient-to-r from-card via-card/90 to-card/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-md shadow-amber-500/20">
            <Building className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-foreground tracking-tight">
                Thủ Tục Check-in
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold text-[11px] border border-amber-500/25">
                {branchName}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Nhận diện hồ sơ khách cũ &lt; 300ms · Tự động áp dụng hạng VIP & giảm giá
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-muted/40 border border-border/60 text-right">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
              Phòng sẵn sàng
            </span>
            <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1">
              <BedDouble className="h-4 w-4" />
              {rooms.filter(r => !r.isOccupied && !r.isBlocked).length} / {rooms.length} phòng
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form Check-in */}
        <div className="lg:col-span-7 space-y-4">
          <form onSubmit={handleSubmit}>
            <Card className="border-border/70 shadow-xs rounded-2xl overflow-hidden">
              <CardHeader className="pb-3 border-b border-border/50 bg-card/60">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <UserCheck className="h-5 w-5 text-emerald-600" />
                      <span>Thông Tin Tiếp Nhận Khách</span>
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-0.5">
                      Điền thông tin và chọn phòng để hoàn tất thủ tục
                    </CardDescription>
                  </div>
                  {/* Backdated switch for managers */}
                  <div className="flex items-center gap-2 text-xs px-2.5 py-1 rounded-lg border border-border/60 bg-muted/30">
                    <Switch
                      id="backdated"
                      checked={isBackdated}
                      onCheckedChange={setIsBackdated}
                    />
                    <Label htmlFor="backdated" className="text-xs font-semibold cursor-pointer">
                      Nhập bù
                    </Label>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-5 pt-5">
                {/* 1. Quick Identifier Box */}
                <div className="p-3.5 rounded-xl border-2 border-amber-500/30 bg-amber-500/5 space-y-2">
                  <Label htmlFor="identity" className="text-xs font-bold flex items-center justify-between text-foreground">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      1. Ô Tra Cứu Nhanh (SĐT / CCCD 12 số / Passport) *
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400">
                      {isLookingUp ? 'Đang tìm...' : `Loại: ${detectedKind.toUpperCase()}`}
                    </span>
                  </Label>
                  <div className="relative">
                    {isLookingUp ? (
                      <Loader2 className="absolute left-3.5 top-3 h-4 w-4 animate-spin text-amber-500" />
                    ) : (
                      <Search className="absolute left-3.5 top-3 h-4 w-4 text-amber-500" />
                    )}
                    <Input
                      id="identity"
                      value={queryValue}
                      onChange={(e) => setQueryValue(e.target.value)}
                      placeholder="Nhập SĐT (VD: 0905123456) hoặc 12 số CCCD để nhận diện tự động..."
                      className="pl-10 h-10.5 text-sm font-bold tracking-wide border-amber-500/40 focus:border-amber-500 focus:ring-amber-500/20 rounded-xl bg-background shadow-xs"
                      autoFocus
                    />
                  </div>
                </div>

                {/* 2. Full Name & Gender & DOB */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-6 space-y-1.5">
                    <Label htmlFor="fullName" className="text-xs font-bold text-foreground">
                      Họ và tên khách *
                    </Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="NGUYỄN VĂN A"
                      className="h-9.5 text-xs uppercase font-bold rounded-xl"
                      required
                    />
                  </div>
                  <div className="sm:col-span-3 space-y-1.5">
                    <Label htmlFor="gender" className="text-xs font-semibold text-muted-foreground">
                      Giới tính
                    </Label>
                    <select
                      id="gender"
                      value={gender}
                      onChange={(e) => setGender(e.target.value as any)}
                      className="w-full h-9.5 rounded-xl border border-input bg-background px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    >
                      <option value="male">Nam (N)</option>
                      <option value="female">Nữ (U)</option>
                      <option value="other">Khác</option>
                    </select>
                  </div>
                  <div className="sm:col-span-3 space-y-1.5">
                    <Label htmlFor="dob" className="text-xs font-semibold text-muted-foreground">
                      Ngày sinh
                    </Label>
                    <Input
                      id="dob"
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="h-9.5 text-xs font-medium rounded-xl"
                    />
                  </div>
                </div>

                {/* 3. Phone & ID Card */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-6 space-y-1.5">
                    <Label htmlFor="phone" className="text-xs font-bold text-foreground">
                      Số điện thoại liên hệ
                    </Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0905xxxxxx"
                      className="h-9.5 text-xs font-mono font-semibold rounded-xl"
                    />
                  </div>
                  <div className="sm:col-span-6 space-y-1.5">
                    <Label htmlFor="docNumber" className="text-xs font-bold text-foreground">
                      Số CCCD / Hộ chiếu
                    </Label>
                    <Input
                      id="docNumber"
                      value={docNumber}
                      onChange={(e) => setDocNumber(e.target.value)}
                      placeholder="12 số CCCD hoặc mã Passport"
                      className="h-9.5 text-xs font-mono font-semibold rounded-xl"
                    />
                  </div>
                </div>

                {/* 4. Visual Room Selector (Hot Feature for UX!) */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="roomSelect" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <BedDouble className="h-4 w-4 text-emerald-600" />
                      <span>Chọn phòng nhận ({branchName}) *</span>
                    </Label>
                    <span className="text-[11px] text-muted-foreground">
                      {selectedRoomId ? 'Đã chọn phòng' : 'Click chọn trực tiếp ô phòng'}
                    </span>
                  </div>

                  {/* Quick-Pick Room Chips Grid */}
                  <div className="p-3 rounded-xl border border-border/70 bg-muted/20 max-h-48 overflow-y-auto space-y-2.5">
                    {roomsByFloor.map(([floor, floorRooms]) => (
                      <div key={floor} className="space-y-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                          Tầng {floor}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {floorRooms.map((r) => {
                            const isSelected = selectedRoomId === r.id;
                            const isOccupied = !!r.isOccupied;
                            const isBlocked = !!r.isBlocked;
                            const isUnavailable = isOccupied || isBlocked;

                            if (isUnavailable) {
                              return (
                                <button
                                  key={r.id}
                                  type="button"
                                  disabled
                                  title={isOccupied ? 'Phòng đang có khách ở' : 'Phòng đang khóa ngừng bán (OOO)'}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-not-allowed border flex items-center gap-1 shadow-2xs opacity-60 ${
                                    isBlocked
                                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                                      : 'bg-muted/40 border-border/50 text-muted-foreground'
                                  }`}
                                >
                                  <span className={`h-1.5 w-1.5 rounded-full ${isBlocked ? 'bg-rose-500' : 'bg-muted-foreground'}`} />
                                  <span>P.{r.number}</span>
                                  <span className="text-[9px] font-bold">({isBlocked ? 'OOO' : 'Ở'})</span>
                                </button>
                              );
                            }

                            return (
                              <button
                                key={r.id}
                                type="button"
                                onClick={() => setSelectedRoomId(r.id)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-xs ${
                                  isSelected
                                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 scale-105 ring-2 ring-emerald-400'
                                    : 'bg-card border border-border/70 text-foreground hover:border-emerald-500/50 hover:bg-emerald-500/10'
                                }`}
                              >
                                {isSelected ? (
                                  <Check className="h-3 w-3 stroke-[3]" />
                                ) : (
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                )}
                                <span>P.{r.number}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Dropdown fallback */}
                  <select
                    id="roomSelect"
                    value={selectedRoomId}
                    onChange={(e) => setSelectedRoomId(e.target.value)}
                    className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs font-bold text-primary focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    required
                  >
                    <option value="">-- Hoặc chọn từ danh sách --</option>
                    {rooms.map((r) => {
                      const isUnavailable = r.isOccupied || r.isBlocked;
                      return (
                        <option key={r.id} value={r.id} disabled={isUnavailable}>
                          Phòng {r.number} ({r.roomType || 'Tiêu chuẩn'}) {r.isOccupied ? '— [Đang có khách]' : r.isBlocked ? '— [Đang khóa OOO]' : '— [Sẵn sàng]'}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* 5. Source channel & Checkout Date */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
                  <div className="sm:col-span-6 space-y-1.5">
                    <Label htmlFor="sourceChannel" className="text-xs font-semibold text-muted-foreground">
                      Kênh nguồn khách *
                    </Label>
                    <select
                      id="sourceChannel"
                      value={sourceChannel}
                      onChange={(e) => setSourceChannel(e.target.value)}
                      className="w-full h-9.5 rounded-xl border border-input bg-background px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    >
                      <option value="walk_in">Khách vãng lai (Quầy lễ tân)</option>
                      <option value="direct_phone">Đặt qua hotline / Điện thoại</option>
                      <option value="ota_booking">Booking.com</option>
                      <option value="ota_agoda">Agoda</option>
                      <option value="ota_expedia">Expedia</option>
                      <option value="corporate">Hợp đồng công ty / Doanh nghiệp</option>
                    </select>
                  </div>

                  <div className="sm:col-span-6 space-y-1.5">
                    <Label htmlFor="checkoutTime" className="text-xs font-semibold text-muted-foreground">
                      Dự kiến trả phòng *
                    </Label>
                    <Input
                      id="checkoutTime"
                      type="datetime-local"
                      value={expectedCheckOut}
                      onChange={(e) => setExpectedCheckOut(e.target.value)}
                      className="h-9.5 text-xs font-semibold rounded-xl"
                      required
                    />
                  </div>
                </div>

                {/* Backdated Extra Fields */}
                {isBackdated && (
                  <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400">
                      <Clock className="h-4 w-4" />
                      <span>Nhập Bù Lượt Ở Quá Khứ (Quyền Quản Lý)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="actualIn" className="text-[11px] font-semibold">
                          Giờ vào thực tế *
                        </Label>
                        <Input
                          id="actualIn"
                          type="datetime-local"
                          value={actualCheckIn}
                          onChange={(e) => setActualCheckIn(e.target.value)}
                          className="h-8.5 text-xs font-mono rounded-lg"
                          required={isBackdated}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="actualOut" className="text-[11px] font-semibold">
                          Giờ ra thực tế (Nếu đã trả)
                        </Label>
                        <Input
                          id="actualOut"
                          type="datetime-local"
                          value={actualCheckOut}
                          onChange={(e) => setActualCheckOut(e.target.value)}
                          className="h-8.5 text-xs font-mono rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Blacklist Warning Accordion */}
                {guestData?.hasBlacklist && (
                  <div className="rounded-xl border-2 border-rose-500/40 bg-rose-500/10 p-4 space-y-2.5">
                    <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs">
                      <AlertTriangle className="h-4 w-4" />
                      <span>CẢNH BÁO VI PHẠM / SỰ CỐ TỪNG GÂY RA</span>
                    </div>
                    <p className="text-xs text-rose-700 dark:text-rose-300 font-medium">
                      {guestData.blacklistReason || 'Khách hàng có lịch sử làm hư hỏng tài sản hoặc vi phạm nội quy chuỗi.'}
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <Checkbox
                        id="ack"
                        checked={blacklistAck}
                        onCheckedChange={(c) => setBlacklistAck(!!c)}
                      />
                      <Label htmlFor="ack" className="text-xs font-bold text-rose-700 dark:text-rose-300 cursor-pointer">
                        Tôi xác nhận đã đọc cảnh báo và chịu trách nhiệm tiếp nhận khách này
                      </Label>
                    </div>
                  </div>
                )}

                {/* Actions Footer */}
                <div className="pt-4 flex items-center justify-between border-t border-border/50">
                  <span className="text-[11px] text-muted-foreground hidden sm:inline">
                    Phím tắt: <kbd className="font-bold text-foreground bg-muted px-1.5 py-0.5 rounded border border-border/60">Enter</kbd> Lưu check-in
                  </span>
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <Button
                      type="submit"
                      className="h-10 px-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-600/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                      disabled={isPending}
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Đang lưu hồ sơ...
                        </>
                      ) : isBackdated ? (
                        'Lưu Lượt Ở Quá Khứ'
                      ) : (
                        'Hoàn Tất Check-in'
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>

        {/* Right Column: Guest 360 Card */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-border/70 shadow-xs rounded-2xl bg-card/70 backdrop-blur-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/50 bg-gradient-to-r from-card to-amber-500/5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Crown className="h-4 w-4 text-amber-500" />
                  <span>Hồ Sơ Khách 360° (Guest 360)</span>
                </CardTitle>
                {guestData ? (
                  <Badge
                    variant="default"
                    className={`text-[10px] font-bold px-2 py-0.5 shadow-xs ${
                      guestData.tierName === 'Vàng'
                        ? 'bg-amber-500 text-black font-extrabold'
                        : guestData.tierName === 'Bạc'
                        ? 'bg-slate-400 text-white'
                        : 'bg-amber-800 text-white'
                    }`}
                  >
                    Hạng {guestData.tierName || 'Đồng'}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] border-border/70 bg-muted/40">
                    Khách mới
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-4 text-xs">
              {guestData ? (
                <div className="space-y-4">
                  {/* Guest Identity & Discount Highlights */}
                  <div className="rounded-xl bg-card p-4 border border-border/70 shadow-xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-base text-foreground">{guestData.fullName}</span>
                      <span className="font-mono text-muted-foreground text-xs font-semibold">{guestData.phone}</span>
                    </div>

                    {guestData.discountPct > 0 && (
                      <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 rounded-lg font-bold text-xs">
                        <Percent className="h-4 w-4" />
                        <span>Được áp dụng ưu đãi giảm giá {guestData.discountPct}%!</span>
                      </div>
                    )}
                  </div>

                  {/* Stays Statistics */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-card p-3.5 border border-border/60 shadow-2xs space-y-1">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-semibold">
                        <History className="h-3 w-3 text-amber-500" />
                        Lượt ở toàn chuỗi
                      </span>
                      <span className="text-2xl font-black text-primary block">
                        {guestData.totalStays} lần
                      </span>
                    </div>

                    <div className="rounded-xl bg-card p-3.5 border border-border/60 shadow-2xs space-y-1">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-semibold">
                        <Building className="h-3 w-3 text-amber-500" />
                        Lần ở gần nhất
                      </span>
                      <span className="text-xs font-bold text-foreground block truncate">
                        {guestData.lastStayBranchName || 'Boutique'}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {guestData.lastStayDate || 'Gần đây'}
                      </span>
                    </div>
                  </div>

                  {/* Recent Preferences & Notes */}
                  <div className="rounded-xl bg-card p-3.5 border border-border/60 shadow-2xs space-y-2">
                    <span className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                      <FileText className="h-3.5 w-3.5 text-amber-500" />
                      Ghi chú & Sở thích đặc biệt:
                    </span>
                    {guestData.recentNotes && guestData.recentNotes.length > 0 ? (
                      <ul className="space-y-1.5 pl-4 list-disc text-muted-foreground text-[11px]">
                        {guestData.recentNotes.map((note, idx) => (
                          <li key={idx} className="font-medium">{note}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[11px] text-muted-foreground italic">
                        Chưa có ghi chú đặc biệt nào.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5">
                  <div className="rounded-xl border border-dashed border-border/80 p-8 text-center text-muted-foreground space-y-2.5 bg-muted/10">
                    <div className="h-12 w-12 rounded-full bg-amber-500/10 text-amber-600 mx-auto flex items-center justify-center">
                      <UserCheck className="h-6 w-6" />
                    </div>
                    <p className="font-bold text-sm text-foreground">Sẵn sàng nhận diện khách quen</p>
                    <p className="text-[11px] text-muted-foreground max-w-xs mx-auto leading-relaxed">
                      Nhập số điện thoại hoặc số CCCD vào ô số 1. Hệ thống sẽ tự động đối soát hồ sơ 8 cơ sở ngay tức thì.
                    </p>
                  </div>

                  {/* Loyalty policy card */}
                  <div className="rounded-xl bg-card p-3.5 border border-border/60 shadow-2xs space-y-2.5">
                    <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                      <Crown className="h-3.5 w-3.5 text-amber-500" />
                      Chính sách ưu đãi hạng hội viên chuỗi:
                    </span>
                    <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                      <div className="p-2.5 rounded-lg bg-muted/40 border border-border/40">
                        <span className="font-bold block text-foreground">Đồng</span>
                        <span className="text-[10px] text-muted-foreground">≥ 2 lần · -3%</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
                        <span className="font-bold block text-amber-700 dark:text-amber-400">Bạc</span>
                        <span className="text-[10px] text-muted-foreground">≥ 5 lần · -5%</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                        <span className="font-bold block text-yellow-700 dark:text-yellow-400">Vàng</span>
                        <span className="text-[10px] text-muted-foreground">≥ 10 lần · -10%</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
