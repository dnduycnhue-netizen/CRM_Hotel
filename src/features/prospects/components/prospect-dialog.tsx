"use client";

import { AlertTriangle, Loader2, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
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
  checkProspectDuplicatesAction,
  mergeProspectInfoAction,
  saveProspectAction,
} from "../actions";
import {
  prospectKindLabels,
  prospectKinds,
  prospectPriorities,
  prospectPriorityLabels,
  prospectSourceSuggestions,
  type SaveProspectData,
  saveProspectSchema,
} from "../schemas";
import type {
  DuplicateCandidate,
  Prospect,
  ProspectAssignee,
  SaveProspectOutcome,
} from "../types";
import { DuplicateWarningDialog } from "./duplicate-warning-dialog";
import {
  duplicateMatchLabels,
  duplicateSourceLabels,
  selectClass,
  textareaClass,
  todayVn,
} from "./prospect-ui";

interface ProspectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Có giá trị = chế độ sửa (chỉ mở được khi người dùng có thể sửa, SĐT đầy đủ) */
  prospect?: Prospect | null;
  assignees: ProspectAssignee[];
  canAssign: boolean;
  onSaved: (id: string) => void;
  onOpenProspect: (id: string) => void;
}

type FormState = {
  company_name: string;
  kind: (typeof prospectKinds)[number];
  tax_code: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  province: string;
  contact_name: string;
  contact_title: string;
  contact_phone: string;
  source: string;
  estimated_groups_per_year: string;
  estimated_guests_per_year: string;
  assigned_to: string;
  priority: (typeof prospectPriorities)[number];
  next_follow_up_at: string;
  note: string;
};

/** Giá trị ô chọn "Sales phụ trách" cho lựa chọn cố ý không gán (chỉ khi tạo mới) */
const UNASSIGNED_OPTION = "__none__";

function initialState(p?: Prospect | null): FormState {
  return {
    company_name: p?.company_name ?? "",
    kind: p?.kind ?? "tour_operator",
    tax_code: p?.tax_code ?? "",
    phone: p?.phone_display ?? "",
    email: p?.email ?? "",
    website: p?.website ?? "",
    address: p?.address ?? "",
    province: p?.province ?? "",
    contact_name: p?.contact_name ?? "",
    contact_title: p?.contact_title ?? "",
    contact_phone: p?.contact_phone_display ?? "",
    source: p?.source ?? "",
    estimated_groups_per_year:
      p?.estimated_groups_per_year != null
        ? String(p.estimated_groups_per_year)
        : "",
    estimated_guests_per_year:
      p?.estimated_guests_per_year != null
        ? String(p.estimated_guests_per_year)
        : "",
    assigned_to: p?.assigned_to ?? "",
    priority: p?.priority ?? "medium",
    next_follow_up_at: p?.next_follow_up_at ?? "",
    note: p?.note ?? "",
  };
}

export function ProspectDialog(props: ProspectDialogProps) {
  // Mount lại form mỗi lần mở để state luôn khớp bản ghi đang sửa
  if (!props.open) return null;
  return <ProspectDialogInner key={props.prospect?.id ?? "new"} {...props} />;
}

