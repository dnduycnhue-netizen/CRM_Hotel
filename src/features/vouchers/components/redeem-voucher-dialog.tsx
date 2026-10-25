"use client";

import {
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Loader2,
  Tag,
} from "lucide-react";
import { useState } from "react";
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
  const [branchId, setBranchId] = useState(
    defaultBranchId || branches[0]?.id || "",
  );
  const [billAmount, setBillAmount] = useState<number | string>(0);
  const [note, setNote] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setResult(null);
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
        setErrorMsg(res.error.message);
        return;
      }

      setResult(res.data);
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
      <DialogContent className="sm:max-w-[500px] bg-slate-900 border-slate-800 text-slate-100">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Tag className="w-5 h-5" />
            </span>
            <div>
              <DialogTitle className="text-lg font-semibold text-slate-100">
                Áp dụng / Đổi mã Voucher
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Tra cứu điều kiện và ghi nhận giảm trừ hóa đơn cho khách
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {result ? (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h4 className="font-semibold text-emerald-300 text-base">
                Áp dụng voucher thành công!
              </h4>
              <p className="text-xs text-slate-300">
                Mã voucher:{" "}
                <strong className="font-mono text-emerald-400">
                  {result.voucher_code}
                </strong>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-800/60 rounded-lg text-xs">
              <div>
                <span className="text-slate-400">Số tiền giảm trừ:</span>
                <p className="text-base font-bold text-emerald-400 mt-0.5">
                  -
                  {new Intl.NumberFormat("vi-VN", {
                    style: "currency",
                    currency: "VND",
                  }).format(result.discount_applied)}
                </p>
              </div>
              <div>
                <span className="text-slate-400">Số tiền cần thanh toán:</span>
                <p className="text-base font-bold text-slate-100 mt-0.5">
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
              <Label className="text-xs text-slate-300">
                Mã Voucher giảm giá <span className="text-rose-400">*</span>
              </Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Nhập mã voucher (VD: BDAY2026-..., SUMMER20)"
                required
                className="bg-slate-800 border-slate-700 text-slate-200 uppercase font-mono tracking-wider h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">
                Khách hàng sử dụng <span className="text-rose-400">*</span>
              </Label>
              <Select
                value={guestId}
                onValueChange={(val) => val && setGuestId(val)}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200 h-9 text-xs">
                  <SelectValue placeholder="Chọn khách hàng" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-slate-200 text-xs">
                  {guests.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.full_name} {g.phone ? `(${g.phone})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">
                  Cơ sở thực hiện <span className="text-rose-400">*</span>
                </Label>
                <Select
                  value={branchId}
                  onValueChange={(val) => val && setBranchId(val)}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200 h-9 text-xs">
                    <SelectValue placeholder="Chọn cơ sở" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-slate-200 text-xs">
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">
                  Giá trị hóa đơn / Tiền phòng (VNĐ)
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={billAmount}
                  onChange={(e) => setBillAmount(e.target.value)}
                  placeholder="0"
                  className="bg-slate-800 border-slate-700 text-slate-200 h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">
                Ghi chú giao dịch
              </Label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="VD: Trừ tiền phòng đợt nghỉ lễ 30/4..."
                className="bg-slate-800 border-slate-700 text-slate-200 h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
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
