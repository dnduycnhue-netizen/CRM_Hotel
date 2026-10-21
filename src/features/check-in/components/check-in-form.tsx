'use client';

import React, { useState, useTransition, useEffect } from 'react';
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
} from 'lucide-react';
import { toast } from 'sonner';

interface CheckInFormProps {
  currentBranchId: string;
  branchName: string;
  rooms: Array<{ id: string; number: string; roomType: string | null }>;
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
        setBlacklistAck(false);
      } else {
        toast.error(res.error.message || 'Lỗi khi thực hiện check-in');
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Column: Form Check-in */}
      <div className="lg:col-span-7 space-y-4">
        <form onSubmit={handleSubmit}>
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-primary" />
                    Thủ Tục Nhận Phòng ({branchName})
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Tra cứu &lt; 300ms, tự động liên kết thẻ thành viên và ưu đãi
                  </CardDescription>
                </div>
                {/* Backdated switch for managers */}
                <div className="flex items-center gap-2 text-xs">
                  <Switch
                    id="backdated"
                    checked={isBackdated}
                    onCheckedChange={setIsBackdated}
                  />
                  <Label htmlFor="backdated" className="text-xs font-medium cursor-pointer">
                    Nhập bù quá khứ
                  </Label>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-4">
              {/* 1. Quick Identifier Box */}
              <div className="space-y-1.5">
                <Label htmlFor="identity" className="text-xs font-bold flex items-center justify-between">
                  <span>1. Ô định danh (SĐT / CCCD 12 số / Passport) *</span>
                  <span className="text-[11px] text-primary font-medium">
                    {isLookingUp ? 'Đang tra cứu dữ liệu...' : `Nhận dạng: ${detectedKind.toUpperCase()}`}
                  </span>
                </Label>
                <div className="relative">
                  {isLookingUp ? (
                    <Loader2 className="absolute left-3 top-2.5 h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  )}
                  <Input
                    id="identity"
                    value={queryValue}
                    onChange={(e) => setQueryValue(e.target.value)}
                    placeholder="Gõ SĐT (VD: 0905123456) hoặc CCCD 12 số..."
                    className="pl-9 h-10 text-sm font-semibold tracking-wide"
                    autoFocus
                  />
                </div>
              </div>

              {/* 2. Full Name & Gender & DOB */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-6 space-y-1.5">
                  <Label htmlFor="fullName" className="text-xs font-semibold">
                    Họ và tên khách *
                  </Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="NGUYEN VAN A"
                    className="h-9 text-xs uppercase font-medium"
                    required
                  />
                </div>
                <div className="sm:col-span-3 space-y-1.5">
                  <Label htmlFor="gender" className="text-xs font-semibold">
                    Giới tính
                  </Label>
                  <select
                    id="gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs font-medium"
                  >
                    <option value="male">Nam (N)</option>
                    <option value="female">Nữ (U)</option>
                    <option value="other">Khác</option>
                  </select>
                </div>
                <div className="sm:col-span-3 space-y-1.5">
                  <Label htmlFor="dob" className="text-xs font-semibold">
                    Ngày sinh
                  </Label>
                  <Input
                    id="dob"
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="h-9 text-xs font-medium"
                  />
                </div>
              </div>

              {/* 3. Phone & ID Card */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-6 space-y-1.5">
                  <Label htmlFor="phone" className="text-xs font-semibold">
                    Số điện thoại liên hệ
                  </Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0905xxxxxx"
                    className="h-9 text-xs font-mono font-medium"
                  />
                </div>
                <div className="sm:col-span-6 space-y-1.5">
                  <Label htmlFor="docNumber" className="text-xs font-semibold">
                    Số CCCD / Passport
                  </Label>
                  <Input
                    id="docNumber"
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                    placeholder="12 số CCCD hoặc Mã hộ chiếu"
                    className="h-9 text-xs font-mono font-medium"
                  />
                </div>
              </div>

              {/* 4. Room selection & Source channel & Checkout Date */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
                <div className="sm:col-span-4 space-y-1.5">
                  <Label htmlFor="roomSelect" className="text-xs font-bold text-foreground">
                    Phòng nhận *
                  </Label>
                  <select
                    id="roomSelect"
                    value={selectedRoomId}
                    onChange={(e) => setSelectedRoomId(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-2.5 text-xs font-bold text-primary"
                    required
                  >
                    <option value="">-- Chọn phòng trống --</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        Phòng {r.number} ({r.roomType || 'Standard'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-4 space-y-1.5">
                  <Label htmlFor="sourceChannel" className="text-xs font-semibold">
                    Nguồn khách *
                  </Label>
                  <select
                    id="sourceChannel"
                    value={sourceChannel}
                    onChange={(e) => setSourceChannel(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-2.5 text-xs font-medium"
                  >
                    <option value="walk_in">Khách vãng lai (Quầy)</option>
                    <option value="direct_phone">Đặt qua điện thoại</option>
                    <option value="ota_booking">Booking.com</option>
                    <option value="ota_agoda">Agoda</option>
                    <option value="ota_expedia">Expedia</option>
                    <option value="corporate">Công ty / Đối tác hợp đồng</option>
                  </select>
                </div>

                <div className="sm:col-span-4 space-y-1.5">
                  <Label htmlFor="checkoutTime" className="text-xs font-semibold">
                    Dự kiến trả phòng *
                  </Label>
                  <Input
                    id="checkoutTime"
                    type="datetime-local"
                    value={expectedCheckOut}
                    onChange={(e) => setExpectedCheckOut(e.target.value)}
                    className="h-9 text-xs font-medium"
                    required
                  />
                </div>
              </div>

              {/* Backdated Extra Fields */}
              {isBackdated && (
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 space-y-2 animate-in fade-in">
                  <span className="text-xs font-bold text-amber-800 dark:text-amber-400 block">
                    Thông tin thời gian thực tế nhập bù (Dành cho Quản lý):
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[11px]">Giờ nhận phòng thực tế</Label>
                      <Input
                        type="datetime-local"
                        value={actualCheckIn}
                        onChange={(e) => setActualCheckIn(e.target.value)}
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Giờ trả phòng thực tế</Label>
                      <Input
                        type="datetime-local"
                        value={actualCheckOut}
                        onChange={(e) => setActualCheckOut(e.target.value)}
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Blacklist Warning Acknowledgement */}
              {guestData?.hasBlacklist && (
                <div className="rounded-lg bg-destructive/15 border border-destructive p-3.5 space-y-2 animate-in shake">
                  <div className="flex items-center gap-2 text-destructive font-bold text-xs">
                    <AlertTriangle className="h-4 w-4" />
                    <span>CẢNH BÁO: KHÁCH CÓ CỜ VI PHẠM (BLACKLIST)</span>
                  </div>
                  <p className="text-xs text-destructive/90">
                    Lý do: {guestData.blacklistReason || 'Gây ồn ào, hút thuốc trong phòng không hút thuốc.'}
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <Checkbox
                      id="ack"
                      checked={blacklistAck}
                      onCheckedChange={(c) => setBlacklistAck(!!c)}
                    />
                    <Label htmlFor="ack" className="text-xs font-bold text-destructive cursor-pointer">
                      Tôi xác nhận đã đọc cảnh báo và chịu trách nhiệm tiếp nhận khách này
                    </Label>
                  </div>
                </div>
              )}

              {/* Actions Footer */}
              <div className="pt-3 flex items-center justify-between border-t border-border/40">
                <span className="text-[11px] text-muted-foreground">
                  Phím tắt: <kbd className="font-semibold text-primary">Enter</kbd> Lưu check-in
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="submit"
                    className="h-9 px-6 text-xs font-bold shadow-md"
                    disabled={isPending}
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang lưu...
                      </>
                    ) : isBackdated ? (
                      'Lưu lượt ở đã qua'
                    ) : (
                      'Hoàn tất Check-in'
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
        <Card className="border-border/60 shadow-sm bg-muted/20">
          <CardHeader className="pb-3 border-b border-border/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                Hồ Sơ Khách 360° (Guest 360)
              </CardTitle>
              {guestData ? (
                <Badge
                  variant="default"
                  className={`text-[10px] font-bold ${
                    guestData.tierName === 'Vàng'
                      ? 'bg-yellow-500 text-black'
                      : guestData.tierName === 'Bạc'
                      ? 'bg-slate-400 text-white'
                      : 'bg-amber-700 text-white'
                  }`}
                >
                  Hạng {guestData.tierName || 'Đồng'}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px]">
                  Khách mới
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-4 text-xs">
            {guestData ? (
              <div className="space-y-4">
                {/* Guest Identity & Discount Highlights */}
                <div className="rounded-lg bg-card p-3.5 border border-border/60 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-foreground">{guestData.fullName}</span>
                    <span className="font-mono text-muted-foreground text-xs">{guestData.phone}</span>
                  </div>

                  {guestData.discountPct > 0 && (
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded font-bold text-xs">
                      <Percent className="h-3.5 w-3.5" />
                      <span>Được giảm giá {guestData.discountPct}% cho lượt này!</span>
                    </div>
                  )}
                </div>

                {/* Stays Statistics */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-card p-3 border border-border/40 space-y-1">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <History className="h-3 w-3" />
                      Lượt ở toàn chuỗi
                    </span>
                    <span className="text-xl font-bold text-primary block">
                      {guestData.totalStays} lần
                    </span>
                  </div>

                  <div className="rounded-lg bg-card p-3 border border-border/40 space-y-1">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Building className="h-3 w-3" />
                      Lần ở gần nhất
                    </span>
                    <span className="text-xs font-semibold text-foreground block truncate">
                      {guestData.lastStayBranchName || 'Boutique'}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {guestData.lastStayDate || '15/09/2026'}
                    </span>
                  </div>
                </div>

                {/* Recent Preferences & Notes */}
                <div className="rounded-lg bg-card p-3.5 border border-border/40 space-y-2">
                  <span className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    Ghi chú & Sở thích của khách:
                  </span>
                  {guestData.recentNotes && guestData.recentNotes.length > 0 ? (
                    <ul className="space-y-1.5 pl-4 list-disc text-muted-foreground text-[11px]">
                      {guestData.recentNotes.map((note, idx) => (
                        <li key={idx}>{note}</li>
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
              <div className="space-y-3">
                <div className="rounded-lg border border-dashed border-border/80 p-8 text-center text-muted-foreground space-y-2">
                  <UserCheck className="h-8 w-8 mx-auto opacity-30 text-primary" />
                  <p className="font-medium">Chưa có thông tin khách cũ.</p>
                  <p className="text-[11px] opacity-75">
                    Gõ số điện thoại hoặc CCCD ở ô số 1 để hệ thống tự động tìm kiếm.
                  </p>
                </div>

                <div className="rounded-lg bg-card p-3 border border-border/40 space-y-2">
                  <span className="font-bold text-xs text-foreground block">
                    Chính sách ưu đãi hạng thành viên:
                  </span>
                  <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                    <div className="p-2 rounded bg-muted/40 border border-border/30">
                      <span className="font-bold block text-foreground">Đồng</span>
                      <span className="text-muted-foreground">≥ 2 lần · -3%</span>
                    </div>
                    <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30">
                      <span className="font-bold block text-amber-700 dark:text-amber-400">Bạc</span>
                      <span className="text-muted-foreground">≥ 5 lần · -5%</span>
                    </div>
                    <div className="p-2 rounded bg-yellow-500/10 border border-yellow-500/30">
                      <span className="font-bold block text-yellow-700 dark:text-yellow-400">Vàng</span>
                      <span className="text-muted-foreground">≥ 10 lần · -10%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
