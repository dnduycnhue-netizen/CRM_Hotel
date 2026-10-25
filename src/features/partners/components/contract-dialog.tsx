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
import { savePartnerContractAction } from "../actions";
import {
  contractStatuses,
  contractStatusLabels,
  type SavePartnerContractInput,
  savePartnerContractSchema,
} from "../schemas";
import type { ContractStatus, Partner, PartnerContract } from "../types";

interface ContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partners: Partner[];
  contract?: PartnerContract | null;
  defaultPartnerId?: string;
  readOnly?: boolean;
  onSuccess?: () => void;
}

export function ContractDialog({
  open,
  onOpenChange,
  partners,
  contract,
  defaultPartnerId,
  readOnly = false,
  onSuccess,
}: ContractDialogProps) {
  const isEditing = Boolean(contract?.id);

  const [partnerId, setPartnerId] = useState(
    contract?.partner_id || defaultPartnerId || (partners[0]?.id ?? ""),
  );
  const [contractNumber, setContractNumber] = useState(
    contract?.contract_number || "",
  );
  const [validFrom, setValidFrom] = useState(
    contract?.valid_from || new Date().toISOString().slice(0, 10),
  );
  const [validTo, setValidTo] = useState(
    contract?.valid_to ||
      new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10),
  );
  const [discountPct, setDiscountPct] = useState(
    contract?.discount_pct !== undefined ? String(contract.discount_pct) : "15",
  );
  const [commissionRatePct, setCommissionRatePct] = useState(
    contract?.commission_rate_pct !== undefined
      ? String(contract.commission_rate_pct)
      : "10",
  );
  const [paymentTerms, setPaymentTerms] = useState(
    contract?.payment_terms ||
      "Thanh toán trong 15 ngày sau khi khách trả phòng",
  );
  const [status, setStatus] = useState<ContractStatus>(
    contract?.status || "active",
  );
  const [attachmentUrl, setAttachmentUrl] = useState(
    contract?.attachment_url || "",
  );
  const [note, setNote] = useState(contract?.note || "");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const payload: SavePartnerContractInput = {
      id: contract?.id || null,
      partner_id: partnerId,
      contract_number: contractNumber.trim(),
      valid_from: validFrom,
      valid_to: validTo,
      discount_pct: Number(discountPct) || 0,
      commission_rate_pct: Number(commissionRatePct) || 0,
      payment_terms: paymentTerms.trim() || null,
      status,
      attachment_url: attachmentUrl.trim() || null,
      note: note.trim() || null,
    };

    const validate = savePartnerContractSchema.safeParse(payload);
    if (!validate.success) {
      const errMap: Record<string, string> = {};
      for (const issue of validate.error.issues) {
        const key = issue.path[0] as string;
        if (!errMap[key]) {
          errMap[key] = issue.message;
        }
      }
      setErrors(errMap);
      toast.error("Vui lòng kiểm tra lại thông tin hợp đồng");
      return;
    }

    try {
      setSubmitting(true);
      const res = await savePartnerContractAction(payload);
      if (res.ok) {
        toast.success(
          isEditing
            ? `Cập nhật hợp đồng "${contractNumber}" thành công`
            : `Ký kết hợp đồng "${contractNumber}" thành công`,
        );
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(res.error.message || "Không thể lưu hợp đồng");
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
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {readOnly
              ? `Chi tiết hợp đồng [${contract?.contract_number || ""}]`
              : isEditing
                ? "Cập nhật hợp đồng giá B2B"
                : "Ký mới hợp đồng giá & hoa hồng B2B"}
          </DialogTitle>
          <DialogDescription>
            {readOnly
              ? "Xem thông tin chiết khấu buôn, tỷ lệ hoa hồng đại lý và thời hạn hiệu lực."
              : "Thiết lập chính sách chiết khấu buôn, tỷ lệ hoa hồng đại lý và thời hạn hiệu lực."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={
            readOnly
              ? (e) => {
                  e.preventDefault();
                  onOpenChange(false);
                }
              : handleSubmit
          }
          className="space-y-4 py-2"
        >
          <div className="space-y-1.5">
            <Label htmlFor="contract-partner">
              Đối tác liên kết <span className="text-destructive">*</span>
            </Label>
            <select
              id="contract-partner"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-75"
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
              disabled={readOnly || (Boolean(defaultPartnerId) && !isEditing)}
            >
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.kind})
                </option>
              ))}
            </select>
            {errors.partner_id && (
              <p className="text-xs text-destructive">{errors.partner_id}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="contract-number">
                Số hợp đồng / Mã thỏa thuận{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="contract-number"
                placeholder="VD: HĐ-2026/VT-CRM, AGR-OTA-26..."
                value={contractNumber}
                onChange={(e) => setContractNumber(e.target.value)}
              />
              {errors.contract_number && (
                <p className="text-xs text-destructive">
                  {errors.contract_number}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contract-from">
                Ngày bắt đầu hiệu lực{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="contract-from"
                type="date"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
              />
              {errors.valid_from && (
                <p className="text-xs text-destructive">{errors.valid_from}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contract-to">
                Ngày hết hạn hợp đồng{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="contract-to"
                type="date"
                value={validTo}
                onChange={(e) => setValidTo(e.target.value)}
              />
              {errors.valid_to && (
                <p className="text-xs text-destructive">{errors.valid_to}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contract-discount">
                Chiết khấu phòng bán buôn (%)
              </Label>
              <Input
                id="contract-discount"
                type="number"
                min="0"
                max="100"
                value={discountPct}
                onChange={(e) => setDiscountPct(e.target.value)}
              />
              {errors.discount_pct && (
                <p className="text-xs text-destructive">
                  {errors.discount_pct}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contract-commission">
                Hoa hồng trích thưởng đại lý (%)
              </Label>
              <Input
                id="contract-commission"
                type="number"
                min="0"
                max="100"
                value={commissionRatePct}
                onChange={(e) => setCommissionRatePct(e.target.value)}
              />
              {errors.commission_rate_pct && (
                <p className="text-xs text-destructive">
                  {errors.commission_rate_pct}
                </p>
              )}
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="contract-status">Trạng thái hợp đồng</Label>
              <select
                id="contract-status"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                value={status}
                onChange={(e) => setStatus(e.target.value as ContractStatus)}
              >
                {contractStatuses.map((st) => (
                  <option key={st} value={st}>
                    {contractStatusLabels[st]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="contract-terms">
                Điều khoản thanh toán & phạt hủy
              </Label>
              <Input
                id="contract-terms"
                placeholder="VD: Cọc 50% trước 7 ngày, hủy trước 3 ngày không tính phí..."
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="contract-attachment">
                Đường dẫn file scan hợp đồng (URL/Drive)
              </Label>
              <Input
                id="contract-attachment"
                placeholder="https://drive.google.com/..."
                value={attachmentUrl}
                onChange={(e) => setAttachmentUrl(e.target.value)}
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="contract-note">Ghi chú bổ sung</Label>
              <textarea
                id="contract-note"
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Phụ lục phòng FOC cho HDV, dịch vụ hội nghị đi kèm..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            {readOnly ? (
              <Button type="button" onClick={() => onOpenChange(false)}>
                Đóng
              </Button>
            ) : (
              <>
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
                      : "Lưu hợp đồng"}
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
