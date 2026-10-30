"use client";

import {
  AlertTriangle,
  ArrowRightLeft,
  CalendarClock,
  CheckCircle2,
  Handshake,
  Loader2,
  Pencil,
  Trash2,
  UserCog,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  assignProspectAction,
  claimProspectAction,
  convertProspectAction,
  deleteProspectAction,
  getProspectDetailAction,
  resolveProspectDuplicateAction,
  setProspectStatusAction,
} from "../actions";
import {
  manualProspectStatuses,
  prospectChannelLabels,
  prospectKindLabels,
  prospectOutcomeLabels,
  prospectPriorityLabels,
  prospectStatusLabels,
} from "../schemas";
import type {
  Prospect,
  ProspectAssignee,
  ProspectDetail as ProspectDetailData,
} from "../types";
import { InteractionLogForm } from "./interaction-log-form";
import {
  fmtDate,
  ProspectStatusBadge,
  selectClass,
  textareaClass,
  todayVn,
} from "./prospect-ui";

interface ProspectDetailProps {
  prospectId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignees: ProspectAssignee[];
  /** Danh sách hiện có, dùng để chọn bản ghi gốc khi đánh dấu trùng lặp */
  siblings: Array<{ id: string; company_name: string }>;
  canAssign: boolean;
  canConvert: boolean;
  canDelete?: boolean;
  onEdit: (prospect: Prospect) => void;
  onChanged: () => void;
}

/** Giá trị ô chọn "Người phụ trách mới" cho lựa chọn Không gán */
const UNASSIGN_OPTION = "__none__";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-0.5">
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm break-words">{children || "—"}</dd>
    </div>
  );
}

