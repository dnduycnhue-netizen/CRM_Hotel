"use client";

import { Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  commitProspectImportAction,
  parseProspectImportAction,
  previewProspectImportAction,
} from "../actions";
import {
  IMPORT_TEMPLATE_EXAMPLE,
  IMPORT_TEMPLATE_HEADERS,
} from "../domain/import-columns";
import {
  type ImportRow,
  MAX_IMPORT_ROWS,
  prospectKindLabels,
} from "../schemas";
import type { ImportCommitReport, ImportPreviewRow } from "../types";
import { duplicateMatchLabels, duplicateSourceLabels } from "./prospect-ui";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

type Step = "select" | "preview" | "done";

function downloadTemplate() {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = `﻿${[IMPORT_TEMPLATE_HEADERS, IMPORT_TEMPLATE_EXAMPLE]
    .map((r) => r.map(esc).join(","))
    .join("\r\n")}\r\n`;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "mau-nhap-khach-tiem-nang.csv";
  a.click();
  URL.revokeObjectURL(url);
}

const CLASS_BADGE: Record<
  ImportPreviewRow["classification"],
  { label: string; className: string }
> = {
  new: {
    label: "Mới",
    className: "border-emerald-500 text-emerald-700 bg-emerald-50",
  },
  soft: {
    label: "Nghi trùng",
    className: "border-amber-500 text-amber-700 bg-amber-50",
  },
  hard: {
    label: "Trùng cứng",
    className: "border-rose-500 text-rose-700 bg-rose-50",
  },
  invalid: {
    label: "Không hợp lệ",
    className: "border-slate-400 text-slate-600 bg-slate-50",
  },
};

/**
 * Import 2 bước bắt buộc: (1) xem trước/dry-run phân loại Mới / Nghi trùng / Trùng cứng,
 * (2) chỉ ghi các dòng được tick. Không bao giờ ghi thẳng từ file lên DB.
 */
