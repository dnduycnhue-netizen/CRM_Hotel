"use client";

import {
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Loader2,
  Tag,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type RedeemVoucherResult, redeemVoucherAction } from "../actions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: Array<{ id: string; name: string }>;
  guests: Array<{ id: string; full_name: string; phone: string | null }>;
  defaultBranchId?: string;
  defaultGuestId?: string;
  defaultCode?: string;
  onSuccess?: () => void;
}

export function RedeemVoucherDialog({
  open,
  onOpenChange,
  branches,
  guests,
  defaultBranchId,
  defaultGuestId,
  defaultCode,
  onSuccess,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<RedeemVoucherResult | null>(null);

  const [code, setCode] = useState(defaultCode || "");
  const [guestId, setGuestId] = useState(defaultGuestId || guests[0]?.id || "");
  const [guestSearch, setGuestSearch] = useState("");
  const [branchId, setBranchId] = useState(
    defaultBranchId || branches[0]?.id || "",
  );
  const [billAmount, setBillAmount] = useState<number | string>(0);
  const [note, setNote] = useState("");

  // Chỉ reset khi dialog vừa mở: nếu phụ thuộc `guests`, router.refresh() sau khi
  // đổi mã sẽ tạo mảng mới và xóa mất màn hình kết quả thành công.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) {
      setCode(defaultCode ? defaultCode.trim().toUpperCase() : "");
      if (defaultBranchId) setBranchId(defaultBranchId);
      setGuestId(defaultGuestId || guests[0]?.id || "");
      setGuestSearch("");
      setBillAmount(0);
      setNote("");
      setErrorMsg(null);
      setResult(null);
    }
    wasOpen.current = open;
  }, [open, defaultCode, defaultBranchId, defaultGuestId, guests]);

  const filteredGuests = guests.filter((g) => {
    if (!guestSearch.trim()) return true;
    const q = guestSearch.trim().toLowerCase();
    return g.full_name?.toLowerCase().includes(q) || g.phone?.includes(q);
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setResult(null);

    if (!code.trim()) {
      setErrorMsg("Vui lòng nhập mã voucher");
      return;
    }
    if (!guestId) {
      setErrorMsg("Vui lòng chọn khách hàng sử dụng voucher");
      return;
    }
    if (!branchId) {
      setErrorMsg("Vui lòng chọn cơ sở thực hiện");
      return;
    }

    setLoading(true);

    try {
      const res = await redeemVoucherAction({
        code: code.trim().toUpperCase(),
        guest_id: guestId,
        branch_id: branchId,
        bill_amount: Number(billAmount || 0),
        note: note || null,
      });

      if (!res.ok) {
        setErrorMsg(res.error.message || "Không thể áp dụng mã voucher này");
        return;
      }

      setResult(res.data);
      toast.success(`Đã áp dụng voucher ${res.data.voucher_code}`);
      onSuccess?.();
    } catch (err: any) {
      setErrorMsg(err.message || "Lỗi khi đổi mã voucher");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setCode("");
    setBillAmount(0);
    setNote("");
    setResult(null);
    setErrorMsg(null);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border text-foreground">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
              <Tag className="w-5 h-5" />
            </span>
            <div>
              <DialogTitle className="text-lg font-semibold text-foreground">
                Áp dụng / Đổi mã Voucher
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Tra cứu điều kiện và ghi nhận giảm trừ hóa đơn cho khách
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-700 dark:text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {result ? (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-700 dark:text-emerald-400 mx-auto" />
              <h4 className="font-semibold text-emerald-700 dark:text-emerald-300 text-base">
                Áp dụng voucher thành công!
              </h4>
              <p className="text-xs text-foreground/80">
                Mã voucher:{" "}
                <strong className="font-mono text-emerald-700 dark:text-emerald-400">
                  {result.voucher_code}
                </strong>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 bg-muted/60 rounded-lg text-xs">
              <div>
                <span className="text-muted-foreground">Số tiền giảm trừ:</span>
                <p className="text-base font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                  -
                  {new Intl.NumberFormat("vi-VN", {
                    style: "currency",
                    currency: "VND",
                  }).format(result.discount_applied)}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">
                  Số tiền cần thanh toán:
                </span>
                <p className="text-base font-bold text-foreground mt-0.5">
                  {new Intl.NumberFormat("vi-VN", {
                    style: "currency",
                    currency: "VND",
                  }).format(result.final_amount)}
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                size="sm"
                onClick={handleReset}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                Hoàn tất & Đóng
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs text-foreground/80">
                Mã Voucher giảm giá{" "}
                <span className="text-rose-700 dark:text-rose-400">*</span>
              </Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Nhập mã voucher (VD: BDAY2026-..., SUMMER20)"
                required
                className="bg-muted border-border text-foreground uppercase font-mono tracking-wider h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-foreground/80">
                  Khách hàng sử dụng{" "}
                  <span className="text-rose-700 dark:text-rose-400">*</span>
                </Label>
                {guests.length > 5 && (
                  <span className="text-[11px] text-muted-foreground">
                    {filteredGuests.length}/{guests.length} khách
                  </span>
                )}
              </div>

              {guests.length > 8 && (
                <Input
                  value={guestSearch}
                  onChange={(e) => setGuestSearch(e.target.value)}
                  placeholder="Lọc nhanh tên hoặc SĐT khách..."
                  className="bg-muted/80 border-border text-foreground h-8 text-[11px] mb-1.5"
                />
              )}

              <Select
                value={guestId}
                items={guests.map((g) => ({
                  value: g.id,
                  label: g.phone ? `${g.full_name} (${g.phone})` : g.full_name,
                }))}
                onValueChange={(val) => val && setGuestId(val)}
              >
                <SelectTrigger className="bg-muted border-border text-foreground h-9 text-xs">
                  <SelectValue placeholder="Chọn khách hàng">
                    {guests.find((g) => g.id === guestId)?.full_name ||
                      (guests.length === 0
                        ? "Không có dữ liệu khách hàng"
                        : "Chọn khách hàng")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-muted border-border text-foreground text-xs max-h-56">
                  {filteredGuests.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.full_name} {g.phone ? `(${g.phone})` : ""}
                    </SelectItem>
                  ))}
                  {filteredGuests.length === 0 && (
                    <div className="p-2 text-center text-muted-foreground text-xs">
                      Không tìm thấy khách hàng phù hợp
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-foreground/80">
                  Cơ sở thực hiện{" "}
                  <span className="text-rose-700 dark:text-rose-400">*</span>
                </Label>
                <Select
                  value={branchId}
                  items={branches.map((b) => ({ value: b.id, label: b.name }))}
                  onValueChange={(val) => val && setBranchId(val)}
                >
                  <SelectTrigger className="bg-muted border-border text-foreground h-9 text-xs">
                    <SelectValue placeholder="Chọn cơ sở">
                      {branches.find((b) => b.id === branchId)?.name ||
                        "Chọn cơ sở"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-muted border-border text-foreground text-xs">
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-foreground/80">
                  Giá trị hóa đơn / Tiền phòng (VNĐ)
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={billAmount}
                  onChange={(e) => setBillAmount(e.target.value)}
                  placeholder="0"
                  className="bg-muted border-border text-foreground h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-foreground/80">
                Ghi chú giao dịch
              </Label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="VD: Trừ tiền phòng đợt nghỉ lễ 30/4..."
                className="bg-muted border-border text-foreground h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="border-border text-foreground/80 hover:bg-muted"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Đang kiểm tra...
                  </>
                ) : (
                  <>
                    <DollarSign className="w-3.5 h-3.5" />
                    Áp dụng Voucher
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