export function ProspectDetailDialog({
  prospectId,
  open,
  onOpenChange,
  assignees,
  siblings,
  canAssign,
  canConvert,
  canDelete = false,
  onEdit,
  onChanged,
}: ProspectDetailProps) {
  const [detail, setDetail] = useState<ProspectDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [panel, setPanel] = useState<"none" | "status" | "assign">("none");
  const [busy, setBusy] = useState(false);

  const [status, setStatus] =
    useState<(typeof manualProspectStatuses)[number]>("contacted");
  const [statusNote, setStatusNote] = useState("");
  const [statusDate, setStatusDate] = useState("");
  const [duplicateOf, setDuplicateOf] = useState("");
  const [assignee, setAssignee] = useState("");
  const [confirmingConvert, setConfirmingConvert] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [partnerClash, setPartnerClash] = useState<{
    message: string;
    name: string | null;
  } | null>(null);

  const load = useCallback(async () => {
    if (!prospectId) return;
    setLoading(true);
    const res = await getProspectDetailAction(prospectId);
    setLoading(false);
    if (res.ok) {
      setDetail(res.data);
    } else {
      toast.error(res.error.message);
      onOpenChange(false);
    }
  }, [prospectId, onOpenChange]);

  useEffect(() => {
    if (open && prospectId) {
      setDetail(null);
      setPanel("none");
      setConfirmingConvert(false);
      setPartnerClash(null);
      void load();
    }
  }, [open, prospectId, load]);

  const p = detail?.prospect;
  const isActive =
    p &&
    (p.status === "new" ||
      p.status === "contacted" ||
      p.status === "nurturing" ||
      p.status === "negotiating");

  async function afterChange() {
    await load();
    onChanged();
  }

  async function submitStatus() {
    if (!p) return;
    setBusy(true);
    try {
      const res = await setProspectStatusAction({
        id: p.id,
        status,
        note: statusNote.trim() || null,
        next_follow_up_at: statusDate || null,
        duplicate_of: duplicateOf || null,
      });
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success("Đã cập nhật trạng thái");
      setPanel("none");
      setStatusNote("");
      await afterChange();
    } finally {
      setBusy(false);
    }
  }

  async function submitAssign() {
    if (!p || !assignee) return;
    const unassign = assignee === UNASSIGN_OPTION;
    setBusy(true);
    try {
      const res = await assignProspectAction({
        id: p.id,
        assignee: unassign ? null : assignee,
      });
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success(
        unassign
          ? "Đã bỏ gán, sales có thể tự nhận chăm sóc"
          : "Đã chuyển người phụ trách",
      );
      setPanel("none");
      await afterChange();
    } finally {
      setBusy(false);
    }
  }

  async function submitClaim() {
    if (!p) return;
    setBusy(true);
    try {
      const res = await claimProspectAction(p.id);
      if (!res.ok) {
        toast.error(res.error.message);
        await afterChange();
        return;
      }
      toast.success("Bạn đã nhận chăm sóc khách tiềm năng này");
      await afterChange();
    } finally {
      setBusy(false);
    }
  }

  async function submitConvert() {
    if (!p) return;
    setBusy(true);
    try {
      const res = await convertProspectAction(p.id);
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      if (res.data.status === "duplicate_partner") {
        setPartnerClash({
          message: res.data.message,
          name: res.data.partner?.name ?? null,
        });
        setConfirmingConvert(false);
        return;
      }
      toast.success(
        res.data.already_converted
          ? "Khách tiềm năng này đã được chuyển đổi trước đó"
          : `Đã tạo đối tác "${p.company_name}". Tiếp tục làm việc tại mục Đối tác.`,
      );
      setConfirmingConvert(false);
      await afterChange();
    } finally {
      setBusy(false);
    }
  }

  async function submitDelete() {
    if (!p) return;
    setBusy(true);
    try {
      const res = await deleteProspectAction(p.id);
      if (!res.ok) {
        toast.error(res.error.message || "Xóa khách tiềm năng thất bại");
        return;
      }
      toast.success(
        `Đã chuyển khách tiềm năng "${p.company_name}" vào thùng rác`,
      );
      setConfirmingDelete(false);
      onOpenChange(false);
      onChanged();
    } catch {
      toast.error("Không thể xóa khách tiềm năng lúc này");
    } finally {
      setBusy(false);
    }
  }

  async function submitResolve() {
    if (!p) return;
    setBusy(true);
    try {
      const res = await resolveProspectDuplicateAction(p.id);
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success("Đã xác nhận xem xét cảnh báo trùng");
      await afterChange();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {p?.company_name ?? "Khách tiềm năng"}
            {p && <ProspectStatusBadge status={p.status} />}
          </DialogTitle>
          <DialogDescription>
            {p
              ? `${prospectKindLabels[p.kind]} · Ưu tiên ${prospectPriorityLabels[p.priority].toLowerCase()}`
              : "Đang tải hồ sơ..."}
          </DialogDescription>
        </DialogHeader>

        {loading && !detail && (
          <div className="py-16 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {p && (
          <div className="space-y-4">
            {/* Banner phụ trách: chống gọi chồng chéo */}
            {p.status === "converted" ? (
              <div className="rounded-lg border border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/20 p-3 text-sm space-y-1.5">
                <p className="font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  Đã chuyển đổi thành đối tác
                  {p.converted_partner_name
                    ? ` "${p.converted_partner_name}"`
                    : ""}{" "}
                  ngày {fmtDate(p.converted_at)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Hồ sơ đã khóa chỉnh sửa. Hợp đồng giá, đoàn và hoa hồng tiếp
                  tục làm tại mục Đối tác & Khách đoàn.
                </p>
                <Link
                  href="/partners"
                  className={buttonVariants({
                    variant: "outline",
                    size: "sm",
                    className: "h-8",
                  })}
                >
                  <Handshake className="h-3.5 w-3.5 mr-1.5" />
                  Mở Đối tác & Khách đoàn
                </Link>
              </div>
            ) : (
              <div
                className={`rounded-lg border p-3 text-sm flex flex-wrap items-center gap-x-4 gap-y-1 ${
                  p.is_overdue
                    ? "border-rose-500/60 bg-rose-50 dark:bg-rose-950/20"
                    : "bg-muted/30"
                }`}
              >
                <span className="font-semibold">
                  {p.assigned_to_name
                    ? `Đang do ${p.assigned_to_name} chăm sóc`
                    : "Chưa gán"}
                </span>
                {p.can_claim && (
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => void submitClaim()}
                  >
                    {busy && (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    )}
                    Nhận chăm sóc
                  </Button>
                )}
                <span className="text-muted-foreground">
                  Lần liên hệ cuối: {fmtDate(p.last_contacted_at)}
                </span>
                <span
                  className={
                    p.is_overdue
                      ? "text-rose-600 font-semibold"
                      : "text-muted-foreground"
                  }
                >
                  <CalendarClock className="inline h-3.5 w-3.5 mr-1" />
                  Hẹn tiếp: {fmtDate(p.next_follow_up_at)}
                  {p.is_overdue ? " (quá hạn)" : ""}
                </span>
                {p.is_masked && p.assigned_to && (
                  <span className="text-xs text-muted-foreground">
                    Muốn liên hệ, hãy hỏi người phụ trách trước.
                  </span>
                )}
              </div>
            )}

            {p.status === "duplicate" && detail?.duplicate_of && (
              <div className="rounded-lg border border-purple-400/50 bg-purple-50 dark:bg-purple-950/20 p-3 text-sm">
                Bản ghi trùng lặp của{" "}
                <strong>{detail.duplicate_of.name}</strong>.
              </div>
            )}
            {p.status === "lost" && p.lost_reason && (
              <div className="rounded-lg border border-rose-400/50 bg-rose-50 dark:bg-rose-950/20 p-3 text-sm">
                Không tiềm năng: {p.lost_reason}
              </div>
            )}

            {!p.dup_reviewed && (
              <div className="rounded-lg border border-amber-500/60 bg-amber-50 dark:bg-amber-950/20 p-3 text-sm space-y-2">
                <p className="font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" />
                  Chờ xử lý trùng
                </p>
                <p className="text-xs">
                  Được tạo dù nghi trùng. Lý do:{" "}
                  <em>{p.dup_override_reason ?? "—"}</em>
                </p>
                {p.can_edit && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void submitResolve()}
                  >
                    Đã xem xét, không trùng
                  </Button>
                )}
              </div>
            )}

            {partnerClash && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm space-y-1.5">
                <p className="font-semibold text-destructive">
                  {partnerClash.message}
                </p>
                <Link
                  href="/partners"
                  className="text-primary underline text-xs"
                >
                  {partnerClash.name
                    ? `Xem đối tác "${partnerClash.name}"`
                    : "Xem tại Đối tác"}
                </Link>
              </div>
            )}

            {/* Hành động */}
            {p.can_edit && (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => onEdit(p)}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Sửa thông tin
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setPanel(panel === "status" ? "none" : "status")
                  }
                >
                  <ArrowRightLeft className="h-3.5 w-3.5 mr-1.5" />
                  Đổi trạng thái
                </Button>
                {canAssign && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setPanel(panel === "assign" ? "none" : "assign")
                    }
                  >
                    <UserCog className="h-3.5 w-3.5 mr-1.5" />
                    Chuyển phụ trách
                  </Button>
                )}
                {canConvert && isActive && (
                  <Button
                    size="sm"
                    onClick={() => setConfirmingConvert(true)}
                    disabled={busy}
                  >
                    <Handshake className="h-3.5 w-3.5 mr-1.5" />
                    Chuyển thành đối tác
                  </Button>
                )}
                {canDelete && p.status !== "converted" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                    onClick={() => setConfirmingDelete(true)}
                    disabled={busy}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    Chuyển vào thùng rác
                  </Button>
                )}
              </div>
            )}

            {confirmingDelete && (
              <div className="rounded-lg border border-amber-500/40 p-3.5 space-y-2.5 bg-amber-50/50 dark:bg-amber-950/20">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  Chuyển khách tiềm năng vào Thùng rác
                </div>
                <p className="text-sm text-foreground">
                  Bạn có chắc muốn chuyển <strong>{p.company_name}</strong> vào
                  thùng rác? Hồ sơ sẽ tạm ẩn khỏi danh sách theo dõi nhưng toàn
                  bộ nhật ký chăm sóc vẫn được bảo toàn và có thể khôi phục lại
                  bất kỳ lúc nào.
                </p>
                <div className="flex gap-2 justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => setConfirmingDelete(false)}
                  >
                    Hủy
                  </Button>
                  <Button
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                    disabled={busy}
                    onClick={() => void submitDelete()}
                  >
                    {busy && (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    )}
                    Chuyển vào thùng rác
                  </Button>
                </div>
              </div>
            )}

            {confirmingConvert && (
              <div className="rounded-lg border p-3 space-y-2 bg-muted/20">
                <p className="text-sm">
                  Tạo đối tác mới từ <strong>{p.company_name}</strong>? Hồ sơ
                  khách tiềm năng sẽ chuyển sang "Đã chuyển đổi" và bị khóa
                  chỉnh sửa.
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => void submitConvert()}
                  >
                    {busy && (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    )}
                    Xác nhận chuyển đổi
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setConfirmingConvert(false)}
                  >
                    Hủy
                  </Button>
                </div>
              </div>
            )}

            {panel === "status" && (
              <div className="rounded-lg border p-3 space-y-3 bg-muted/20">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="st-status" className="text-xs">
                      Trạng thái mới
                    </Label>
                    <select
                      id="st-status"
                      className={selectClass}
                      value={status}
                      onChange={(e) =>
                        setStatus(e.target.value as typeof status)
                      }
                    >
                      {manualProspectStatuses.map((s) => (
                        <option key={s} value={s}>
                          {prospectStatusLabels[s]}
                        </option>
                      ))}
                    </select>
                  </div>
                  {(status === "nurturing" || status === "negotiating") && (
                    <div className="space-y-1.5">
                      <Label htmlFor="st-date" className="text-xs">
                        Hẹn liên hệ tiếp *
                      </Label>
                      <Input
                        id="st-date"
                        type="date"
                        min={todayVn()}
                        value={statusDate}
                        onChange={(e) => setStatusDate(e.target.value)}
                      />
                    </div>
                  )}
                  {status === "duplicate" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="st-dup" className="text-xs">
                        Bản ghi gốc *
                      </Label>
                      <select
                        id="st-dup"
                        className={selectClass}
                        value={duplicateOf}
                        onChange={(e) => setDuplicateOf(e.target.value)}
                      >
                        <option value="">Chọn bản ghi gốc...</option>
                        {siblings
                          .filter((s) => s.id !== p.id)
                          .map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.company_name}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="st-note" className="text-xs">
                    Ghi chú{status === "lost" ? " (bắt buộc: lý do)" : ""}
                  </Label>
                  <textarea
                    id="st-note"
                    rows={2}
                    className={textareaClass}
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => void submitStatus()}
                  >
                    Lưu trạng thái
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPanel("none")}
                  >
                    Hủy
                  </Button>
                </div>
              </div>
            )}

            {panel === "assign" && canAssign && (
              <div className="rounded-lg border p-3 space-y-3 bg-muted/20">
                <Label htmlFor="as-user" className="text-xs">
                  Người phụ trách mới
                </Label>
                <select
                  id="as-user"
                  className={selectClass}
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                >
                  <option value="">Chọn nhân viên...</option>
                  {p.assigned_to && (
                    <option value={UNASSIGN_OPTION}>
                      Không gán — để sales tự nhận sau
                    </option>
                  )}
                  {assignees.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                {assignee === UNASSIGN_OPTION && (
                  <p className="text-xs text-amber-700">
                    Prospect sẽ về trạng thái chưa gán (giữ nguyên trạng thái
                    chăm sóc hiện tại). Bất kỳ sales nào có quyền cũng có thể
                    bấm "Nhận chăm sóc".
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={busy || !assignee}
                    onClick={() => void submitAssign()}
                  >
                    Chuyển phụ trách
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPanel("none")}
                  >
                    Hủy
                  </Button>
                </div>
              </div>
            )}

            {/* Thông tin */}
            <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3 rounded-lg border p-3">
              <Field label="SĐT công ty">
                <span className="font-mono">{p.phone_display}</span>
              </Field>
              <Field label="Email">{p.email}</Field>
              <Field label="Mã số thuế">{p.tax_code}</Field>
              <Field label="Website">{p.website}</Field>
              <Field label="Tỉnh / thành">{p.province}</Field>
              <Field label="Địa chỉ">{p.address}</Field>
              <Field label="Người liên hệ">
                {[p.contact_name, p.contact_title].filter(Boolean).join(" — ")}
              </Field>
              <Field label="SĐT người liên hệ">
                <span className="font-mono">{p.contact_phone_display}</span>
              </Field>
              <Field label="Nguồn">{p.source}</Field>
              <Field label="Quy mô ước tính">
                {p.estimated_groups_per_year != null ||
                p.estimated_guests_per_year != null
                  ? `${p.estimated_groups_per_year ?? "?"} đoàn / ${p.estimated_guests_per_year ?? "?"} khách mỗi năm`
                  : ""}
              </Field>
              <Field label="Tạo lúc">{fmtDate(p.created_at)}</Field>
              <Field label="Ghi chú">
                <span className="whitespace-pre-line">{p.note}</span>
              </Field>
            </dl>

            {/* Nhật ký chăm sóc */}
            {p.can_edit && (
              <InteractionLogForm
                prospectId={p.id}
                onLogged={() => void afterChange()}
              />
            )}

            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Dòng thời gian chăm sóc ({detail?.interactions.length ?? 0})
              </h4>
              {detail && detail.interactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Chưa có lần liên hệ nào.
                </p>
              ) : (
                <ol className="space-y-2">
                  {detail?.interactions.map((i) => (
                    <li
                      key={i.id}
                      className="rounded-lg border p-2.5 text-sm space-y-1"
                    >
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{fmtDate(i.created_at)}</span>
                        <span>·</span>
                        <span>{i.created_by_name ?? "Hệ thống"}</span>
                        {i.entry_type === "contact" && i.channel && (
                          <Badge variant="outline" className="text-[10px]">
                            {prospectChannelLabels[i.channel]}
                          </Badge>
                        )}
                        {i.entry_type === "contact" && i.outcome && (
                          <Badge variant="outline" className="text-[10px]">
                            {prospectOutcomeLabels[i.outcome]}
                          </Badge>
                        )}
                        {i.entry_type !== "contact" && (
                          <Badge
                            variant="outline"
                            className="text-[10px] border-slate-400"
                          >
                            {i.entry_type === "status_change"
                              ? "Thay đổi"
                              : "Hệ thống"}
                          </Badge>
                        )}
                      </div>
                      {i.note && (
                        <p className="whitespace-pre-line">{i.note}</p>
                      )}
                      {i.next_follow_up_at && (
                        <p className="text-xs text-muted-foreground">
                          Hẹn tiếp: {fmtDate(i.next_follow_up_at)}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