export function ImportDialog({
  open,
  onOpenChange,
  onImported,
}: ImportDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("select");
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [preview, setPreview] = useState<Record<string, ImportPreviewRow>>({});
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [bulkReason, setBulkReason] = useState("");
  const [ignored, setIgnored] = useState<string[]>([]);
  const [report, setReport] = useState<ImportCommitReport | null>(null);

  function reset() {
    setStep("select");
    setRows([]);
    setPreview({});
    setSelected({});
    setReasons({});
    setBulkReason("");
    setIgnored([]);
    setReport(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function handleFile() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error("Vui lòng chọn file .xlsx hoặc .csv");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const parsed = await parseProspectImportAction(fd);
      if (!parsed.ok) {
        toast.error(parsed.error.message);
        return;
      }
      const prev = await previewProspectImportAction({
        rows: parsed.data.rows,
      });
      if (!prev.ok) {
        toast.error(prev.error.message);
        return;
      }
      const map: Record<string, ImportPreviewRow> = {};
      const sel: Record<string, boolean> = {};
      for (const r of prev.data) {
        map[r.row_id] = r;
        sel[r.row_id] = r.classification === "new";
      }
      setRows(parsed.data.rows);
      setIgnored(parsed.data.ignoredColumns);
      setPreview(map);
      setSelected(sel);
      setStep("preview");
    } finally {
      setBusy(false);
    }
  }

  const counts = rows.reduce(
    (acc, r) => {
      const c = preview[r.row_id]?.classification ?? "invalid";
      acc[c] += 1;
      return acc;
    },
    { new: 0, soft: 0, hard: 0, invalid: 0 },
  );

  const chosen = rows.filter(
    (r) => selected[r.row_id] && preview[r.row_id]?.classification !== "hard",
  );
  // Lý do riêng của dòng được ưu tiên; không có thì dùng lý do chung
  const reasonOf = (rowId: string) =>
    (reasons[rowId] ?? "").trim() || bulkReason.trim();
  const missingReason = chosen.some(
    (r) =>
      preview[r.row_id]?.classification === "soft" &&
      reasonOf(r.row_id).length < 3,
  );
  const softRows = rows.filter(
    (r) => preview[r.row_id]?.classification === "soft",
  );

  async function commit() {
    setBusy(true);
    try {
      const res = await commitProspectImportAction({
        rows: chosen.map((row) => {
          const isSoft = preview[row.row_id]?.classification === "soft";
          return {
            row,
            force: isSoft,
            force_reason: isSoft ? reasonOf(row.row_id) : null,
          };
        }),
      });
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      setReport(res.data);
      setStep("done");
      if (res.data.created > 0) onImported();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Nhập khách tiềm năng từ Excel / CSV
          </DialogTitle>
          <DialogDescription>
            Tối đa {MAX_IMPORT_ROWS} dòng mỗi lần. Hệ thống xem trước và phân
            loại trùng; chỉ những dòng bạn chọn mới được ghi.
          </DialogDescription>
        </DialogHeader>

        {step === "select" && (
          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-dashed p-6 space-y-3 text-center">
              <Input
                ref={fileRef}
                type="file"
                accept=".xlsx,.csv"
                className="max-w-sm mx-auto"
              />
              <p className="text-xs text-muted-foreground">
                Cột nhận diện: Tên công ty, Loại hình, SĐT, Email, Địa chỉ,
                Tỉnh/Vùng, Website, Nguồn (có thể thêm Người liên hệ, MST).
              </p>
              <div className="flex justify-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={downloadTemplate}
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Tải file mẫu
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={busy}
                  onClick={() => void handleFile()}
                >
                  {busy ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Đọc file & xem trước
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline" className={CLASS_BADGE.new.className}>
                Mới: {counts.new}
              </Badge>
              <Badge variant="outline" className={CLASS_BADGE.soft.className}>
                Nghi trùng: {counts.soft}
              </Badge>
              <Badge variant="outline" className={CLASS_BADGE.hard.className}>
                Trùng cứng (bị loại): {counts.hard}
              </Badge>
              <Badge
                variant="outline"
                className={CLASS_BADGE.invalid.className}
              >
                Không hợp lệ: {counts.invalid}
              </Badge>
              {ignored.length > 0 && (
                <span className="text-muted-foreground">
                  Bỏ qua cột: {ignored.join(", ")}
                </span>
              )}
            </div>

            {softRows.length > 0 && (
              <div className="rounded-lg border border-amber-500/50 bg-amber-50 dark:bg-amber-950/20 p-3 space-y-2">
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                  {softRows.length} dòng nghi trùng (mặc định chưa chọn). Có thể
                  chọn tất cả và dùng chung một lý do, hoặc nhập lý do riêng
                  từng dòng.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Input
                    className="h-8 text-xs flex-1 min-w-64"
                    placeholder="Lý do chung, VD: Chi nhánh khác nhau / pháp nhân khác"
                    value={bulkReason}
                    onChange={(e) => setBulkReason(e.target.value)}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setSelected((s) => {
                        const next = { ...s };
                        for (const r of softRows) next[r.row_id] = true;
                        return next;
                      })
                    }
                  >
                    Chọn tất cả dòng nghi trùng
                  </Button>
                </div>
              </div>
            )}

            <div className="rounded-lg border overflow-x-auto max-h-[52vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead className="w-14">Dòng</TableHead>
                    <TableHead>Công ty</TableHead>
                    <TableHead>Loại hình</TableHead>
                    <TableHead>SĐT / Email</TableHead>
                    <TableHead>Tỉnh</TableHead>
                    <TableHead>Phân loại</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const pr = preview[r.row_id];
                    const cls = pr?.classification ?? "invalid";
                    const selectable = cls === "new" || cls === "soft";
                    return (
                      <TableRow key={r.row_id}>
                        <TableCell>
                          <Checkbox
                            checked={Boolean(selected[r.row_id])}
                            disabled={!selectable}
                            onCheckedChange={(c) =>
                              setSelected((s) => ({
                                ...s,
                                [r.row_id]: Boolean(c),
                              }))
                            }
                          />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.row_id}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {r.company_name || "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {prospectKindLabels[r.kind ?? "other"]}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {r.phone || r.email || "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {r.province || "—"}
                        </TableCell>
                        <TableCell className="text-xs space-y-1 min-w-56">
                          <Badge
                            variant="outline"
                            className={CLASS_BADGE[cls].className}
                          >
                            {CLASS_BADGE[cls].label}
                          </Badge>
                          {pr?.message && (
                            <p className="text-muted-foreground">
                              {pr.message}
                            </p>
                          )}
                          {pr?.hard && (
                            <p>
                              {duplicateSourceLabels[pr.hard.source]}:{" "}
                              <strong>{pr.hard.name}</strong>
                            </p>
                          )}
                          {cls === "soft" &&
                            pr?.candidates.map((c) => (
                              <p
                                key={`${c.source}-${c.id ?? c.name}-${c.match_type}`}
                              >
                                {duplicateMatchLabels[c.match_type]}:{" "}
                                <strong>{c.name}</strong>
                              </p>
                            ))}
                          {cls === "soft" && selected[r.row_id] && (
                            <Input
                              placeholder={
                                bulkReason.trim() || "Lý do vẫn tạo (bắt buộc)"
                              }
                              className="h-7 text-xs"
                              value={reasons[r.row_id] ?? ""}
                              onChange={(e) =>
                                setReasons((s) => ({
                                  ...s,
                                  [r.row_id]: e.target.value,
                                }))
                              }
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={reset}>
                Chọn file khác
              </Button>
              <Button
                type="button"
                disabled={busy || chosen.length === 0 || missingReason}
                onClick={() => void commit()}
              >
                {busy && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                Ghi {chosen.length} dòng đã chọn
              </Button>
            </DialogFooter>
            {missingReason && (
              <p className="text-xs text-amber-700 text-right">
                Dòng nghi trùng đã chọn cần ghi lý do trước khi ghi.
              </p>
            )}
          </div>
        )}

        {step === "done" && report && (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
              <div className="rounded-lg border p-3">
                <p className="text-2xl font-bold text-emerald-600">
                  {report.created}
                </p>
                <p className="text-xs text-muted-foreground">Tạo mới</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-2xl font-bold text-rose-600">
                  {report.skipped_hard}
                </p>
                <p className="text-xs text-muted-foreground">
                  Trùng cứng bị loại
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-2xl font-bold text-amber-600">
                  {report.skipped_needs_reason}
                </p>
                <p className="text-xs text-muted-foreground">
                  Nghi trùng chưa có lý do
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-2xl font-bold">{report.failed}</p>
                <p className="text-xs text-muted-foreground">Lỗi khác</p>
              </div>
            </div>
            {report.results.some((r) => r.result !== "created") && (
              <ul className="rounded-lg border p-3 text-xs space-y-1 max-h-48 overflow-y-auto">
                {report.results
                  .filter((r) => r.result !== "created")
                  .map((r) => (
                    <li key={r.row_id}>
                      Dòng {r.row_id}: {r.message}
                    </li>
                  ))}
              </ul>
            )}
            <DialogFooter>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Đóng
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
