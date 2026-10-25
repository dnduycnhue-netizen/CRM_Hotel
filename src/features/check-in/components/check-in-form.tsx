"use client";

import {
  AlertTriangle,
  BedDouble,
  Building,
  Check,
  Clock,
  Crown,
  FileText,
  History,
  Loader2,
  Mail,
  MessageSquare,
  Percent,
  Phone as PhoneIcon,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  Switch,
} from "@/shared/ui";
import {
  checkInGuestAction,
  type GuestLookupResult,
  lookupGuestAction,
} from "../actions";
import { normalizeFullName, normalizeVnPhone } from "../domain/normalize";
import { classifyQuery } from "../domain/query-classifier";

export interface FormCompanion {
  id: string;
  guestId?: string;
  fullName: string;
  gender: "male" | "female" | "other";
  dob: string;
  phone: string;
  documentType: "cccd" | "passport";
  documentNumber: string;
  isChild: boolean;
  countsForLoyalty: boolean;
  notes: string;
  isLookingUp?: boolean;
}

interface CheckInFormProps {
  currentBranchId: string;
  branchName: string;
  rooms: Array<{
    id: string;
    number: string;
    roomType: string | null;
    isOccupied?: boolean;
    isBlocked?: boolean;
    isCleaning?: boolean;
  }>;
  isCompanionsEnabled?: boolean;
  companionsCountDefault?: boolean;
}

