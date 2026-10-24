"use client";

import {
  AlertCircle,
  Award,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  Plus,
  Search,
  Trash2,
  User,
  UserCheck,
  Users,
} from "lucide-react";
import React, { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { classifyQuery, lookupGuestAction } from "@/features/check-in";
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@/shared/ui";
import {
  addStayCompanionAction,
  getStayGuestsAction,
  removeStayCompanionAction,
  type StayGuestItem,
  setCompanionLoyaltyAction,
} from "../actions";

interface StayCompanionsDialogProps {
  stayId: string | null;
  roomNumber: string;
  branchId: string;
  isOpen: boolean;
  onClose: () => void;
  onGuestsUpdated?: (count: number) => void;
}

export function StayCompanionsDialog({
  stayId,
  roomNumber,
  branchId,
  isOpen,
  onClose,
  onGuestsUpdated,
}: StayCompanionsDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [guests, setGuests] = useState<StayGuestItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Form thêm người đi cùng
  const [showAddForm, setShowAddForm] = useState(false);
  const [queryValue, setQueryValue] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [matchedGuestId, setMatchedGuestId] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other">("male");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [docType, setDocType] = useState<"cccd" | "passport">("cccd");
  const [docNumber, setDocNumber] = useState("");
  const [isChild, setIsChild] = useState(false);
  const [countsForLoyalty, setCountsForLoyalty] = useState(true);

  const resetForm = React.useCallback(() => {
    setQueryValue("");
    setMatchedGuestId(null);
    setFullName("");
    setGender("male");
    setDob("");
    setPhone("");
    setDocType("cccd");
    setDocNumber("");
    setIsChild(false);
    setCountsForLoyalty(true);
  }, []);

  // Load guests when dialog opens
  useEffect(() => {
    if (isOpen && stayId) {
      setIsLoading(true);
      setShowAddForm(false);
      resetForm();

      getStayGuestsAction(stayId).then((res) => {
        setIsLoading(false);
        if (res.ok) {
          setGuests(res.data);
          onGuestsUpdated?.(res.data.length);
        } else {
          toast.error(
            res.error.message || "Không thể tải danh sách người trong phòng",
          );
        }
      });
    }
  }, [isOpen, stayId, resetForm, onGuestsUpdated]);

  // Tra cứu nhanh khách cũ
  async function handleLookup() {
    const clean = queryValue.trim();
    if (!clean || clean.length < 4) {
      toast.error("Vui lòng nhập tối thiểu 4 ký tự để tra cứu");
      return;
    }

    const { kind, cleanValue } = classifyQuery(clean);
    if (kind !== "phone" && kind !== "cccd" && kind !== "passport") {
      toast.error("Vui lòng nhập số điện thoại, CCCD hoặc hộ chiếu hợp lệ");
      return;
    }

    setIsLookingUp(true);
    const res = await lookupGuestAction(branchId, kind, cleanValue);
    setIsLookingUp(false);

    if (res.ok && res.data) {
      const g = res.data;
      setMatchedGuestId(g.guestId);
      setFullName(g.fullName);
      setGender((g.gender as any) || "male");
      setDob(g.dob || "");
      setPhone(g.phone || "");
      if (g.docType) {
        setDocType(g.docType === "passport" ? "passport" : "cccd");
        setDocNumber(g.docNumberMasked || "");
      }
      toast.success(`Đã nhận diện khách cũ: ${g.fullName}`);
    } else {
      setMatchedGuestId(null);
      toast.info(
        "Không tìm thấy hồ sơ khách cũ. Bạn có thể nhập thông tin mới.",
      );
    }
  }

  // Toggle tính lượt cho hạng
  function handleToggleLoyalty(guestId: string, currentVal: boolean) {
    if (!stayId) return;
    const newVal = !currentVal;

    startTransition(async () => {
      const res = await setCompanionLoyaltyAction(
        stayId,
        branchId,
        guestId,
        newVal,
      );
      if (res.ok) {
        toast.success(
          newVal
            ? "Đã bật tính lượt hạng thành viên cho khách này!"
            : "Đã tắt tính lượt hạng thành viên cho khách này",
        );
        setGuests((prev) =>
          prev.map((g) =>
            g.guestId === guestId ? { ...g, countsForLoyalty: newVal } : g,
          ),
        );
      } else {
        toast.error(res.error.message || "Không thể cập nhật quyền lợi");
      }
    });
  }

  // Xóa người đi cùng
  function handleRemoveCompanion(guestId: string, name: string) {
    if (!stayId) return;
    if (!confirm(`Xác nhận xóa người đi cùng "${name}" khỏi phòng?`)) return;

    startTransition(async () => {
      const res = await removeStayCompanionAction(stayId, branchId, guestId);
      if (res.ok) {
        toast.success(`Đã xóa ${name} khỏi phòng ${roomNumber}!`);
        const updated = guests.filter((g) => g.guestId !== guestId);
        setGuests(updated);
        onGuestsUpdated?.(updated.length);
      } else {
        toast.error(res.error.message || "Không thể xóa người đi cùng");
      }
    });
  }

  // Thêm người đi cùng mới
  function handleAddCompanion(e: React.FormEvent) {
    e.preventDefault();
    if (!stayId) return;

    if (!fullName || fullName.trim().length < 2) {
      toast.error("Họ tên tối thiểu 2 ký tự");
      return;
    }

    startTransition(async () => {
      const res = await addStayCompanionAction(stayId, branchId, {
        guestId: matchedGuestId || undefined,
        fullName: fullName.trim(),
        gender,
        dob: dob || undefined,
        phone: phone.trim() || undefined,
        documentType: docType,
        documentNumber: docNumber.trim() || undefined,
        countsForLoyalty,
      });

      if (res.ok) {
        toast.success(`Đã thêm ${fullName} vào phòng ${roomNumber}!`);
        setShowAddForm(false);
        resetForm();
        // Reload guests list
        const refreshed = await getStayGuestsAction(stayId);
        if (refreshed.ok) {
          setGuests(refreshed.data);
          onGuestsUpdated?.(refreshed.data.length);
        }
      } else {
        toast.error(res.error.message || "Không thể thêm người đi cùng");
      }
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <Users className="h-5 w-5 text-indigo-600" />
            <span>Khách trong phòng {roomNumber}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground pt-0.5">
            Quản lý danh sách khách lưu trú và tùy chọn tích lũy lượt cho chương
            trình thành viên theo từng người (§2).
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
            <span className="text-xs">Đang tải danh sách khách...</span>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Guest List */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Danh sách đang lưu trú ({guests.length} khách)
              </div>

              <div className="divide-y divide-border/60 rounded-xl border border-border/80 bg-muted/20 overflow-hidden">
                {guests.map((g) => (
                  <div
                    key={g.guestId}
                    className="p-3 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          g.isPrimary
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {g.isPrimary ? (
                          <Award className="w-4 h-4" />
                        ) : (
                          <User className="w-4 h-4" />
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">
                            {g.fullName}
                          </span>
                          {g.isPrimary ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              Khách chính
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">
                              Người đi cùng
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-muted-foreground flex items-center gap-2 font-mono">
                          {g.phone && <span>{g.phone}</span>}
                          {g.docNumber && (
                            <span>
                              · {g.docType?.toUpperCase()}: {g.docNumber}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Loyalty checkbox */}
                      <label
                        className={`flex items-center gap-1.5 cursor-pointer text-[11px] ${
                          g.isPrimary ? "opacity-60 cursor-not-allowed" : ""
                        }`}
                        title={
                          g.isPrimary
                            ? "Khách đại diện luôn được tích lũy lượt hạng"
                            : "Bật/tắt tính lượt ở cho hạng thành viên của khách này"
                        }
                      >
                        <Checkbox
                          checked={g.countsForLoyalty}
                          disabled={g.isPrimary || isPending}
                          onCheckedChange={() =>
                            !g.isPrimary &&
                            handleToggleLoyalty(g.guestId, g.countsForLoyalty)
                          }
                          className="rounded"
                        />
                        <span
                          className={
                            g.countsForLoyalty
                              ? "font-semibold text-emerald-600 dark:text-emerald-400"
                              : "text-muted-foreground"
                          }
                        >
                          Tích lũy hạng
                        </span>
                      </label>

                      {/* Remove button (companions only) */}
                      {!g.isPrimary && (
                        <button
                          type="button"
                          onClick={() =>
                            handleRemoveCompanion(g.guestId, g.fullName)
                          }
                          disabled={isPending}
                          title="Xóa người đi cùng (chỉ trong ngày check-in)"
                          className="p-1 rounded text-muted-foreground hover:text-rose-600 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Form Thêm người đi cùng */}
            {showAddForm ? (
              <form
                onSubmit={handleAddCompanion}
                className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3 text-xs"
              >
                <div className="flex items-center justify-between border-b border-indigo-100 dark:border-indigo-900 pb-2">
                  <span className="font-bold text-foreground flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-indigo-600" />
                    Thêm người đi cùng vào phòng {roomNumber}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="text-muted-foreground hover:text-foreground text-xs"
                  >
                    Đóng
                  </button>
                </div>

                {/* Quick Lookup */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Tra cứu nhanh SĐT / CCCD / Passport khách cũ..."
                      value={queryValue}
                      onChange={(e) => setQueryValue(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        (e.preventDefault(), handleLookup())
                      }
                      className="pl-8 h-8.5 text-xs rounded-lg bg-background"
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleLookup}
                    disabled={isLookingUp}
                    className="h-8.5 text-xs font-semibold px-3"
                  >
                    {isLookingUp ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      "Tra cứu"
                    )}
                  </Button>
                </div>

                {matchedGuestId && (
                  <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-700 dark:text-emerald-300 flex items-center gap-2 text-[11px] font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      Đã nhận diện hồ sơ khách cũ. Hệ thống sẽ tự động ghép lượt
                      ở này.
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <Label className="text-[11px] font-semibold">
                      Họ và tên *
                    </Label>
                    <Input
                      required
                      placeholder="Nguyễn Văn A"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="h-8 text-xs rounded-lg bg-background"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] font-semibold">
                      Số điện thoại
                    </Label>
                    <Input
                      placeholder="0901234567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="h-8 text-xs rounded-lg bg-background font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <Label className="text-[11px] font-semibold">
                      Giới tính
                    </Label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as any)}
                      className="w-full h-8 rounded-lg border border-input bg-background px-2 text-xs"
                    >
                      <option value="male">Nam</option>
                      <option value="female">Nữ</option>
                      <option value="other">Khác</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-[11px] font-semibold">
                      Ngày sinh
                    </Label>
                    <Input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="h-8 text-xs rounded-lg bg-background"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] font-semibold">
                      Loại giấy tờ
                    </Label>
                    <select
                      value={docType}
                      disabled={isChild}
                      onChange={(e) => setDocType(e.target.value as any)}
                      className="w-full h-8 rounded-lg border border-input bg-background px-2 text-xs disabled:opacity-50"
                    >
                      <option value="cccd">CCCD</option>
                      <option value="passport">Passport</option>
                    </select>
                  </div>
                </div>

                {!isChild && (
                  <div>
                    <Label className="text-[11px] font-semibold">
                      Số giấy tờ
                    </Label>
                    <Input
                      placeholder="Số CCCD hoặc hộ chiếu"
                      value={docNumber}
                      onChange={(e) => setDocNumber(e.target.value)}
                      className="h-8 text-xs rounded-lg bg-background font-mono"
                    />
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-4 pt-1">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox
                      checked={isChild}
                      onCheckedChange={(c) => setIsChild(Boolean(c))}
                      className="rounded"
                    />
                    <span className="text-[11px] text-muted-foreground font-medium">
                      Trẻ em (&lt; 14 tuổi, không bắt buộc giấy tờ)
                    </span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox
                      checked={countsForLoyalty}
                      onCheckedChange={(c) => setCountsForLoyalty(Boolean(c))}
                      className="rounded"
                    />
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      Tính lượt cho hạng thành viên (§2)
                    </span>
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-indigo-100 dark:border-indigo-900">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAddForm(false)}
                    className="h-8 text-xs"
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isPending}
                    className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                  >
                    {isPending ? "Đang thêm..." : "Lưu vào phòng"}
                  </Button>
                </div>
              </form>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddForm(true)}
                className="w-full h-9 text-xs font-semibold border-dashed text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Thêm người đi cùng vào phòng này
              </Button>
            )}
          </div>
        )}

        <DialogFooter className="mt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-8 text-xs"
          >
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
