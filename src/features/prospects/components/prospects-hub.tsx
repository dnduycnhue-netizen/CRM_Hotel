"use client";

import {
  AlertTriangle,
  CalendarClock,
  Download,
  FileSpreadsheet,
  Handshake,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  Target,
  Trash2,
  Trophy,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  claimProspectAction,
  convertProspectAction,
  deleteProspectAction,
  exportProspectsAction,
  getProspectsOverviewAction,
  listProspectsAction,
  purgeProspectAction,
  restoreProspectAction,
  unassignProspectsAction,
} from "../actions";
import {
  prospectKindLabels,
  prospectKinds,
  prospectStatuses,
  prospectStatusLabels,
  UNASSIGNED_FILTER,
} from "../schemas";
import type {
  Prospect,
  ProspectFilters,
  ProspectKind,
  ProspectStatus,
  ProspectsOverview,
} from "../types";
import { ImportDialog } from "./import-dialog";
import { ProspectDetailDialog } from "./prospect-detail";
import { ProspectDialog } from "./prospect-dialog";
import { fmtDate, ProspectStatusBadge, selectClass } from "./prospect-ui";

interface ProspectsHubProps {
  initialProspects: Prospect[];
  initialOverview: ProspectsOverview;
  canManage: boolean;
  canAssign: boolean;
  canConvert: boolean;
  canImport: boolean;
  canExport?: boolean;
  canDelete?: boolean;
  canPurge?: boolean;
}

/** Số dòng mỗi trang (danh sách có thể lên tới hàng trăm công ty) */
const PAGE_SIZE = 50;

const FUNNEL: ProspectStatus[] = [
  "new",
  "contacted",
  "nurturing",
  "negotiating",
  "converted",
];