export function CheckInForm({
  currentBranchId,
  branchName,
  rooms,
  isCompanionsEnabled = true,
  companionsCountDefault = true,
}: CheckInFormProps) {
  const [isPending, startTransition] = useTransition();
  const [isLookingUp, setIsLookingUp] = useState(false);

  // Form Fields
  const [queryValue, setQueryValue] = useState("");
  const [detectedKind, setDetectedKind] = useState<string>("phone");
  const [guestId, setGuestId] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other">("male");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [sourceChannel, setSourceChannel] = useState("walk_in");
  const [expectedCheckOut, setExpectedCheckOut] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return `${tomorrow.toISOString().split("T")[0]}T12:00`;
  });

  // Consent state (Nghị định 13/2023/NĐ-CP: Mặc định không tích sẵn)
  const [consents, setConsents] = useState<{
    zalo: boolean;
    sms: boolean;
    email: boolean;
    phone: boolean;
  }>({
    zalo: false,
    sms: false,
    email: false,
    phone: false,
  });

  // Companions
  const [companions, setCompanions] = useState<FormCompanion[]>([]);

  const handleAddCompanion = () => {
    if (companions.length >= 10) {
      toast.error("Tối đa 10 người đi cùng mỗi lượt ở");
      return;
    }
    setCompanions((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        fullName: "",
        gender: "male",
        dob: "",
        phone: "",
        documentType: "cccd",
        documentNumber: "",
        isChild: false,
        countsForLoyalty: companionsCountDefault,
        notes: "",
      },
    ]);
  };

  const handleUpdateCompanion = (id: string, patch: Partial<FormCompanion>) => {
    setCompanions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    );
  };

  const handleRemoveCompanion = (id: string) => {
    setCompanions((prev) => prev.filter((c) => c.id !== id));
  };

  const handleLookupCompanion = async (id: string, query: string) => {
    const clean = query.trim();
    if (clean.length < 4) {
      toast.error("Vui lòng nhập tối thiểu 4 số/chữ để tìm");
      return;
    }
    const { kind, cleanValue } = classifyQuery(clean);
    if (kind !== "phone" && kind !== "cccd" && kind !== "passport") {
      toast.error("Vui lòng nhập số điện thoại, CCCD hoặc hộ chiếu hợp lệ");
      return;
    }

    handleUpdateCompanion(id, { isLookingUp: true });
    try {
      const res = await lookupGuestAction(currentBranchId, kind, cleanValue);
      if (res.ok && res.data) {
        const g = res.data;
        handleUpdateCompanion(id, {
          guestId: g.guestId,
          fullName: g.fullName,
          gender: (g.gender as any) || "male",
          dob: g.dob || "",
          phone: g.phone || "",
          documentType: g.docType === "passport" ? "passport" : "cccd",
          documentNumber: g.docNumberMasked || "",
          isLookingUp: false,
        });
        toast.success(`Tìm thấy khách cũ: ${g.fullName}`);
      } else {
        handleUpdateCompanion(id, { isLookingUp: false });
        toast.info(
          "Không tìm thấy hồ sơ cũ, vui lòng nhập thông tin khách mới",
        );
      }
    } catch {
      handleUpdateCompanion(id, { isLookingUp: false });
    }
  };

  // Manager backdated mode
  const [isBackdated, setIsBackdated] = useState(false);
  const [actualCheckIn, setActualCheckIn] = useState("");
  const [actualCheckOut, setActualCheckOut] = useState("");

  // Blacklist
  const [blacklistAck, setBlacklistAck] = useState(false);

  // Guest 360 preview data
  const [guestData, setGuestData] = useState<GuestLookupResult | null>(null);
  const guestIdRef = useRef(guestId);
  guestIdRef.current = guestId;

  // Auto classify and lookup
  // biome-ignore lint/correctness/useExhaustiveDependencies: Only re-run lookup when queryValue or currentBranchId changes
  useEffect(() => {
    if (!queryValue || queryValue.trim().length < 4) {
      if (guestIdRef.current) {
        setFullName("");
        setDob("");
        setPhone("");
        setDocNumber("");
        setGender("male");
      }
      setGuestData(null);
      setGuestId(null);
      setIsLookingUp(false);
      setDetectedKind("unknown");
      return;
    }

    const { kind, cleanValue } = classifyQuery(queryValue);
    setDetectedKind(kind);

    if (kind !== "phone" && kind !== "cccd" && kind !== "passport") {
      setIsLookingUp(false);
      return;
    }

    let isCurrent = true;
    setIsLookingUp(true);

    const timer = setTimeout(async () => {
      try {
        const res = await lookupGuestAction(currentBranchId, kind, cleanValue);
        if (!isCurrent) return;

        if (res.ok && res.data) {
          const g = res.data;
          setGuestData(g);
          setGuestId(g.guestId);
          setFullName(g.fullName);
          setGender((g.gender as any) || "male");
          if (g.dob) setDob(g.dob);
          if (g.phone) setPhone(g.phone);
          if (g.docNumberMasked) setDocNumber(g.docNumberMasked);
          if (g.consents) {
            setConsents({
              zalo: !!g.consents.zalo,
              sms: !!g.consents.sms,
              email: !!g.consents.email,
              phone: !!g.consents.phone,
            });
          }
          toast.success(
            `Nhận diện khách cũ: ${g.fullName} (${g.totalStays} lượt ở)`,
          );
        } else {
          // New guest: reset auto-filled fields from previously recognized guest
          if (guestIdRef.current) {
            setFullName("");
            setDob("");
            setGender("male");
          }
          setConsents({ zalo: false, sms: false, email: false, phone: false });
          if (kind === "phone") {
            setPhone(cleanValue);
            setDocNumber("");
          }
          if (kind === "cccd") {
            setDocNumber(cleanValue);
            setPhone("");
          }
          setGuestData(null);
          setGuestId(null);
        }
      } catch (err) {
        console.error("Lỗi tra cứu thông tin khách:", err);
      } finally {
        if (isCurrent) {
          setIsLookingUp(false);
        }
      }
    }, 250);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [queryValue, currentBranchId]);

  // Restore draft on mount (US-21)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(
        `crm_checkin_draft_${currentBranchId}`,
      );
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.fullName || parsed.phone || parsed.docNumber) {
          if (parsed.fullName) setFullName(parsed.fullName);
          if (parsed.phone) setPhone(parsed.phone);
          if (parsed.docNumber) setDocNumber(parsed.docNumber);
          if (parsed.gender) setGender(parsed.gender);
          if (parsed.dob) setDob(parsed.dob);
          if (parsed.selectedRoomId) setSelectedRoomId(parsed.selectedRoomId);
          if (parsed.sourceChannel) setSourceChannel(parsed.sourceChannel);
          toast.info("Đã khôi phục dữ liệu khách đang nhập trước đó");
        }
      }
    } catch {
      // Ignore storage error
    }
  }, [currentBranchId]);

  // Persist draft on changes (US-21)
  useEffect(() => {
    try {
      if (fullName || phone || docNumber || selectedRoomId) {
        localStorage.setItem(
          `crm_checkin_draft_${currentBranchId}`,
          JSON.stringify({
            fullName,
            phone,
            docNumber,
            gender,
            dob,
            selectedRoomId,
            sourceChannel,
          }),
        );
      }
    } catch {
      // Ignore storage error
    }
  }, [
    fullName,
    phone,
    docNumber,
    gender,
    dob,
    selectedRoomId,
    sourceChannel,
    currentBranchId,
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRoomId) {
      toast.error("Vui lòng chọn số phòng nhận");
      return;
    }

    if (!fullName) {
      toast.error("Vui lòng nhập họ và tên khách");
      return;
    }

    if (guestData?.hasBlacklist && !blacklistAck) {
      toast.error("Khách có cảnh báo vi phạm. Vui lòng tick xác nhận đã đọc!");
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
        documentType: detectedKind === "passport" ? "passport" : "cccd",
        documentNumber:
          docNumber && !docNumber.includes("*") ? docNumber : undefined,
        sourceChannelCode: sourceChannel,
        expectedCheckOutAt: expectedCheckOut,
        isBackdated,
        actualCheckInAt: actualCheckIn || undefined,
        actualCheckOutAt: actualCheckOut || undefined,
        blacklistAck,
        consents,
        companions: companions.map((c) => ({
          guestId: c.guestId || undefined,
          fullName: normalizeFullName(c.fullName),
          gender: c.gender,
          dob: c.dob || undefined,
          nationality: "VN",
          phone: c.phone ? normalizeVnPhone(c.phone) : undefined,
          documentType: c.documentType,
          documentNumber:
            c.documentNumber && !c.documentNumber.includes("*")
              ? c.documentNumber
              : undefined,
          isChild: c.isChild,
          countsForLoyalty: c.countsForLoyalty,
          notes: c.notes || undefined,
        })),
      });

      if (res.ok) {
        toast.success(`Check-in thành công cho khách ${fullName}!`);
        try {
          localStorage.removeItem(`crm_checkin_draft_${currentBranchId}`);
        } catch {
          // Ignore storage error
        }
        // Reset form
        setQueryValue("");
        setFullName("");
        setPhone("");
        setDocNumber("");
        setGuestData(null);
        setGuestId(null);
        setSelectedRoomId("");
        setBlacklistAck(false);
        setCompanions([]);
        setConsents({ zalo: false, sms: false, email: false, phone: false });
      } else {
        toast.error(res.error.message || "Lỗi khi thực hiện check-in");
      }
    });
  };

  // Group rooms by floor (extracted from room number, e.g. 701 -> Tầng 7)
  const roomsByFloor = useMemo(() => {
    const map = new Map<number, typeof rooms>();
    for (const r of rooms) {
      const floor =
        r.number.length >= 3 ? parseInt(r.number.slice(0, -2), 10) : 1;
      if (!map.has(floor)) map.set(floor, []);
      map.get(floor)?.push(r);
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
              Nhận diện hồ sơ khách cũ &lt; 300ms · Tự động áp dụng hạng VIP &
              giảm giá
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-muted/40 border border-border/60 text-right">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
              Phòng sẵn sàng
            </span>
            <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1">
              {
                rooms.filter(
                  (r) => !r.isOccupied && !r.isBlocked && !r.isCleaning,
                ).length
              }{" "}
              / {rooms.length} phòng
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
                    <Label
                      htmlFor="backdated"
                      className="text-xs font-semibold cursor-pointer"
                    >
                      Nhập bù
                    </Label>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-5 pt-5">
                {/* 1. Quick Identifier Box */}
                <div className="p-3.5 rounded-xl border-2 border-amber-500/30 bg-amber-500/5 space-y-2">
                  <Label
                    htmlFor="identity"
                    className="text-xs font-bold flex items-center justify-between text-foreground"
                  >
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      1. Ô Tra Cứu Nhanh (SĐT / CCCD 12 số / Passport) *
                    </span>
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-amber-500/15 text-amber-800 dark:text-amber-400">
                      {isLookingUp
                        ? "Đang tìm hồ sơ..."
                        : detectedKind === "phone"
                        ? "Loại: Số điện thoại"
                        : detectedKind === "cccd"
                        ? "Loại: CCCD / CMND"
                        : detectedKind === "passport"
                        ? "Loại: Hộ chiếu"
                        : "Loại: Tự động nhận diện"}
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
                    <Label
                      htmlFor="fullName"
                      className="text-xs font-bold text-foreground"
                    >
                      Họ và tên khách *
                    </Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ví dụ: NGUYỄN VĂN AN"
                      className="h-9.5 text-xs uppercase font-bold rounded-xl"
                      required
                    />
                  </div>
                  <div className="sm:col-span-3 space-y-1.5">
                    <Label
                      htmlFor="gender"
                      className="text-xs font-semibold text-muted-foreground"
                    >
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
                    <Label
                      htmlFor="dob"
                      className="text-xs font-semibold text-muted-foreground"
                    >
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
                    <Label
                      htmlFor="phone"
                      className="text-xs font-bold text-foreground"
                    >
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
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="docNumber"
                        className="text-xs font-bold text-foreground"
                      >
                        Số CCCD / Hộ chiếu
                      </Label>
                      {guestId && docNumber.includes("*") && (
                        <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                          Đã lưu hồ sơ
                        </span>
                      )}
                    </div>
                    <Input
                      id="docNumber"
                      value={docNumber}
                      onChange={(e) => setDocNumber(e.target.value)}
                      placeholder="12 số CCCD hoặc mã Passport"
                      className="h-9.5 text-xs font-mono font-semibold rounded-xl"
                    />
                    {guestId && docNumber.includes("*") && (
                      <p className="text-[11px] text-muted-foreground">
                        Hồ sơ đã lưu CCCD (bảo mật). Nhập số mới chỉ khi khách
                        đổi giấy tờ.
                      </p>
                    )}
                  </div>
                </div>

                {/* 4. Visual Room Selector (Hot Feature for UX!) */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="roomSelect"
                      className="text-xs font-bold text-foreground flex items-center gap-1.5"
                    >
                      <BedDouble className="h-4 w-4 text-emerald-600" />
                      <span>Chọn phòng nhận ({branchName}) *</span>
                    </Label>
                    <span className="text-[11px] text-muted-foreground">
                      {selectedRoomId
                        ? "Đã chọn phòng"
                        : "Click chọn trực tiếp ô phòng"}
                    </span>
                  </div>

                  {/* Status Legend */}
                  <div className="flex flex-wrap items-center gap-3 py-1.5 px-3 rounded-xl bg-muted/30 text-[11px] text-muted-foreground border border-border/40">
                    <span className="font-bold text-foreground text-[10px] uppercase tracking-wider">
                      Trạng thái phòng:
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        Sẵn sàng đón khách
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      <span className="text-amber-600 dark:text-amber-400 font-semibold">
                        Chờ dọn dẹp
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-slate-400" />
                      <span>Đang có khách</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-rose-500" />
                      <span className="text-rose-500 font-semibold">
                        Khóa OOO
                      </span>
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
                            const isCleaning =
                              !!r.isCleaning && !isOccupied && !isBlocked;
                            const isUnavailable =
                              isOccupied || isBlocked || isCleaning;

                            if (isUnavailable) {
                              return (
                                <button
                                  key={r.id}
                                  type="button"
                                  disabled
                                  title={
                                    isBlocked
                                      ? "Phòng đang khóa ngừng bán (OOO)"
                                      : isCleaning
                                        ? "Phòng vừa trả phòng, đang chờ dọn dẹp"
                                        : "Phòng đang có khách ở"
                                  }
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-not-allowed border flex items-center gap-1 shadow-2xs opacity-80 ${
                                    isBlocked
                                      ? "bg-rose-500/10 border-rose-500/30 text-rose-500"
                                      : isCleaning
                                        ? "bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400 font-semibold"
                                        : "bg-muted/40 border-border/50 text-muted-foreground"
                                  }`}
                                >
                                  <span
                                    className={`h-1.5 w-1.5 rounded-full ${
                                      isBlocked
                                        ? "bg-rose-500"
                                        : isCleaning
                                          ? "bg-amber-500 ring-2 ring-amber-400/30"
                                          : "bg-muted-foreground"
                                    }`}
                                  />
                                  <span>P.{r.number}</span>
                                  <span className="text-[9px] font-bold">
                                    (
                                    {isBlocked
                                      ? "OOO"
                                      : isCleaning
                                        ? "Chờ dọn"
                                        : "Ở"}
                                    )
                                  </span>
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
                                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30 scale-105 ring-2 ring-emerald-400"
                                    : "bg-card border border-border/70 text-foreground hover:border-emerald-500/50 hover:bg-emerald-500/10"
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
                      const isUnavailable =
                        r.isOccupied || r.isBlocked || r.isCleaning;
                      return (
                        <option
                          key={r.id}
                          value={r.id}
                          disabled={isUnavailable}
                        >
                          Phòng {r.number} ({r.roomType || "Tiêu chuẩn"}){" "}
                          {r.isOccupied
                            ? "— [Đang có khách]"
                            : r.isBlocked
                              ? "— [Đang khóa OOO]"
                              : r.isCleaning
                                ? "— [Chờ dọn dẹp - Vừa trả phòng]"
                                : "— [Sẵn sàng]"}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* 5. Source channel & Checkout Date */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
                  <div className="sm:col-span-6 space-y-1.5">
                    <Label
                      htmlFor="sourceChannel"
                      className="text-xs font-semibold text-muted-foreground"
                    >
                      Kênh nguồn khách *
                    </Label>
                    <select
                      id="sourceChannel"
                      value={sourceChannel}
                      onChange={(e) => setSourceChannel(e.target.value)}
                      className="w-full h-9.5 rounded-xl border border-input bg-background px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    >
                      <option value="walk_in">
                        Khách vãng lai (Quầy lễ tân)
                      </option>
                      <option value="direct_phone">
                        Đặt qua hotline / Điện thoại
                      </option>
                      <option value="ota_booking">Booking.com</option>
                      <option value="ota_agoda">Agoda</option>
                      <option value="ota_expedia">Expedia</option>
                      <option value="corporate">
                        Hợp đồng công ty / Doanh nghiệp
                      </option>
                    </select>
                  </div>

                  <div className="sm:col-span-6 space-y-1.5">
                    <Label
                      htmlFor="checkoutTime"
                      className="text-xs font-semibold text-muted-foreground"
                    >
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

                {/* 6. Người đi cùng (Companions) */}
                {isCompanionsEnabled && (
                  <div className="space-y-3 pt-2 border-t border-border/40">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Users className="h-4 w-4 text-indigo-500" />
                          <span>Người đi cùng ({companions.length}/10)</span>
                        </Label>
                        <p className="text-[11px] text-muted-foreground">
                          Thêm khách ở cùng phòng. Có thể tìm khách cũ hoặc tạo
                          mới.
                        </p>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddCompanion}
                        disabled={companions.length >= 10}
                        className="h-8 text-xs font-bold rounded-xl border-dashed border-indigo-400 text-indigo-600 hover:bg-indigo-500/10"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Thêm người đi cùng
                      </Button>
                    </div>

                    {companions.length === 0 ? (
                      <div className="p-3 text-center rounded-xl border border-dashed border-border/60 bg-muted/10 text-xs text-muted-foreground">
                        Chưa có người đi cùng (khách đi 1 mình). Nhấn "+ Thêm
                        người đi cùng" nếu phòng có từ 2 khách trở lên.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {companions.map((c, idx) => (
                          <div
                            key={c.id}
                            className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-3 relative group"
                          >
                            <div className="flex items-center justify-between pb-2 border-b border-border/40">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-foreground">
                                  #{idx + 1}. {c.fullName || "Khách đi cùng"}
                                </span>
                                {c.isChild && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
                                  >
                                    Trẻ em (&lt;14 tuổi)
                                  </Badge>
                                )}
                                {c.guestId && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] border-emerald-500/40 text-emerald-600 bg-emerald-500/10"
                                  >
                                    Khách cũ
                                  </Badge>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveCompanion(c.id)}
                                className="text-muted-foreground hover:text-rose-500 p-1 rounded-lg transition"
                                title="Xóa người đi cùng này"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>

                            {/* Quick lookup input for companion */}
                            <div className="flex items-center gap-2">
                              <Input
                                id={`comp-lookup-${c.id}`}
                                placeholder="Nhập SĐT hoặc CCCD để tìm nhanh khách cũ..."
                                className="h-8 text-xs rounded-lg"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleLookupCompanion(
                                      c.id,
                                      (e.target as HTMLInputElement).value,
                                    );
                                  }
                                }}
                              />
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                disabled={c.isLookingUp}
                                onClick={() => {
                                  const el = document.getElementById(
                                    `comp-lookup-${c.id}`,
                                  ) as HTMLInputElement;
                                  if (el) handleLookupCompanion(c.id, el.value);
                                }}
                                className="h-8 text-xs font-semibold px-3 rounded-lg shrink-0"
                              >
                                {c.isLookingUp ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Search className="h-3 w-3 mr-1" />
                                )}
                                Tìm
                              </Button>
                            </div>

                            {/* Form fields */}
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                              <div className="sm:col-span-5 space-y-1">
                                <Label className="text-[11px] font-semibold">
                                  Họ và tên *
                                </Label>
                                <Input
                                  value={c.fullName}
                                  onChange={(e) =>
                                    handleUpdateCompanion(c.id, {
                                      fullName: e.target.value,
                                    })
                                  }
                                  placeholder="Nguyễn Văn A"
                                  className="h-8 text-xs font-semibold rounded-lg"
                                  required
                                />
                              </div>

                              <div className="sm:col-span-4 space-y-1">
                                <Label className="text-[11px] font-semibold">
                                  Số điện thoại
                                </Label>
                                <Input
                                  value={c.phone}
                                  onChange={(e) =>
                                    handleUpdateCompanion(c.id, {
                                      phone: e.target.value,
                                    })
                                  }
                                  placeholder="0912345678"
                                  className="h-8 text-xs font-mono rounded-lg"
                                />
                              </div>

                              <div className="sm:col-span-3 space-y-1">
                                <Label className="text-[11px] font-semibold">
                                  Giới tính
                                </Label>
                                <select
                                  value={c.gender}
                                  onChange={(e) =>
                                    handleUpdateCompanion(c.id, {
                                      gender: e.target.value as any,
                                    })
                                  }
                                  className="w-full h-8 rounded-lg border border-input bg-background px-2 text-xs font-semibold focus:outline-none"
                                >
                                  <option value="male">Nam</option>
                                  <option value="female">Nữ</option>
                                  <option value="other">Khác</option>
                                </select>
                              </div>

                              <div className="sm:col-span-3 space-y-1">
                                <Label className="text-[11px] font-semibold">
                                  Loại giấy tờ
                                </Label>
                                <select
                                  value={c.documentType}
                                  onChange={(e) =>
                                    handleUpdateCompanion(c.id, {
                                      documentType: e.target.value as any,
                                    })
                                  }
                                  className="w-full h-8 rounded-lg border border-input bg-background px-2 text-xs font-semibold focus:outline-none"
                                >
                                  <option value="cccd">CCCD / CMND</option>
                                  <option value="passport">Hộ chiếu</option>
                                </select>
                              </div>

                              <div className="sm:col-span-5 space-y-1">
                                <Label className="text-[11px] font-semibold">
                                  Số giấy tờ {c.isChild ? "(Miễn trẻ em)" : "*"}
                                </Label>
                                <Input
                                  value={c.documentNumber}
                                  onChange={(e) =>
                                    handleUpdateCompanion(c.id, {
                                      documentNumber: e.target.value,
                                    })
                                  }
                                  placeholder={
                                    c.isChild
                                      ? "Không bắt buộc đối với trẻ em"
                                      : "Nhập 12 số CCCD / Hộ chiếu"
                                  }
                                  className="h-8 text-xs font-mono rounded-lg"
                                  required={!c.isChild}
                                />
                              </div>

                              <div className="sm:col-span-4 space-y-1">
                                <Label className="text-[11px] font-semibold">
                                  Ngày sinh
                                </Label>
                                <Input
                                  type="date"
                                  value={c.dob}
                                  onChange={(e) =>
                                    handleUpdateCompanion(c.id, {
                                      dob: e.target.value,
                                    })
                                  }
                                  className="h-8 text-xs rounded-lg"
                                />
                              </div>
                            </div>

                            {/* Checkboxes: Child & Loyalty */}
                            <div className="pt-1 flex flex-wrap items-center justify-between gap-3 text-xs border-t border-border/30">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id={`child-${c.id}`}
                                  checked={c.isChild}
                                  onCheckedChange={(checked) =>
                                    handleUpdateCompanion(c.id, {
                                      isChild: !!checked,
                                    })
                                  }
                                />
                                <Label
                                  htmlFor={`child-${c.id}`}
                                  className="text-xs cursor-pointer font-medium"
                                >
                                  Trẻ em (&lt;14 tuổi)
                                </Label>
                              </div>

                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id={`loyalty-${c.id}`}
                                  checked={c.countsForLoyalty}
                                  onCheckedChange={(checked) =>
                                    handleUpdateCompanion(c.id, {
                                      countsForLoyalty: !!checked,
                                    })
                                  }
                                />
                                <Label
                                  htmlFor={`loyalty-${c.id}`}
                                  className="text-xs cursor-pointer font-bold text-amber-700 dark:text-amber-400"
                                >
                                  Tính lượt cho hạng thành viên
                                </Label>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Backdated Extra Fields */}
                {isBackdated && (
                  <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400">
                      <Clock className="h-4 w-4" />
                      <span>Nhập Bù Lượt Ở Quá Khứ (Quyền Quản Lý)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label
                          htmlFor="actualIn"
                          className="text-[11px] font-semibold"
                        >
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
                        <Label
                          htmlFor="actualOut"
                          className="text-[11px] font-semibold"
                        >
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
                      {guestData.blacklistReason ||
                        "Khách hàng có lịch sử làm hư hỏng tài sản hoặc vi phạm nội quy chuỗi."}
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <Checkbox
                        id="ack"
                        checked={blacklistAck}
                        onCheckedChange={(c) => setBlacklistAck(!!c)}
                      />
                      <Label
                        htmlFor="ack"
                        className="text-xs font-bold text-rose-700 dark:text-rose-300 cursor-pointer"
                      >
                        Tôi xác nhận đã đọc cảnh báo và chịu trách nhiệm tiếp
                        nhận khách này
                      </Label>
                    </div>
                  </div>
                )}

                {/* Consent & Communication Preferences (Nghị định 13/2023/NĐ-CP) */}
                <div className="rounded-2xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/30 dark:bg-sky-950/20 p-4 space-y-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-900/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-sky-950 dark:text-sky-200 uppercase tracking-wide">
                          Đồng thuận tiếp thị & Chăm sóc khách hàng (Nghị định
                          13/2023/NĐ-CP)
                        </h4>
                        <p className="text-[11px] text-sky-700/80 dark:text-sky-300/80">
                          Tự nguyện, không bắt buộc để lưu trú. Mặc định không
                          tích sẵn.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Receptionist Script Prompt */}
                  <div className="text-[11px] bg-white/80 dark:bg-slate-900/80 rounded-xl p-2.5 border border-sky-100 dark:border-sky-900/40 text-slate-600 dark:text-slate-300 italic">
                    <span className="font-semibold not-italic text-sky-700 dark:text-sky-400 mr-1.5">
                      Kịch bản lễ tân:
                    </span>
                    "Dạ khách sạn xin phép gửi xác nhận đặt phòng, hóa đơn và
                    voucher ưu đãi qua Zalo hoặc SMS cho anh/chị được không ạ?"
                  </div>

                  {/* 4 Checkbox Channels */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {[
                      {
                        id: "zalo" as const,
                        label: "Zalo ZNS / Quan tâm OA",
                        desc: "Nhận xác nhận phòng, hoá đơn & ưu đãi",
                        icon: MessageSquare,
                      },
                      {
                        id: "sms" as const,
                        label: "SMS Brandname",
                        desc: "Nhận mã OTP, thông báo và ưu đãi đặc quyền",
                        icon: MessageSquare,
                      },
                      {
                        id: "email" as const,
                        label: "Email Marketing",
                        desc: "Bản tin khuyến mại, ưu đãi sinh nhật",
                        icon: Mail,
                      },
                      {
                        id: "phone" as const,
                        label: "Cuộc gọi CSKH (Telesales)",
                        desc: "Tư vấn viên gọi hỗ trợ và chăm sóc",
                        icon: PhoneIcon,
                      },
                    ].map((ch) => {
                      const Icon = ch.icon;
                      const isChecked = consents[ch.id];
                      return (
                        <label
                          key={ch.id}
                          className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                            isChecked
                              ? "bg-white dark:bg-slate-900 border-sky-300 dark:border-sky-700 shadow-xs"
                              : "bg-white/50 dark:bg-slate-900/40 border-slate-200/70 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-900"
                          }`}
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(checked) =>
                              setConsents((prev) => ({
                                ...prev,
                                [ch.id]: !!checked,
                              }))
                            }
                            className="mt-0.5"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                              <Icon className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                              <span>{ch.label}</span>
                            </div>
                            <p className="text-[10px] text-slate-400 truncate mt-0.5">
                              {ch.desc}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-4 flex items-center justify-between border-t border-border/50">
                  <span className="text-[11px] text-muted-foreground hidden sm:inline">
                    Phím tắt:{" "}
                    <kbd className="font-bold text-foreground bg-muted px-1.5 py-0.5 rounded border border-border/60">
                      Enter
                    </kbd>{" "}
                    Lưu check-in
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
                        "Lưu Lượt Ở Quá Khứ"
                      ) : (
                        "Hoàn Tất Check-in"
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
                      guestData.tierName === "Vàng"
                        ? "bg-amber-500 text-black font-extrabold"
                        : guestData.tierName === "Bạc"
                          ? "bg-slate-400 text-white"
                          : "bg-amber-800 text-white"
                    }`}
                  >
                    Hạng {guestData.tierName || "Đồng"}
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-[10px] border-border/70 bg-muted/40"
                  >
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
                      <span className="font-extrabold text-base text-foreground">
                        {guestData.fullName}
                      </span>
                      <span className="font-mono text-muted-foreground text-xs font-semibold">
                        {guestData.phone}
                      </span>
                    </div>

                    {guestData.discountPct > 0 && (
                      <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 rounded-lg font-bold text-xs">
                        <Percent className="h-4 w-4" />
                        <span>
                          Được áp dụng ưu đãi giảm giá {guestData.discountPct}%!
                        </span>
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
                        {guestData.lastStayBranchName || "Boutique"}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {guestData.lastStayDate || "Gần đây"}
                      </span>
                    </div>
                  </div>

                  {/* Recent Preferences & Notes */}
                  <div className="rounded-xl bg-card p-3.5 border border-border/60 shadow-2xs space-y-2">
                    <span className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                      <FileText className="h-3.5 w-3.5 text-amber-500" />
                      Ghi chú & Sở thích đặc biệt:
                    </span>
                    {guestData.recentNotes &&
                    guestData.recentNotes.length > 0 ? (
                      <ul className="space-y-1.5 pl-4 list-disc text-muted-foreground text-[11px]">
                        {guestData.recentNotes.map((note, idx) => (
                          <li key={idx} className="font-medium">
                            {note}
                          </li>
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
                    <p className="font-bold text-sm text-foreground">
                      Sẵn sàng nhận diện khách quen
                    </p>
                    <p className="text-[11px] text-muted-foreground max-w-xs mx-auto leading-relaxed">
                      Nhập số điện thoại hoặc số CCCD vào ô số 1. Hệ thống sẽ tự
                      động đối soát hồ sơ 8 cơ sở ngay tức thì.
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
                        <span className="font-bold block text-foreground">
                          Đồng
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          ≥ 2 đêm · -3%
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
                        <span className="font-bold block text-amber-700 dark:text-amber-400">
                          Bạc
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          ≥ 5 đêm · -5%
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                        <span className="font-bold block text-yellow-700 dark:text-yellow-400">
                          Vàng
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          ≥ 10 đêm · -10%
                        </span>
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