function ProspectDialogInner({
  open,
  onOpenChange,
  prospect,
  assignees,
  canAssign,
  onSaved,
  onOpenProspect,
}: ProspectDialogProps) {
  const isEditing = Boolean(prospect?.id);
  const [form, setForm] = useState<FormState>(() => initialState(prospect));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [blocked, setBlocked] = useState<Extract<
    SaveProspectOutcome,
    { status: "blocked" }
  > | null>(null);
  const [candidates, setCandidates] = useState<DuplicateCandidate[] | null>(
    null,
  );
  const [hints, setHints] = useState<DuplicateCandidate[]>([]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  // Kiểm tra trùng trực tiếp khi đang gõ (debounce) — chỉ gợi ý, server mới quyết định
  const { company_name, phone, tax_code, website, province } = form;
  useEffect(() => {
    const hasSignal =
      phone.trim().length >= 6 ||
      tax_code.trim().length >= 6 ||
      company_name.trim().length >= 3 ||
      website.trim().length >= 4;
    if (!hasSignal) {
      setHints([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      const res = await checkProspectDuplicatesAction({
        name: company_name,
        phone,
        tax_code,
        website,
        province,
        exclude_id: prospect?.id ?? null,
      });
      if (!cancelled && res.ok) setHints(res.data);
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [company_name, phone, tax_code, website, province, prospect?.id]);

  const hardHints = hints.filter(
    (h) => h.match_type === "hard_tax" || h.match_type === "hard_phone",
  );
  const softHints = hints.filter(
    (h) => h.match_type === "soft_name" || h.match_type === "soft_domain",
  );

  function buildPayload():
    | { ok: true; data: SaveProspectData }
    | { ok: false } {
    const raw = {
      id: prospect?.id ?? null,
      ...form,
      // undefined = mặc định (người tạo); null = cố ý không gán; uuid = gán người đó.
      // Sales không có quyền chọn nên không bao giờ gửi giá trị này.
      assigned_to: !canAssign
        ? undefined
        : form.assigned_to === UNASSIGNED_OPTION
          ? null
          : form.assigned_to || undefined,
    };
    const parsed = saveProspectSchema.safeParse(raw);
    if (!parsed.success) {
      const map: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "");
        if (key && !map[key]) map[key] = issue.message;
      }
      setErrors(map);
      toast.error("Vui lòng kiểm tra lại thông tin khách tiềm năng");
      return { ok: false };
    }
    setErrors({});
    return { ok: true, data: parsed.data };
  }

  async function submit(force: boolean, forceReason?: string) {
    const built = buildPayload();
    if (!built.ok) return;

    setSubmitting(true);
    setBlocked(null);
    try {
      const res = await saveProspectAction({
        prospect: built.data,
        force,
        force_reason: forceReason ?? null,
      });
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      const out = res.data;
      if (out.status === "blocked") {
        setCandidates(null);
        setBlocked(out);
        return;
      }
      if (out.status === "possible_duplicates") {
        setCandidates(out.candidates);
        return;
      }
      setCandidates(null);
      toast.success(
        isEditing
          ? `Đã cập nhật "${form.company_name}"`
          : `Đã thêm khách tiềm năng "${form.company_name}"`,
      );
      if (out.notices.length > 0) {
        toast.info(
          "Lưu ý: số điện thoại này cũng đang thuộc một khách lẻ trong hệ thống",
        );
      }
      onOpenChange(false);
      onSaved(out.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi xử lý server");
    } finally {
      setSubmitting(false);
    }
  }

  async function mergeInto(candidate: DuplicateCandidate) {
    const built = buildPayload();
    if (!built.ok || !candidate.id) return;
    setSubmitting(true);
    try {
      const res = await mergeProspectInfoAction({
        target_id: candidate.id,
        payload: built.data,
      });
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success(`Đã bổ sung thông tin vào "${candidate.name}"`);
      setCandidates(null);
      onOpenChange(false);
      onSaved(candidate.id);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing
                ? "Chỉnh sửa khách tiềm năng"
                : "Thêm khách tiềm năng B2B"}
            </DialogTitle>
            <DialogDescription>
              Công ty tour / doanh nghiệp chưa hợp tác. Cần tên công ty và ít
              nhất số điện thoại hoặc email để hệ thống chống trùng.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit(false);
            }}
            className="space-y-4 py-1"
          >
            {blocked && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm space-y-1.5">
                <p className="font-semibold text-destructive flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4" />
                  {blocked.message}
                </p>
                {blocked.duplicate &&
                  (blocked.duplicate.source === "partner" ? (
                    <Link
                      href="/partners"
                      className="text-primary underline text-xs"
                    >
                      Xem đối tác "{blocked.duplicate.name}" tại Đối tác
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="text-primary underline text-xs"
                      onClick={() => {
                        const id = blocked.duplicate?.id;
                        if (!id) return;
                        onOpenChange(false);
                        onOpenProspect(id);
                      }}
                    >
                      Mở khách tiềm năng "{blocked.duplicate.name}"
                    </button>
                  ))}
              </div>
            )}

            {hardHints.length > 0 && !blocked && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-xs space-y-1">
                <p className="font-semibold text-destructive">
                  Không thể tạo: đã tồn tại
                </p>
                {hardHints.map((h) => (
                  <p key={`${h.source}-${h.id}-${h.match_type}`}>
                    {duplicateMatchLabels[h.match_type]} —{" "}
                    <strong>{h.name}</strong> (
                    {duplicateSourceLabels[h.source] ?? h.source})
                  </p>
                ))}
              </div>
            )}

            {softHints.length > 0 && hardHints.length === 0 && (
              <div className="rounded-lg border border-amber-500/50 bg-amber-50 dark:bg-amber-950/20 p-3 text-xs space-y-1">
                <p className="font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Có thể trùng với bản ghi sẵn có
                </p>
                {softHints.map((h) => (
                  <p key={`${h.source}-${h.id}-${h.match_type}`}>
                    {duplicateMatchLabels[h.match_type]} —{" "}
                    <strong>{h.name}</strong> (
                    {duplicateSourceLabels[h.source] ?? h.source})
                  </p>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="pr-name">
                  Tên công ty <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="pr-name"
                  placeholder="VD: Công ty TNHH Du lịch Biển Xanh"
                  value={form.company_name}
                  onChange={(e) => set("company_name", e.target.value)}
                />
                {errors.company_name && (
                  <p className="text-xs text-destructive">
                    {errors.company_name}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pr-kind">Loại hình</Label>
                <select
                  id="pr-kind"
                  className={selectClass}
                  value={form.kind}
                  onChange={(e) =>
                    set("kind", e.target.value as FormState["kind"])
                  }
                >
                  {prospectKinds.map((k) => (
                    <option key={k} value={k}>
                      {prospectKindLabels[k]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pr-tax">Mã số thuế</Label>
                <Input
                  id="pr-tax"
                  placeholder="VD: 0312345678"
                  value={form.tax_code}
                  onChange={(e) => set("tax_code", e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pr-phone">Số điện thoại công ty</Label>
                <Input
                  id="pr-phone"
                  placeholder="VD: 0909 123 456 hoặc +84909123456"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                />
                {errors.phone && (
                  <p className="text-xs text-destructive">{errors.phone}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pr-email">Email</Label>
                <Input
                  id="pr-email"
                  type="email"
                  placeholder="VD: booking@congty.vn"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pr-web">Website</Label>
                <Input
                  id="pr-web"
                  placeholder="VD: https://congty.vn"
                  value={form.website}
                  onChange={(e) => set("website", e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pr-province">Tỉnh / thành</Label>
                <Input
                  id="pr-province"
                  placeholder="VD: Bình Định"
                  value={form.province}
                  onChange={(e) => set("province", e.target.value)}
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="pr-address">Địa chỉ</Label>
                <Input
                  id="pr-address"
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                />
              </div>
            </div>

            <div className="rounded-lg border p-3.5 space-y-3 bg-muted/30">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Người liên hệ
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="pr-cname">Họ tên</Label>
                  <Input
                    id="pr-cname"
                    value={form.contact_name}
                    onChange={(e) => set("contact_name", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pr-ctitle">Chức vụ</Label>
                  <Input
                    id="pr-ctitle"
                    value={form.contact_title}
                    onChange={(e) => set("contact_title", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pr-cphone">SĐT người liên hệ</Label>
                  <Input
                    id="pr-cphone"
                    value={form.contact_phone}
                    onChange={(e) => set("contact_phone", e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="pr-source">Nguồn tìm được</Label>
                <Input
                  id="pr-source"
                  list="pr-source-list"
                  placeholder="VD: Hội chợ du lịch"
                  value={form.source}
                  onChange={(e) => set("source", e.target.value)}
                />
                <datalist id="pr-source-list">
                  {prospectSourceSuggestions.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pr-groups">Số đoàn / năm (ước tính)</Label>
                <Input
                  id="pr-groups"
                  type="number"
                  min={0}
                  value={form.estimated_groups_per_year}
                  onChange={(e) =>
                    set("estimated_groups_per_year", e.target.value)
                  }
                />
                {errors.estimated_groups_per_year && (
                  <p className="text-xs text-destructive">
                    {errors.estimated_groups_per_year}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pr-guests">Số khách / năm (ước tính)</Label>
                <Input
                  id="pr-guests"
                  type="number"
                  min={0}
                  value={form.estimated_guests_per_year}
                  onChange={(e) =>
                    set("estimated_guests_per_year", e.target.value)
                  }
                />
                {errors.estimated_guests_per_year && (
                  <p className="text-xs text-destructive">
                    {errors.estimated_guests_per_year}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pr-priority">Độ ưu tiên</Label>
                <select
                  id="pr-priority"
                  className={selectClass}
                  value={form.priority}
                  onChange={(e) =>
                    set("priority", e.target.value as FormState["priority"])
                  }
                >
                  {prospectPriorities.map((p) => (
                    <option key={p} value={p}>
                      {prospectPriorityLabels[p]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pr-follow">Hẹn liên hệ tiếp</Label>
                <Input
                  id="pr-follow"
                  type="date"
                  min={todayVn()}
                  value={form.next_follow_up_at}
                  onChange={(e) => set("next_follow_up_at", e.target.value)}
                />
              </div>

              {canAssign && (
                <div className="space-y-1.5">
                  <Label htmlFor="pr-assign">Sales phụ trách</Label>
                  <select
                    id="pr-assign"
                    className={selectClass}
                    value={form.assigned_to}
                    onChange={(e) => set("assigned_to", e.target.value)}
                  >
                    <option value="">
                      {isEditing ? "Giữ nguyên" : "Mặc định: chính tôi"}
                    </option>
                    {!isEditing && (
                      <option value={UNASSIGNED_OPTION}>
                        Không gán — để sales tự nhận sau
                      </option>
                    )}
                    {assignees.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pr-note">Ghi chú</Label>
              <textarea
                id="pr-note"
                rows={2}
                className={textareaClass}
                placeholder="Thông tin thêm về công ty, nhu cầu, lưu ý khi liên hệ..."
                value={form.note}
                onChange={(e) => set("note", e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={submitting || hardHints.length > 0}
              >
                {submitting && (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                )}
                {isEditing ? "Lưu thay đổi" : "Thêm khách tiềm năng"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DuplicateWarningDialog
        open={candidates !== null}
        candidates={candidates ?? []}
        busy={submitting}
        onCancel={() => setCandidates(null)}
        onOpenExisting={(c) => {
          if (!c.id) return;
          setCandidates(null);
          onOpenChange(false);
          onOpenProspect(c.id);
        }}
        onMerge={(c) => void mergeInto(c)}
        onForceCreate={(reason) => void submit(true, reason)}
      />
    </>
  );
}