export function ProspectsHub({
  initialProspects,
  initialOverview,
  canManage,
  canAssign,
  canConvert,
  canImport,
  canExport = false,
  canDelete = false,
  canPurge = false,
}: ProspectsHubProps) {
  const [prospects, setProspects] = useState(initialProspects);
  const [overview, setOverview] = useState(initialOverview);
  const [loading, setLoading] = useState(false);

  // Chế độ xem Thùng rác (soft delete)
  const [inTrash, setInTrash] = useState(false);

  // Bộ lọc: gửi qua Server Action (từ khóa có thể là SĐT) — không đưa lên URL
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ProspectStatus | "">("");
  const [kind, setKind] = useState<ProspectKind | "">("");
  const [province, setProvince] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [dupPending, setDupPending] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Prospect | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [deletingProspect, setDeletingProspect] = useState<Prospect | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);
  const [purgingProspect, setPurgingProspect] = useState<Prospect | null>(null);
  const [purging, setPurging] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  // Chọn nhiều dòng để bỏ gán hàng loạt (chỉ quản lý/owner)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [unassignOpen, setUnassignOpen] = useState(false);
  const [unassigning, setUnassigning] = useState(false);
  const [page, setPage] = useState(1);

  const filters = useMemo<ProspectFilters>(
    () => ({
      search,
      status,
      kind,
      province,
      assigned_to: assignedTo,
      overdue_only: overdueOnly,
      dup_pending: dupPending,
      in_trash: inTrash,
    }),
    [
      search,
      status,
      kind,
      province,
      assignedTo,
      overdueOnly,
      dupPending,
      inTrash,
    ],
  );
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const reload = useCallback(async () => {
    setLoading(true);
    const [list, ov] = await Promise.all([
      listProspectsAction(filtersRef.current),
      getProspectsOverviewAction(),
    ]);
    setLoading(false);
    if (list.ok) setProspects(list.data);
    else toast.error(list.error.message);
    if (ov.ok) setOverview(ov.data);
  }, []);

  // Tải lại khi đổi bộ lọc (debounce cho ô tìm kiếm); bỏ qua lần mount đầu
  const firstRun = useRef(true);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `filters` chỉ là tín hiệu kích hoạt tải lại (reload đọc giá trị mới nhất qua ref)
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setPage(1);
    const t = setTimeout(() => void reload(), 350);
    return () => clearTimeout(t);
  }, [filters, reload]);

  // Sau khi lọc / tải lại, bỏ khỏi vùng chọn những dòng không còn hiển thị
  useEffect(() => {
    const visible = new Set(prospects.map((p) => p.id));
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => visible.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [prospects]);

  function openDetail(id: string) {
    setDetailId(id);
    setDetailOpen(true);
  }

  async function confirmBulkUnassign() {
    const ids = Array.from(selectedIds);
    setUnassigning(true);
    try {
      const res = await unassignProspectsAction({ ids });
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      const { unassigned, skipped } = res.data;
      if (unassigned > 0) {
        toast.success(`Đã bỏ gán ${unassigned} khách tiềm năng`);
      }
      if (skipped.length > 0) {
        toast.info(
          `${skipped.length} dòng được bỏ qua (đã chưa gán hoặc đã chuyển đổi)`,
        );
      }
      setUnassignOpen(false);
      setSelectedIds(new Set());
      await reload();
    } finally {
      setUnassigning(false);
    }
  }

  async function claim(p: Prospect) {
    setClaimingId(p.id);
    try {
      const res = await claimProspectAction(p.id);
      if (!res.ok) {
        toast.error(res.error.message);
        // Có thể người khác vừa nhận trước: tải lại để thấy người phụ trách mới
        await reload();
        return;
      }
      toast.success(`Bạn đã nhận chăm sóc "${p.company_name}"`);
      await reload();
    } finally {
      setClaimingId(null);
    }
  }

  async function quickConvert(p: Prospect) {
    if (
      !window.confirm(
        `Chuyển "${p.company_name}" thành đối tác? Hồ sơ khách tiềm năng sẽ bị khóa chỉnh sửa.`,
      )
    ) {
      return;
    }
    setConvertingId(p.id);
    try {
      const res = await convertProspectAction(p.id);
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      if (res.data.status === "duplicate_partner") {
        toast.error(res.data.message);
        return;
      }
      toast.success(`Đã tạo đối tác "${p.company_name}"`);
      await reload();
    } finally {
      setConvertingId(null);
    }
  }

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await exportProspectsAction(filtersRef.current);
      if (!res.ok) {
        toast.error(res.error.message || "Xuất danh sách thất bại");
        return;
      }
      const { files, totalCount, fileCount } = res.data;
      if (!files || files.length === 0) {
        toast.info("Không có dữ liệu để xuất");
        return;
      }

      files.forEach((fileItem, idx) => {
        setTimeout(() => {
          const byteCharacters = atob(fileItem.base64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = fileItem.filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, idx * 350);
      });

      if (fileCount > 1) {
        toast.success(
          `Đã xuất ${totalCount} khách hàng tiềm năng B2B, chia làm ${fileCount} file Excel`,
        );
      } else {
        toast.success(
          `Đã xuất ${totalCount} khách hàng tiềm năng B2B ra file Excel`,
        );
      }
    } catch {
      toast.error("Không thể xuất file lúc này");
    } finally {
      setExporting(false);
    }
  };

  const handleQuickDelete = async () => {
    if (!deletingProspect) return;
    setDeleting(true);
    try {
      const res = await deleteProspectAction(deletingProspect.id);
      if (!res.ok) {
        toast.error(res.error.message || "Chuyển vào thùng rác thất bại");
        return;
      }
      toast.success(
        `Đã chuyển khách tiềm năng "${deletingProspect.company_name}" vào thùng rác`,
      );
      setDeletingProspect(null);
      await reload();
    } catch {
      toast.error("Không thể chuyển vào thùng rác lúc này");
    } finally {
      setDeleting(false);
    }
  };

  const handleRestore = async (p: Prospect) => {
    setRestoringId(p.id);
    try {
      const res = await restoreProspectAction(p.id);
      if (!res.ok) {
        toast.error(res.error.message || "Khôi phục khách tiềm năng thất bại");
        return;
      }
      toast.success(
        `Đã khôi phục khách tiềm năng "${p.company_name}" thành công`,
      );
      await reload();
    } catch {
      toast.error("Không thể khôi phục lúc này");
    } finally {
      setRestoringId(null);
    }
  };

  const handlePurge = async () => {
    if (!purgingProspect) return;
    setPurging(true);
    try {
      const res = await purgeProspectAction(purgingProspect.id);
      if (!res.ok) {
        toast.error(res.error.message || "Xóa vĩnh viễn thất bại");
        return;
      }
      toast.success(
        `Đã xóa vĩnh viễn khách tiềm năng "${purgingProspect.company_name}"`,
      );
      setPurgingProspect(null);
      await reload();
    } catch {
      toast.error("Không thể xóa vĩnh viễn lúc này");
    } finally {
      setPurging(false);
    }
  };

  const byStatus = overview.by_status;
  // Chỉ chọn được dòng đang có người phụ trách (dòng chưa gán không cần bỏ gán)
  const selectableIds = useMemo(
    () =>
      prospects
        .filter((p) => p.assigned_to && p.status !== "converted")
        .map((p) => p.id),
    [prospects],
  );
  const pageCount = Math.max(1, Math.ceil(prospects.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = prospects.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const pageSelectableIds = pageRows
    .filter((p) => selectableIds.includes(p.id))
    .map((p) => p.id);
  const allPageSelected =
    pageSelectableIds.length > 0 &&
    pageSelectableIds.every((id) => selectedIds.has(id));
  const siblings = useMemo(
    () => prospects.map((p) => ({ id: p.id, company_name: p.company_name })),
    [prospects],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            Khách hàng tiềm năng B2B
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Công ty tour, đại lý, doanh nghiệp chưa hợp tác. Mỗi công ty chỉ một
            sales phụ trách; chuyển thành đối tác khi đồng ý hợp tác.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canDelete && (
            <Button
              variant={inTrash ? "default" : "outline"}
              className={
                inTrash
                  ? "bg-amber-600 hover:bg-amber-700 text-white border-amber-600 font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }
              onClick={() => {
                setInTrash(!inTrash);
                setPage(1);
              }}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              {inTrash
                ? "← Danh sách theo dõi"
                : `Thùng rác (${overview.in_trash ?? 0})`}
            </Button>
          )}
          {canExport && !inTrash && (
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-1.5" />
              )}
              Xuất Excel
            </Button>
          )}
          {canImport && !inTrash && (
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <FileSpreadsheet className="h-4 w-4 mr-1.5" />
              Nhập Excel/CSV
            </Button>
          )}
          {canManage && !inTrash && (
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Thêm khách tiềm năng
            </Button>
          )}
        </div>
      </div>

      {inTrash && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              Đang xem danh sách trong <strong>Thùng rác</strong> (
              {overview.in_trash ?? prospects.length} hồ sơ). Hồ sơ trong thùng
              rác có thể bấm <strong>Khôi phục</strong> bất kỳ lúc nào để đưa về
              danh sách chính, hoặc <strong>Xóa vĩnh viễn</strong> (dành cho
              Quản lý & Chủ chuỗi).
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-amber-500/40 shrink-0 font-medium"
            onClick={() => setInTrash(false)}
          >
            Về danh sách chính
          </Button>
        </div>
      )}

      {/* Thẻ tổng quan */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        {FUNNEL.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(status === s ? "" : s)}
            className={`text-left rounded-xl border p-3 transition hover:bg-muted/40 ${
              status === s ? "ring-2 ring-primary" : ""
            }`}
          >
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {prospectStatusLabels[s]}
            </p>
            <p className="text-2xl font-bold mt-0.5">{byStatus[s] ?? 0}</p>
          </button>
        ))}
        <button
          type="button"
          onClick={() => setOverdueOnly((v) => !v)}
          className={`text-left rounded-xl border p-3 transition hover:bg-muted/40 ${
            overdueOnly ? "ring-2 ring-rose-500" : ""
          }`}
        >
          <p className="text-[11px] uppercase tracking-wide text-rose-600 flex items-center gap-1">
            <CalendarClock className="h-3 w-3" />
            Quá hạn chăm sóc
          </p>
          <p className="text-2xl font-bold mt-0.5 text-rose-600">
            {overview.overdue}
          </p>
        </button>
        <button
          type="button"
          onClick={() => setDupPending((v) => !v)}
          className={`text-left rounded-xl border p-3 transition hover:bg-muted/40 ${
            dupPending ? "ring-2 ring-amber-500" : ""
          }`}
        >
          <p className="text-[11px] uppercase tracking-wide text-amber-600 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Chờ xử lý trùng
          </p>
          <p className="text-2xl font-bold mt-0.5 text-amber-600">
            {overview.dup_pending}
          </p>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Handshake className="h-4 w-4" />
              Tỷ lệ chuyển đổi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {overview.conversion_rate === null
                ? "—"
                : `${overview.conversion_rate}%`}
            </p>
            <p className="text-xs text-muted-foreground">
              Đã chuyển đổi / tổng đã kết thúc (chuyển đổi + không tiềm năng).
              Tổng {overview.total} khách tiềm năng.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Trophy className="h-4 w-4" />
              Top sales theo số chuyển đổi
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overview.top_sales.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Chưa có chuyển đổi.
              </p>
            ) : (
              <ol className="text-sm space-y-0.5">
                {overview.top_sales.map((s, i) => (
                  <li key={s.user_id} className="flex justify-between">
                    <span>
                      {i + 1}. {s.name}
                    </span>
                    <strong>{s.converted}</strong>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bộ lọc */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
        <div className="relative md:col-span-2">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Tìm theo tên công ty, SĐT, website..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className={selectClass}
          value={status}
          onChange={(e) => setStatus(e.target.value as ProspectStatus | "")}
        >
          <option value="">Mọi trạng thái</option>
          {prospectStatuses.map((s) => (
            <option key={s} value={s}>
              {prospectStatusLabels[s]}
            </option>
          ))}
        </select>
        <select
          className={selectClass}
          value={kind}
          onChange={(e) => setKind(e.target.value as ProspectKind | "")}
        >
          <option value="">Mọi loại hình</option>
          {prospectKinds.map((k) => (
            <option key={k} value={k}>
              {prospectKindLabels[k]}
            </option>
          ))}
        </select>
        <Input
          placeholder="Tỉnh / thành"
          value={province}
          onChange={(e) => setProvince(e.target.value)}
        />
        <select
          className={`${selectClass} md:col-span-2`}
          value={assignedTo}
          onChange={(e) => setAssignedTo(e.target.value)}
        >
          <option value="">Mọi sales phụ trách</option>
          <option value={UNASSIGNED_FILTER}>Chưa gán</option>
          {overview.assignees.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <div className="md:col-span-3 flex items-center gap-2 text-xs text-muted-foreground">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {prospects.length} kết quả
          {(overdueOnly ||
            dupPending ||
            status ||
            kind ||
            province ||
            assignedTo ||
            search) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setStatus("");
                setKind("");
                setProvince("");
                setAssignedTo("");
                setOverdueOnly(false);
                setDupPending(false);
              }}
            >
              Xóa bộ lọc
            </Button>
          )}
        </div>
      </div>

      {canAssign && selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-sm">
          <span>
            Đã chọn <strong>{selectedIds.size}</strong> dòng
          </span>
          <Button size="sm" onClick={() => setUnassignOpen(true)}>
            Bỏ gán các dòng đã chọn
          </Button>
          {selectedIds.size < selectableIds.length && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedIds(new Set(selectableIds))}
            >
              Chọn tất cả {selectableIds.length} dòng đang lọc
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedIds(new Set())}
          >
            Bỏ chọn
          </Button>
        </div>
      )}

      {/* Danh sách: gom cột để vừa màn hình, không cần cuộn ngang mới thấy nút thao tác */}
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {canAssign && (
                <TableHead className="w-10">
                  <Checkbox
                    aria-label="Chọn các dòng đang có người phụ trách trong trang này"
                    checked={allPageSelected}
                    disabled={pageSelectableIds.length === 0}
                    onCheckedChange={(c) =>
                      setSelectedIds((prev) => {
                        const next = new Set(prev);
                        for (const id of pageSelectableIds) {
                          if (c) next.add(id);
                          else next.delete(id);
                        }
                        return next;
                      })
                    }
                  />
                </TableHead>
              )}
              <TableHead>Công ty</TableHead>
              <TableHead>Liên hệ</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Phụ trách</TableHead>
              <TableHead>Chăm sóc</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canAssign ? 7 : 6}
                  className="text-center py-10 text-sm text-muted-foreground"
                >
                  Không có khách tiềm năng phù hợp.
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((p) => (
                <TableRow
                  key={p.id}
                  className="cursor-pointer"
                  onClick={() => openDetail(p.id)}
                >
                  {canAssign && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        aria-label={`Chọn ${p.company_name}`}
                        checked={selectedIds.has(p.id)}
                        disabled={!selectableIds.includes(p.id)}
                        onCheckedChange={(c) =>
                          setSelectedIds((prev) => {
                            const next = new Set(prev);
                            if (c) next.add(p.id);
                            else next.delete(p.id);
                            return next;
                          })
                        }
                      />
                    </TableCell>
                  )}
                  <TableCell className="max-w-72 whitespace-normal">
                    <div className="font-medium text-sm leading-snug">
                      {p.company_name}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {prospectKindLabels[p.kind]}
                        {p.province ? ` · ${p.province}` : ""}
                      </span>
                      {p.priority === "high" && (
                        <Badge
                          variant="outline"
                          className="text-[10px] border-rose-400 text-rose-700"
                        >
                          Ưu tiên cao
                        </Badge>
                      )}
                      {!p.dup_reviewed && (
                        <Badge
                          variant="outline"
                          className="text-[10px] border-amber-500 text-amber-700"
                        >
                          Chờ xử lý trùng
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="max-w-40 truncate">
                      {p.contact_name || "—"}
                    </div>
                    <div className="font-mono text-muted-foreground whitespace-nowrap">
                      {p.phone_display || p.contact_phone_display || "—"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <ProspectStatusBadge status={p.status} />
                  </TableCell>
                  <TableCell className="text-xs max-w-40 whitespace-normal">
                    {p.assigned_to_name ? (
                      <span className="block line-clamp-2 break-words">
                        {p.assigned_to_name}
                      </span>
                    ) : (
                      <span className="font-medium text-amber-700">
                        Chưa gán
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap">
                    <div className="text-muted-foreground">
                      Cuối: {fmtDate(p.last_contacted_at)}
                    </div>
                    <div
                      className={
                        p.is_overdue ? "text-rose-700 font-semibold" : ""
                      }
                    >
                      Hẹn: {fmtDate(p.next_follow_up_at)}
                      {p.is_overdue ? " (quá hạn)" : ""}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDetail(p.id);
                        }}
                      >
                        Chi tiết
                      </Button>
                      {canManage && p.can_claim && (
                        <Button
                          size="sm"
                          disabled={claimingId === p.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            void claim(p);
                          }}
                        >
                          {claimingId === p.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            "Nhận chăm sóc"
                          )}
                        </Button>
                      )}
                      {canConvert &&
                        p.can_edit &&
                        (p.status === "new" ||
                          p.status === "contacted" ||
                          p.status === "nurturing" ||
                          p.status === "negotiating") && (
                          <Button
                            size="sm"
                            disabled={convertingId === p.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              void quickConvert(p);
                            }}
                          >
                            {convertingId === p.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              "Chuyển đối tác"
                            )}
                          </Button>
                        )}
                      {!inTrash && canDelete && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 px-2"
                          title="Chuyển vào thùng rác"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingProspect(p);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {inTrash && canDelete && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={restoringId === p.id}
                          className="h-8 px-2 text-xs text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 gap-1 font-medium"
                          title="Khôi phục khách tiềm năng"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleRestore(p);
                          }}
                        >
                          {restoringId === p.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RotateCcw className="h-3 w-3" />
                          )}
                          <span>Khôi phục</span>
                        </Button>
                      )}
                      {inTrash && canPurge && p.status !== "converted" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive px-2"
                          title="Xóa vĩnh viễn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPurgingProspect(p);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {prospects.length > PAGE_SIZE && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2.5 text-xs text-muted-foreground">
            <span>
              Hiển thị {(currentPage - 1) * PAGE_SIZE + 1}–
              {Math.min(currentPage * PAGE_SIZE, prospects.length)} /{" "}
              {prospects.length} khách tiềm năng
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage <= 1}
                onClick={() => setPage(currentPage - 1)}
              >
                Trước
              </Button>
              <span className="px-2">
                Trang {currentPage}/{pageCount}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage >= pageCount}
                onClick={() => setPage(currentPage + 1)}
              >
                Sau
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={unassignOpen} onOpenChange={setUnassignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Bỏ gán {selectedIds.size} khách tiềm năng?
            </DialogTitle>
            <DialogDescription>
              Các dòng đã chọn sẽ về trạng thái chưa gán (giữ nguyên trạng thái
              chăm sóc). Sales có quyền có thể tự bấm "Nhận chăm sóc". Mỗi dòng
              được ghi vào dòng thời gian và nhật ký thao tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUnassignOpen(false)}
              disabled={unassigning}
            >
              Hủy
            </Button>
            <Button
              onClick={() => void confirmBulkUnassign()}
              disabled={unassigning}
            >
              {unassigning && (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              )}
              Bỏ gán {selectedIds.size} dòng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProspectDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        prospect={editing}
        assignees={overview.assignees}
        canAssign={canAssign}
        onSaved={(id) => {
          void reload();
          if (editing) openDetail(id);
        }}
        onOpenProspect={openDetail}
      />

      <ProspectDetailDialog
        prospectId={detailId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        assignees={overview.assignees}
        siblings={siblings}
        canAssign={canAssign}
        canConvert={canConvert}
        canDelete={canDelete}
        onEdit={(p) => {
          setDetailOpen(false);
          setEditing(p);
          setFormOpen(true);
        }}
        onChanged={() => void reload()}
      />

      {/* Dialog xác nhận chuyển vào thùng rác */}
      <Dialog
        open={!!deletingProspect}
        onOpenChange={(open) => !open && setDeletingProspect(null)}
      >
        <DialogContent className="border-amber-500/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Chuyển khách tiềm năng vào Thùng rác
            </DialogTitle>
            <DialogDescription className="pt-1.5">
              Bạn có chắc chắn muốn chuyển khách tiềm năng{" "}
              <strong className="text-foreground">
                {deletingProspect?.company_name}
              </strong>{" "}
              vào thùng rác? Hồ sơ sẽ tạm thời ẩn khỏi danh sách theo dõi nhưng
              toàn bộ lịch sử chăm sóc và tương tác vẫn được bảo toàn và có thể
              khôi phục bất kỳ lúc nào.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              disabled={deleting}
              onClick={() => setDeletingProspect(null)}
            >
              Hủy
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
              disabled={deleting}
              onClick={() => void handleQuickDelete()}
            >
              {deleting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Chuyển vào thùng rác
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog xác nhận xóa vĩnh viễn (chỉ trong Thùng rác) */}
      <Dialog
        open={!!purgingProspect}
        onOpenChange={(open) => !open && setPurgingProspect(null)}
      >
        <DialogContent className="border-rose-500/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Xác nhận xóa vĩnh viễn khách tiềm năng
            </DialogTitle>
            <DialogDescription className="pt-1.5">
              Hành động này{" "}
              <strong className="text-destructive">không thể hoàn tác</strong>.
              Bạn có chắc chắn muốn xóa vĩnh viễn khách tiềm năng{" "}
              <strong className="text-foreground">
                {purgingProspect?.company_name}
              </strong>{" "}
              khỏi hệ thống? Toàn bộ lịch sử chăm sóc và tương tác liên quan
              cũng sẽ bị xóa vĩnh viễn.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              disabled={purging}
              onClick={() => setPurgingProspect(null)}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              disabled={purging}
              onClick={() => void handlePurge()}
            >
              {purging && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Xóa vĩnh viễn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {canImport && (
        <ImportDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          onImported={() => void reload()}
          canAssign={canAssign}
        />
      )}
    </div>
  );
}
