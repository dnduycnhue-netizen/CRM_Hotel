"use client";

import { AlertCircle, Cake, CheckCircle2, Gift, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { recordBirthdayGreetingAction } from "../actions";
import { formatDateVN } from "@/shared/utils/date";
import { greetingChannelLabels, greetingChannels } from "../schemas";
import type { UpcomingBirthdayGuest } from "../types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guest: UpcomingBirthdayGuest | null;
  branches: Array<{ id: string; name: string }>;
  defaultBranchId?: string;
  onSuccess?: () => void;
}

export function RecordGreetingDialog({
  open,
  onOpenChange,
  guest,
  branches,
  defaultBranchId,
  onSuccess,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [branchId, setBranchId] = useState<string>(
    defaultBranchId || branches[0]?.id || "",
  );
  const [channel, setChannel] =
    useState<(typeof greetingChannels)[number]>("phone");
  const [giftDescription, setGiftDescription] = useState("");
  const [autoIssueVoucher, setAutoIssueVoucher] = useState(true);
  const [voucherDiscountPct, setVoucherDiscountPct] = useState(15);
  const [note, setNote] = useState("");

  // Reset state when guest or dialog open state changes to prevent state leakage between guests
  useEffect(() => {
    if (open && guest) {
      setErrorMsg(null);
      setSuccessMsg(null);
      setLoading(false);
      setGiftDescription("");
      setAutoIssueVoucher(true);
      setVoucherDiscountPct(15);
      setNote("");
      if (!guest.marketing_consent) {
        setChannel("phone");
      } else {
        setChannel("phone");
      }
      if (defaultBranchId) {
        setBranchId(defaultBranchId);
      } else if (branches.length > 0) {
        setBranchId(branches[0].id);
      }
    }
  }, [open, guest, defaultBranchId, branches]);

  useEffect(() => {
    if (guest && !guest.marketing_consent) {
      if (channel === "sms" || channel === "zalo" || channel === "email") {
        setChannel("phone");
      }
    }
  }, [guest, channel]);

  if (!guest) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!guest) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    // Kiểm tra cứng Nghị định 13 tại UI
    if (
      !guest?.marketing_consent &&
      (channel === "sms" || channel === "zalo" || channel === "email")
    ) {
      setErrorMsg(
        "Khách hàng chưa cấp quyền nhận tin tiếp thị theo Nghị định 13/2023. Kênh SMS, Zalo và Email đã bị khóa. Vui lòng chọn cuộc gọi điện thoại hoặc chúc trực tiếp tại quầy.",
      );
      setChannel("phone");
      return;
    }

    setLoading(true);

    try {
      const res = await recordBirthdayGreetingAction({
        guest_id: guest.guest_id,
        branch_id: branchId,
        year: new Date().getFullYear(),
        channel,
        gift_description: giftDescription || null,
        auto_issue_voucher: autoIssueVoucher,
        voucher_discount_pct: voucherDiscountPct,
        note: note || null,
      });

      if (!res.ok) {
        setErrorMsg(res.error.message);
        return;
      }

      if (res.data.voucher_code) {
        setSuccessMsg(
          `Đã ghi nhận lời chúc thành công! Đã phát hành mã voucher tặng khách: ${res.data.voucher_code}`,
        );
      } else {
        setSuccessMsg(
          "Đã ghi nhận lời chúc sinh nhật cho khách hàng thành công!",
        );
      }

      setTimeout(() => {
        onSuccess?.();
        onOpenChange(false);
        setSuccessMsg(null);
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || "Đã xảy ra lỗi khi gửi lời chúc");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] bg-card border-border text-foreground">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-pink-500/10 text-pink-700 dark:text-pink-400">
              <Cake className="w-5 h-5" />
            </span>
            <div>
              <DialogTitle className="text-lg font-semibold text-foreground">
                Chăm sóc sinh nhật khách hàng
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Ghi nhận lời chúc, quà tặng và tự động phát hành voucher ưu đãi
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Thông tin khách hàng */}
        <div className="p-3 rounded-lg bg-muted/60 border border-border/60 space-y-1 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground">
              {guest.full_name}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-medium">
              {guest.tier_name || "Thành viên"}
            </span>
          </div>
          <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
            <span>
              Ngày sinh:{" "}
              <strong className="text-foreground/80">
                {formatDateVN(guest.dob)}
              </strong>{" "}
              (Tuổi mới: {guest.age})
            </span>
            {guest.phone && (
              <span>
                SĐT:{" "}
                <strong className="text-foreground/80">{guest.phone}</strong>
              </span>
            )}
            <span>
              Lượt ở:{" "}
              <strong className="text-foreground/80">
                {guest.total_stays} lần
              </strong>
            </span>
          </div>
        </div>

        {/* Cảnh báo tuân thủ Nghị định 13/2023 */}
        {!guest.marketing_consent && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-700 dark:text-amber-400" />
            <div>
              <strong>Lưu ý quyền riêng tư dữ liệu (Nghị định 13/2023):</strong>{" "}
              Khách chưa cấp quyền nhận tin tiếp thị thương mại. Khuyến nghị gửi
              lời chúc trực tiếp tại quầy hoặc cuộc gọi cá nhân từ chăm sóc
              khách hàng, không gửi tin nhắn tự động.
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-700 dark:text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <Label className="text-xs text-foreground/80">
              Cơ sở thực hiện chăm sóc
            </Label>
            <Select
              value={branchId}
              items={branches.map((b) => ({ value: b.id, label: b.name }))}
              onValueChange={(val) => val && setBranchId(val)}
            >
              <SelectTrigger className="bg-muted border-border text-foreground h-9 text-xs">
                <SelectValue placeholder="Chọn cơ sở" />
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
              Hình thức / Kênh gửi lời chúc
            </Label>
            <Select
              value={channel}
              items={greetingChannelLabels}
              onValueChange={(val) =>
                setChannel(val as (typeof greetingChannels)[number])
              }
            >
              <SelectTrigger className="bg-muted border-border text-foreground h-9 text-xs">
                <SelectValue placeholder="Chọn kênh gửi" />
              </SelectTrigger>
              <SelectContent className="bg-muted border-border text-foreground text-xs">
                {greetingChannels.map((c) => {
                  const isAutomated =
                    c === "sms" || c === "zalo" || c === "email";
                  const isDisabled = !guest.marketing_consent && isAutomated;
                  return (
                    <SelectItem key={c} value={c} disabled={isDisabled}>
                      {greetingChannelLabels[c]}
                      {isDisabled && " (Khóa theo NĐ 13)"}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-foreground/80">
              Quà tặng đính kèm (nếu có)
            </Label>
            <Input
              value={giftDescription}
              onChange={(e) => setGiftDescription(e.target.value)}
              placeholder="Ví dụ: Bánh kem sinh nhật, Set rượu vang, Giỏ hoa tươi..."
              className="bg-muted border-border text-foreground h-9 text-xs"
            />
          </div>

          {/* Tùy chọn tự phát hành voucher mừng sinh nhật */}
          <div className="p-3 rounded-lg bg-muted/40 border border-border/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <Gift className="w-3.5 h-3.5 text-pink-700 dark:text-pink-400" />
                  <span>Phát hành mã Voucher sinh nhật độc quyền</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Hệ thống tự tạo mã riêng cho khách này (hiệu lực 60 ngày)
                </p>
              </div>
              <Switch
                checked={autoIssueVoucher}
                onCheckedChange={setAutoIssueVoucher}
              />
            </div>

            {autoIssueVoucher && (
              <div className="flex items-center gap-3 pt-1">
                <Label className="text-[11px] text-muted-foreground shrink-0">
                  Mức chiết khấu:
                </Label>
                <div className="flex items-center gap-1.5 w-32">
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={voucherDiscountPct}
                    onChange={(e) =>
                      setVoucherDiscountPct(Number(e.target.value))
                    }
                    className="bg-card border-border text-foreground h-8 text-xs"
                  />
                  <span className="text-xs text-muted-foreground font-semibold">
                    %
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-foreground/80">
              Ghi chú chăm sóc
            </Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ghi nhận phản hồi của khách hàng..."
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
              className="bg-pink-600 hover:bg-pink-500 text-white gap-1.5"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <Cake className="w-3.5 h-3.5" />
                  Ghi nhận & Tặng quà
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
