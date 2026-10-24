"use client";

import { useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { savePartnerAction } from "../actions";
import {
  partnerKindLabels,
  partnerKinds,
  type SavePartnerInput,
  savePartnerSchema,
} from "../schemas";
import type { Partner, PartnerKind } from "../types";

interface PartnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partner?: Partner | null;
  onSuccess?: () => void;
}

export function PartnerDialog({
  open,
  onOpenChange,
  partner,
  onSuccess,
}: PartnerDialogProps) {
  const isEditing = Boolean(partner?.id);

  const [name, setName] = useState(partner?.name || "");
  const [kind, setKind] = useState<PartnerKind>(
    partner?.kind || "travel_agency",
  );
  const [contactName, setContactName] = useState(partner?.contact_name || "");
  const [phone, setPhone] = useState(partner?.phone || "");
  const [email, setEmail] = useState(partner?.email || "");
  const [taxCode, setTaxCode] = useState(partner?.tax_code || "");
  const [address, setAddress] = useState(partner?.address || "");
  const [bankName, setBankName] = useState(partner?.bank_name || "");
  const [bankAccount, setBankAccount] = useState(partner?.bank_account || "");
  const [bankHolder, setBankHolder] = useState(partner?.bank_holder || "");
  const [creditLimit, setCreditLimit] = useState(
    partner?.credit_limit ? String(partner.credit_limit) : "0",
  );
  const [paymentTerms, setPaymentTerms] = useState(
    partner?.payment_terms || "",
  );
  const [note, setNote] = useState(partner?.note || "");
  const [isActive, setIsActive] = useState(partner ? partner.is_active : true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const payload: SavePartnerInput = {
      id: partner?.id || null,
      name: name.trim(),
      kind,
      contact_name: contactName.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      tax_code: taxCode.trim() || null,
      address: address.trim() || null,
      bank_name: bankName.trim() || null,
      bank_account: bankAccount.trim() || null,
      bank_holder: bankHolder.trim() || null,
      credit_limit: Number(creditLimit) || 0,
      payment_terms: paymentTerms.trim() || null,
      note: note.trim() || null,
      is_active: isActive,
    };

    const validate = savePartnerSchema.safeParse(payload);
    if (!validate.success) {
      const errMap: Record<string, string> = {};
      for (const issue of validate.error.issues) {
        const key = issue.path[0] as string;
        if (!errMap[key]) {
          errMap[key] = issue.message;
        }
      }
      setErrors(errMap);
      toast.error("Vui lòng kiểm tra lại thông tin đối tác");
      return;
    }

    try {
      setSubmitting(true);
      const res = await savePartnerAction(payload);
      if (res.ok) {
        toast.success(
          isEditing
            ? `Cập nhật đối tác "${name}" thành công`
            : `Thêm mới đối tác "${name}" thành công`,
        );
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(res.error.message || "Không thể lưu thông tin đối tác");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi xử lý server";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? "Chỉnh sửa hồ sơ đối tác"
              : "Thêm mới đối tác lữ hành & OTA"}
          </DialogTitle>
          <DialogDescription>
            Quản lý thông tin pháp lý, hợp đồng đại lý, hạn mức công nợ và tài
            khoản ngân hàng.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Thông tin cơ bản */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="partner-name">
                Tên đối tác / Doanh nghiệp{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="partner-name"
                placeholder="VD: Công ty Du lịch Vietravel, Agoda..."
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="partner-kind">
                Phân loại đối tác <span className="text-destructive">*</span>
              </Label>
              <select
                id="partner-kind"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                value={kind}
                onChange={(e) => setKind(e.target.value as PartnerKind)}
              >
                {partnerKinds.map((k) => (
                  <option key={k} value={k}>
                    {partnerKindLabels[k]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="partner-tax-code">Mã số thuế (MST)</Label>
              <Input
                id="partner-tax-code"
                placeholder="VD: 0300123456"
                value={taxCode}
                onChange={(e) => setTaxCode(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="partner-contact">Người liên hệ đại diện</Label>
              <Input
                id="partner-contact"
                placeholder="VD: Nguyễn Văn A (Phụ trách Tour)"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="partner-phone">Số điện thoại liên hệ</Label>
              <Input
                id="partner-phone"
                placeholder="VD: 0901234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="partner-email">
                Email nhận hóa đơn / Booking
              </Label>
              <Input
                id="partner-email"
                type="email"
                placeholder="VD: booking@vietravel.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="partner-address">Địa chỉ trụ sở</Label>
              <Input
                id="partner-address"
                placeholder="VD: 190 Pasteur, P. Võ Thị Sáu, Q.3, TP.HCM"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>

          {/* Công nợ & Ngân hàng */}
          <div className="rounded-lg border p-3.5 space-y-3 bg-muted/30">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Thông tin công nợ & Thanh toán
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="partner-credit-limit">
                  Hạn mức công nợ tối đa (VNĐ)
                </Label>
                <Input
                  id="partner-credit-limit"
                  type="number"
                  min="0"
                  step="1000000"
                  placeholder="0"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                />
                {errors.credit_limit && (
                  <p className="text-xs text-destructive">
                    {errors.credit_limit}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="partner-payment-terms">
                  Điều khoản công nợ
                </Label>
                <Input
                  id="partner-payment-terms"
                  placeholder="VD: Đối soát ngày 25 hàng tháng, hạn trả 15 ngày"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="partner-bank-name">Ngân hàng thụ hưởng</Label>
                <Input
                  id="partner-bank-name"
                  placeholder="VD: Vietcombank CN Tân Bình"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="partner-bank-account">Số tài khoản</Label>
                <Input
                  id="partner-bank-account"
                  placeholder="VD: 0071000123456"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="partner-bank-holder">Tên chủ tài khoản</Label>
                <Input
                  id="partner-bank-holder"
                  placeholder="VD: CONG TY CO PHAN DU LICH VIETRAVEL"
                  value={bankHolder}
                  onChange={(e) => setBankHolder(e.target.value.toUpperCase())}
                />
              </div>
            </div>
          </div>

          {/* Ghi chú & Trạng thái */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="partner-note">Ghi chú nghiệp vụ</Label>
              <textarea
                id="partner-note"
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Ghi chú sở thích đoàn, người phụ trách sales, quy định đón tiếp..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="partner-active" className="text-sm font-medium">
                  Đang hoạt động
                </Label>
                <p className="text-xs text-muted-foreground">
                  Cho phép chọn đối tác này khi tạo booking đoàn hoặc check-in
                </p>
              </div>
              <Switch
                id="partner-active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? "Đang lưu..."
                : isEditing
                  ? "Cập nhật"
                  : "Tạo đối tác"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
