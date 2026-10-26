"use client";

import {
  AlertTriangle,
  CalendarClock,
  FileSpreadsheet,
  Handshake,
  Loader2,
  Plus,
  Search,
  Target,
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
  getProspectsOverviewAction,
  listProspectsAction,
  unassignProspectsAction,
} from "../actions";
import {
  prospectKindLabels,
  prospectKinds,
  prospectPriorityLabels,
  prospectStatusLabels,
  prospectStatuses,
  UNASSIGNED_FILTER,
} from "../schemas";
import type {
  Prospect,
  ProspectFilters,
  ProspectKind,
  ProspectsOverview,
  ProspectStatus,
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
}

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
}: ProspectsHubProps) {
  const [prospects, setProspects] = useState(initialProspects);
  const [overview, setOverview] = useState(initialOverview);
  const [loading, setLoading] = useState(false);

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

  // Chọn nhiều dòng để bỏ gán hàng loạt (chỉ quản lý/owner)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [unassignOpen, setUnassignOpen] = useState(false);
  const [unassigning, setUnassigning] = useState(false);

  const filters = useMemo<ProspectFilters>(
    () => ({
      search,
      status,
      kind,
      province,
      assigned_to: assignedTo,
      overdue_only: overdueOnly,
      dup_pending: dupPending,
    }),
    [search, status, kind, province, assignedTo, overdueOnly, dupPending],
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

  const byStatus = overview.by_status;
  // Chỉ chọn được dòng đang có người phụ trách (dòng chưa gán không cần bỏ gán)
  const selectableIds = useMemo(
    () =>
      prospects
        .filter((p) => p.assigned_to && p.status !== "converted")
        .map((p) => p.id),
    [prospects],
  );
  const allSelected =
    selectableIds.length > 0 &&
    selectableIds.every((id) => selectedIds.has(id));
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
          {canImport && (
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <FileSpreadsheet className="h-4 w-4 mr-1.5" />
              Nhập Excel/CSV
            </Button>
          )}
          {canManage && (
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
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedIds(new Set())}
          >
            Bỏ chọn
          </Button>
        </div>
      )}

      {/* Danh sách */}
      <div className="rounded-xl border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {canAssign && (
                <TableHead className="w-10">
                  <Checkbox
                    aria-label="Chọn tất cả dòng đang có người phụ trách"
                    checked={allSelected}
                    disabled={selectableIds.length === 0}
                    onCheckedChange={(c) =>
                      setSelectedIds(c ? new Set(selectableIds) : new Set())
                    }
                  />
                </TableHead>
              )}
              <TableHead>Công ty</TableHead>
              <TableHead>Liên hệ</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Phụ trách</TableHead>
              <TableHead>Liên hệ cuối</TableHead>
              <TableHead>Hẹn tiếp</TableHead>
              <TableHead>Ưu tiên</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {prospects.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canAssign ? 9 : 8}
                  className="text-center py-10 text-sm text-muted-foreground"
                >
                  Không có khách tiềm năng phù hợp.
                </TableCell>
              </TableRow>
            ) : (
              prospects.map((p) => (
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
                  <TableCell>
                    <div className="font-medium text-sm">{p.company_name}</div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {prospectKindLabels[p.kind]}
                        {p.province ? ` · ${p.province}` : ""}
                      </span>
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
                    <div>{p.contact_name || "—"}</div>
                    <div className="font-mono text-muted-foreground">
                      {p.phone_display || p.contact_phone_display || "—"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <ProspectStatusBadge status={p.status} />
                  </TableCell>
                  <TableCell className="text-xs">
                    {p.assigned_to_name ?? (
                      <span className="text-amber-600">Chưa gán</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    {fmtDate(p.last_contacted_at)}
                  </TableCell>
                  <TableCell
                    className={`text-xs ${p.is_overdue ? "text-rose-600 font-semibold" : ""}`}
                  >
                    {fmtDate(p.next_follow_up_at)}
                    {p.is_overdue ? " (quá hạn)" : ""}
                  </TableCell>
                  <TableCell className="text-xs">
                    {prospectPriorityLabels[p.priority]}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
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
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
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
        onEdit={(p) => {
          setDetailOpen(false);
          setEditing(p);
          setFormOpen(true);
        }}
        onChanged={() => void reload()}
      />

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
