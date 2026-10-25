"use client";

import {
  AlertCircle,
  CheckCircle2,
  Gift,
  Loader2,
  Sparkles,
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
import { createVoucherAction } from "../actions";
import { discountTypeLabels, discountTypes } from "../schemas";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: Array<{ id: string; name: string }>;
  guests: Array<{ id: string; full_name: string; phone: string | null }>;
  onSuccess?: () => void;
}

export function CreateVoucherDialog({
  open,
  onOpenChange,
  branches,
  guests,
  onSuccess,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [discountType, setDiscountType] =
    useState<(typeof discountTypes)[number]>("percent");
  const [discountValue, setDiscountValue] = useState<number | string>(10);
  const [maxDiscountAmount, setMaxDiscountAmount] = useState<number | string>(
    "",
  );
  const [minSpendAmount, setMinSpendAmount] = useState<number | string>(0);
  const [validFrom, setValidFrom] = useState(today);
  const [validTo, setValidTo] = useState(nextMonth);
  const [usageLimit, setUsageLimit] = useState<number | string>(50);
  const [targetGuestId, setTargetGuestId] = useState<string>("all");
  const [applicableBranchId, setApplicableBranchId] = useState<string>("all");
  const [note, setNote] = useState("");

  function generateRandomCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let rand = "";
    for (let i = 0; i < 6; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCode(`PROMO-${rand}`);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await createVoucherAction({
        code: code.trim().toUpperCase(),
        title: title.trim(),
        discount_type: discountType,
        discount_value: Number(discountValue),
        max_discount_amount:
          discountType === "percent" && maxDiscountAmount
            ? Number(maxDiscountAmount)
            : null,
        min_spend_amount: Number(minSpendAmount || 0),
        valid_from: validFrom,
        valid_to: validTo,
        usage_limit: Number(usageLimit || 1),
        target_guest_id: targetGuestId === "all" ? null : targetGuestId,
        applicable_branch_id:
          applicableBranchId === "all" ? null : applicableBranchId,
        note: note || null,
      });

      if (!res.ok) {
        setErrorMsg(res.error.message);
        return;
      }

      setSuccessMsg("Phát hành mã voucher mới thành công!");
      setTimeout(() => {
        onSuccess?.();
        onOpenChange(false);
        setSuccessMsg(null);
        setCode("");
        setTitle("");
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || "Lỗi khi tạo voucher");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] bg-slate-900 border-slate-800 text-slate-100 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Gift className="w-5 h-5" />
            </span>
            <div>
              <DialogTitle className="text-lg font-semibold text-slate-100">
                Phát hành Voucher ưu đãi mới
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Thiết lập mã giảm giá theo %, số tiền cố định, thời hạn và đối
                tượng
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

        {successMsg && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-slate-300">
                  Mã Voucher <span className="text-rose-400">*</span>
                </Label>
                <button
                  type="button"
                  onClick={generateRandomCode}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" /> Tạo mã ngẫu nhiên
                </button>
              </div>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="VD: VIP10, HE2026, TRIANKH"
                required
                className="bg-slate-800 border-slate-700 text-slate-200 uppercase font-mono tracking-wider h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">
                Tên chương trình / Tiêu đề{" "}
                <span className="text-rose-400">*</span>
              </Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Giảm 20% đặt phòng mùa hè"
                required
                className="bg-slate-800 border-slate-700 text-slate-200 h-9 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Loại chiết khấu</Label>
              <Select
                value={discountType}
                onValueChange={(val) =>
                  setDiscountType(val as (typeof discountTypes)[number])
                }
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-slate-200 text-xs">
                  {discountTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {discountTypeLabels[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">
                Giá trị giảm ({discountType === "percent" ? "%" : "VNĐ"}){" "}
                <span className="text-rose-400">*</span>
              </Label>
              <Input
                type="number"
                min={1}
                max={discountType === "percent" ? 100 : undefined}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                required
                className="bg-slate-800 border-slate-700 text-slate-200 h-9 text-xs"
              />
            </div>

            {discountType === "percent" ? (
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">
                  Mức giảm tối đa (VNĐ)
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={maxDiscountAmount}
                  onChange={(e) => setMaxDiscountAmount(e.target.value)}
                  placeholder="Để trống nếu không giới hạn"
                  className="bg-slate-800 border-slate-700 text-slate-200 h-9 text-xs"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">
                  Số lượt dùng tối đa
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={usageLimit}
                  onChange={(e) => setUsageLimit(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-slate-200 h-9 text-xs"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">
                Hóa đơn tối thiểu (VNĐ)
              </Label>
              <Input
                type="number"
                min={0}
                value={minSpendAmount}
                onChange={(e) => setMinSpendAmount(e.target.value)}
                placeholder="0"
                className="bg-slate-800 border-slate-700 text-slate-200 h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">
                Có hiệu lực từ ngày
              </Label>
              <Input
                type="date"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                required
                className="bg-slate-800 border-slate-700 text-slate-200 h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Hết hạn vào ngày</Label>
              <Input
                type="date"
                value={validTo}
                onChange={(e) => setValidTo(e.target.value)}
                required
                className="bg-slate-800 border-slate-700 text-slate-200 h-9 text-xs"
              />
            </div>
          </div>

          {discountType === "percent" && (
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">
                Số lượt dùng tối đa
              </Label>
              <Input
                type="number"
                min={1}
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.value)}
                className="bg-slate-800 border-slate-700 text-slate-200 h-9 text-xs w-full sm:w-1/3"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Cơ sở áp dụng</Label>
              <Select
                value={applicableBranchId}
                onValueChange={(val) => val && setApplicableBranchId(val)}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200 h-9 text-xs">
                  <SelectValue placeholder="Tất cả cơ sở (Toàn chuỗi)" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-slate-200 text-xs">
                  <SelectItem value="all">
                    Toàn bộ chi nhánh khách sạn
                  </SelectItem>
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
                Khách hàng mục tiêu
              </Label>
              <Select
                value={targetGuestId}
                onValueChange={(val) => val && setTargetGuestId(val)}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200 h-9 text-xs">
                  <SelectValue placeholder="Áp dụng cho tất cả khách" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-slate-200 text-xs">
                  <SelectItem value="all">
                    Tất cả khách hàng (Public voucher)
                  </SelectItem>
                  {guests.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.full_name} {g.phone ? `(${g.phone})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-300">
              Ghi chú điều kiện áp dụng
            </Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Không áp dụng kèm các chương trình khuyến mãi khác..."
              className="bg-slate-800 border-slate-700 text-slate-200 h-9 text-xs"
            />
          </div>

          <DialogFooter className="pt-3">
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
              className="bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Đang phát hành...
                </>
              ) : (
                <>
                  <Gift className="w-3.5 h-3.5" />
                  Phát hành Voucher
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
