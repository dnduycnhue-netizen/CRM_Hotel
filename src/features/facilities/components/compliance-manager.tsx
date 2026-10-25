"use client";

import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Edit2,
  Eye,
  FileCheck2,
  FilePlus2,
  FileText,
  History,
  Info,
  Layers,
  LayoutGrid,
  ListFilter,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Upload,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type React from "react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@/shared/ui";
import {
  createComplianceUploadSignedUrlAction,
  getComplianceHistoryAction,
  getComplianceSignedUrlAction,
  upsertComplianceDocAction,
} from "../actions";
import type {
  ComplianceDocItem,
  ComplianceDocStatus,
  ComplianceDocTypeItem,
  ComplianceHistoryItem,
  ComplianceMatrixCell,
  ComplianceMatrixData,
} from "../types";

interface Props {
  matrix: ComplianceMatrixData;
  docs: ComplianceDocItem[];
  docTypes: ComplianceDocTypeItem[];
  branches: Array<{ id: string; name: string }>;
  assets: Array<{ id: string; name: string; code: string; branch_id: string }>;
  canManage?: boolean;
}

export function ComplianceManager({
  matrix,
  docs,
  docTypes,
  branches,
  assets,
  canManage = true,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [activeView, setActiveView] = useState<"matrix" | "list">("matrix");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [selectedDocType, setSelectedDocType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modal Upsert State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit" | "renew">(
    "create",
  );
  const [activeDocId, setActiveDocId] = useState<string | null>(null);

  // Form State
  const [formBranchId, setFormBranchId] = useState(branches[0]?.id || "");
  const [formDocTypeId, setFormDocTypeId] = useState(docTypes[0]?.id || "");
  const [formAssetId, setFormAssetId] = useState<string>("");
  const [formNumber, setFormNumber] = useState<string>("");
  const [formIssuer, setFormIssuer] = useState<string>("");
  const [formIssuedOn, setFormIssuedOn] = useState<string>("");
  const [formExpiresOn, setFormExpiresOn] = useState<string>("");
  const [formNoExpiry, setFormNoExpiry] = useState<boolean>(false);
  const [formNote, setFormNote] = useState<string>("");
  const [formFilePaths, setFormFilePaths] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // History modal state
  const [viewingHistoryDoc, setViewingHistoryDoc] =
    useState<ComplianceDocItem | null>(null);
  const [historyItems, setHistoryItems] = useState<ComplianceHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Document details quick view
  const [quickViewCell, setQuickViewCell] =
    useState<ComplianceMatrixCell | null>(null);

  // Statistics (filtered by selectedBranch)
  const scopedCells = useMemo(() => {
    return matrix.cells.filter(
      (c) =>
        c.doc_id &&
        (selectedBranch === "all" || c.branch_id === selectedBranch),
    );
  }, [matrix.cells, selectedBranch]);

  const expiredCount = scopedCells.filter((c) => c.status === "expired").length;
  const expiringCount = scopedCells.filter(
    (c) => c.status === "expiring",
  ).length;
  const goodCount = scopedCells.filter((c) => c.status === "good").length;

  const displayBranches = useMemo(() => {
    const branchMap = new Map<string, { id: string; name: string }>();
    branches.forEach((b) => branchMap.set(b.id, { id: b.id, name: b.name }));
    matrix.branches.forEach((b) =>
      branchMap.set(b.id, { id: b.id, name: b.name }),
    );
    return Array.from(branchMap.values()).filter(
      (b) => selectedBranch === "all" || b.id === selectedBranch,
    );
  }, [branches, matrix.branches, selectedBranch]);

  const currentSelectedDocType = useMemo(
    () => docTypes.find((dt) => dt.id === formDocTypeId),
    [docTypes, formDocTypeId],
  );

  const filteredAssets = useMemo(
    () => assets.filter((a) => a.branch_id === formBranchId),
    [assets, formBranchId],
  );

  // Open Create Dialog
  const openCreateModal = (branchId?: string, docTypeId?: string) => {
    setModalMode("create");
    setActiveDocId(null);
    setFormBranchId(branchId || branches[0]?.id || "");
    setFormDocTypeId(docTypeId || docTypes[0]?.id || "");
    setFormAssetId("");
    setFormNumber("");
    setFormIssuer("");
    setFormIssuedOn("");
    setFormExpiresOn("");
    setFormNoExpiry(false);
    setFormNote("");
    setFormFilePaths([]);
    setIsModalOpen(true);
  };

  // Open Edit Dialog
  const openEditModal = (doc: ComplianceDocItem | ComplianceMatrixCell) => {
    setModalMode("edit");
    const docId = "id" in doc ? doc.id : doc.doc_id;
    setActiveDocId(docId || null);
    setFormBranchId(doc.branch_id);
    setFormDocTypeId(doc.doc_type_id);
    setFormAssetId(doc.asset_id || "");
    setFormNumber(doc.number || "");
    setFormIssuer(doc.issuer || "");
    setFormIssuedOn(doc.issued_on || "");
    setFormExpiresOn(doc.expires_on || "");
    setFormNoExpiry(!doc.expires_on);
    setFormNote(doc.note || "");
    setFormFilePaths(doc.file_paths || []);
    setIsModalOpen(true);
    setQuickViewCell(null);
  };

  // Open Renew Dialog
  const openRenewModal = (doc: ComplianceDocItem | ComplianceMatrixCell) => {
    setModalMode("renew");
    const docId = "id" in doc ? doc.id : doc.doc_id;
    setActiveDocId(docId || null);
    setFormBranchId(doc.branch_id);
    setFormDocTypeId(doc.doc_type_id);
    setFormAssetId(doc.asset_id || "");
    setFormNumber(""); // Prompt for new licence/document number
    setFormIssuer(doc.issuer || "");
    setFormIssuedOn(new Date().toISOString().slice(0, 10)); // Today default
    setFormExpiresOn("");
    setFormNoExpiry(false);
    setFormNote(`Gia hạn thay thế hồ sơ số ${doc.number || "cũ"}`);
    setFormFilePaths([]);
    setIsModalOpen(true);
    setQuickViewCell(null);
  };

  // View Document History
  const handleOpenHistory = async (doc: ComplianceDocItem) => {
    setViewingHistoryDoc(doc);
    setLoadingHistory(true);
    try {
      const res = await getComplianceHistoryAction(doc.id);
      if (res.ok) {
        setHistoryItems(res.data);
      } else {
        toast.error("Không thể tải lịch sử cấp phép");
      }
    } catch {
      toast.error("Không thể tải lịch sử cấp phép");
    } finally {
      setLoadingHistory(false);
    }
  };

  // File Upload via Signed URL
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      toast.error("File tải lên vượt quá giới hạn cho phép (tối đa 15MB)");
      return;
    }

    setIsUploading(true);
    try {
      const res = await createComplianceUploadSignedUrlAction(
        formBranchId,
        file.name,
      );
      if (!res.ok) {
        toast.error(`Lỗi: ${res.error || "Không thể tải file"}`);
        setIsUploading(false);
        return;
      }

      // Upload file directly using PUT signedUrl
      const uploadRes = await fetch(res.data.signedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
        body: file,
      });

      if (!uploadRes.ok) {
        toast.error("Tải file lên lưu trữ thất bại");
        setIsUploading(false);
        return;
      }

      setFormFilePaths((prev) => [...prev, res.data.path]);
      toast.success(`Đã tải lên tệp: ${file.name}`);
      e.target.value = "";
    } catch (err: unknown) {
      toast.error(
        `Lỗi tải tệp: ${(err as Error)?.message || "Không xác định"}`,
      );
    } finally {
      setIsUploading(false);
    }
  };

  // View or Download signed file
  const handleOpenSignedFile = async (path: string) => {
    try {
      const res = await getComplianceSignedUrlAction(path);
      if (res.ok) {
        window.open(res.data.signedUrl, "_blank");
      } else {
        toast.error(`Không thể mở file: ${res.error || "File không tồn tại"}`);
      }
    } catch {
      toast.error("Không thể mở file đính kèm");
    }
  };

  // Form Submit
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formBranchId || !formDocTypeId) {
      toast.error("Vui lòng chọn cơ sở và loại hồ sơ");
      return;
    }

    if (currentSelectedDocType?.applies_to === "asset" && !formAssetId) {
      toast.error(
        `Loại hồ sơ "${currentSelectedDocType.name}" áp dụng cho thiết bị, vui lòng chọn thiết bị cụ thể`,
      );
      return;
    }

    if (!formNoExpiry && !formExpiresOn) {
      toast.error("Vui lòng chọn ngày hết hạn hoặc đánh dấu không thời hạn");
      return;
    }

    if (
      !formNoExpiry &&
      formIssuedOn &&
      formExpiresOn &&
      formExpiresOn < formIssuedOn
    ) {
      toast.error("Ngày hết hạn không được trước ngày cấp");
      return;
    }

    startTransition(async () => {
      const payload = {
        id: modalMode === "create" ? undefined : activeDocId || undefined,
        branch_id: formBranchId,
        doc_type_id: formDocTypeId,
        asset_id: formAssetId || null,
        number: formNumber.trim() || null,
        issuer: formIssuer.trim() || null,
        issued_on: formIssuedOn || null,
        expires_on: formNoExpiry ? null : formExpiresOn || null,
        file_paths: formFilePaths,
        note: formNote.trim() || null,
        is_renew: modalMode === "renew",
      };

      const res = await upsertComplianceDocAction(payload);
      if (res.ok) {
        toast.success(
          modalMode === "renew"
            ? "Đã gia hạn thành công! Bản ghi mới đã được lưu và bản cũ đã được lưu vào lịch sử."
            : modalMode === "edit"
              ? "Đã cập nhật hồ sơ pháp lý!"
              : "Đã tạo hồ sơ pháp lý mới!",
        );
        setIsModalOpen(false);
        router.refresh();
      } else {
        toast.error(`Lỗi: ${res.error || "Không thể lưu hồ sơ"}`);
      }
    });
  };

  // Filtered Docs for List View
  const filteredDocs = useMemo(() => {
    return docs.filter((d) => {
      if (selectedBranch !== "all" && d.branch_id !== selectedBranch)
        return false;
      if (selectedDocType !== "all" && d.doc_type_id !== selectedDocType)
        return false;
      if (selectedStatus !== "all" && d.status !== selectedStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNum = d.number?.toLowerCase().includes(q);
        const matchIssuer = d.issuer?.toLowerCase().includes(q);
        const matchType = d.doc_type_name.toLowerCase().includes(q);
        const matchBranch = d.branch_name.toLowerCase().includes(q);
        if (!matchNum && !matchIssuer && !matchType && !matchBranch)
          return false;
      }
      return true;
    });
  }, [docs, selectedBranch, selectedDocType, selectedStatus, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Statistical Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-medium text-slate-400">
              Tổng số hồ sơ hiện có
            </p>
            <p className="text-2xl font-bold text-slate-100 mt-1">
              {scopedCells.length}
            </p>
          </div>
          <span className="p-3 rounded-xl bg-slate-800 text-slate-300">
            <FileText className="w-5 h-5" />
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-medium text-rose-400">
              Đã hết hạn định kỳ
            </p>
            <p className="text-2xl font-bold text-rose-400 mt-1">
              {expiredCount}
            </p>
          </div>
          <span className="p-3 rounded-xl bg-rose-500/10 text-rose-400">
            <AlertCircle className="w-5 h-5" />
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-medium text-amber-400">
              Sắp hết hạn (≤ 30-60 ngày)
            </p>
            <p className="text-2xl font-bold text-amber-400 mt-1">
              {expiringCount}
            </p>
          </div>
          <span className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
            <Clock className="w-5 h-5" />
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-medium text-emerald-400">
              Hợp lệ & Còn hạn tốt
            </p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              {goodCount}
            </p>
          </div>
          <span className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </span>
        </div>
      </div>

      {/* View Switcher & Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
        {/* View Tabs */}
        <div className="flex space-x-6">
          <button
            type="button"
            onClick={() => setActiveView("matrix")}
            className={`pb-2 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeView === "matrix"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Ma trận pháp lý ({displayBranches.length} cơ sở)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView("list")}
            className={`pb-2 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeView === "list"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <ListFilter className="w-4 h-4" />
            <span>Danh sách chi tiết ({docs.length})</span>
          </button>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5">
          {canManage && (
            <Button
              size="sm"
              onClick={() => openCreateModal()}
              className="h-8 text-xs font-semibold gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Thêm hồ sơ pháp lý</span>
            </Button>
          )}

          {branches.length === 1 ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs font-medium text-slate-200">
              <Building2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>{branches[0]?.name}</span>
            </div>
          ) : (
            <div className="w-44">
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">Tất cả {branches.length} cơ sở</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* VIEW 1: MATRIX VIEW (CƠ SỞ x LOẠI HỒ SƠ) */}
      {activeView === "matrix" ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400">
                  <th className="py-3 px-4 font-bold uppercase tracking-wider sticky left-0 bg-slate-950 z-10 w-48 border-r border-slate-800">
                    Cơ sở / Loại hồ sơ
                  </th>
                  {matrix.doc_types.map((dt) => (
                    <th
                      key={dt.id}
                      className="py-3 px-3 font-semibold text-center min-w-[140px] max-w-[170px] border-r border-slate-800/60"
                      title={dt.name}
                    >
                      <span className="block truncate text-slate-200">
                        {dt.name}
                      </span>
                      <span className="text-[10px] text-slate-500 font-normal">
                        Báo trước {dt.remind_days} ngày
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {displayBranches.map((b) => (
                  <tr
                    key={b.id}
                    className="hover:bg-slate-800/30 transition-colors"
                  >
                      {/* Branch Name sticky column */}
                      <td className="py-3 px-4 font-semibold text-slate-100 sticky left-0 bg-slate-900 z-10 border-r border-slate-800 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span>{b.name}</span>
                        </div>
                      </td>

                      {/* Matrix cells for each doc type */}
                      {matrix.doc_types.map((dt) => {
                        const cell = matrix.cells.find(
                          (c) =>
                            c.branch_id === b.id && c.doc_type_id === dt.id,
                        );

                        if (!cell || !cell.doc_id) {
                          // Missing document
                          return (
                            <td
                              key={dt.id}
                              className="py-2.5 px-2 text-center border-r border-slate-800/60"
                            >
                              {canManage ? (
                                <button
                                  type="button"
                                  onClick={() => openCreateModal(b.id, dt.id)}
                                  className="w-full py-2 px-1 rounded-lg border border-dashed border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-500/5 text-slate-600 hover:text-indigo-400 transition-all text-[11px] flex flex-col items-center justify-center gap-0.5"
                                  title="Chưa có hồ sơ. Bấm để thêm mới"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Bổ sung</span>
                                </button>
                              ) : (
                                <span className="text-slate-600 text-xs">
                                  -
                                </span>
                              )}
                            </td>
                          );
                        }

                        // Status styling
                        const isExpired = cell.status === "expired";
                        const isExpiring = cell.status === "expiring";

                        return (
                          <td
                            key={dt.id}
                            className="py-2.5 px-2 text-center border-r border-slate-800/60"
                          >
                            <button
                              type="button"
                              onClick={() => setQuickViewCell(cell)}
                              className={`w-full p-2 rounded-xl border text-left transition-all shadow-xs hover:scale-[1.02] flex flex-col justify-between min-h-[64px] ${
                                isExpired
                                  ? "bg-rose-950/25 border-rose-500/40 text-rose-300 hover:border-rose-400"
                                  : isExpiring
                                    ? "bg-amber-950/25 border-amber-500/40 text-amber-300 hover:border-amber-400"
                                    : "bg-emerald-950/20 border-emerald-500/30 text-emerald-300 hover:border-emerald-400"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1 w-full">
                                <span className="font-bold text-[11px] truncate block text-slate-200">
                                  {cell.number || "Đã cấp phép"}
                                </span>
                                {isExpired ? (
                                  <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
                                ) : isExpiring ? (
                                  <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                                ) : (
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                                )}
                              </div>

                              <div className="text-[10px] mt-1 space-y-0.5">
                                {cell.expires_on ? (
                                  <div
                                    className={`font-semibold ${
                                      isExpired
                                        ? "text-rose-400"
                                        : isExpiring
                                          ? "text-amber-400"
                                          : "text-emerald-400"
                                    }`}
                                  >
                                    {isExpired
                                      ? `Quá hạn ${Math.abs(cell.days_remaining || 0)} ngày`
                                      : `Còn ${cell.days_remaining} ngày`}
                                  </div>
                                ) : (
                                  <span className="text-slate-400">
                                    Vô thời hạn
                                  </span>
                                )}
                              </div>
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* VIEW 2: LIST VIEW (BẢNG TÌM KIẾM CHI TIẾT) */
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-900 border border-slate-800 rounded-xl p-3">
            <div className="relative sm:col-span-2">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm theo số hiệu, cơ quan cấp, loại hồ sơ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <select
                value={selectedDocType}
                onChange={(e) => setSelectedDocType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none"
              >
                <option value="all">Tất cả loại hồ sơ</option>
                {docTypes.map((dt) => (
                  <option key={dt.id} value={dt.id}>
                    {dt.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="expired">Đã hết hạn</option>
                <option value="expiring">Sắp hết hạn</option>
                <option value="good">Hợp lệ & Còn hạn</option>
              </select>
            </div>
          </div>

          {/* List Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-xs uppercase text-slate-400">
                    <th className="py-3 px-4">Cơ sở</th>
                    <th className="py-3 px-4">Loại hồ sơ</th>
                    <th className="py-3 px-4">Số văn bản & Cơ quan cấp</th>
                    <th className="py-3 px-4">Ngày cấp</th>
                    <th className="py-3 px-4">Hạn định kỳ</th>
                    <th className="py-3 px-4">Trạng thái</th>
                    <th className="py-3 px-4">Tệp đính kèm</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredDocs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-12 text-center text-slate-500 text-xs"
                      >
                        Không tìm thấy hồ sơ pháp lý nào phù hợp
                      </td>
                    </tr>
                  ) : (
                    filteredDocs.map((doc) => {
                      const isExpired = doc.status === "expired";
                      const isExpiring = doc.status === "expiring";

                      return (
                        <tr
                          key={doc.id}
                          className="hover:bg-slate-800/30 transition-colors"
                        >
                          <td className="py-3 px-4 text-xs font-semibold text-slate-200">
                            {doc.branch_name}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-300">
                            <span className="font-medium text-slate-100">
                              {doc.doc_type_name}
                            </span>
                            {doc.asset_name && (
                              <span className="block text-[11px] text-slate-400 mt-0.5">
                                Thiết bị: {doc.asset_name}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-200">
                            <div className="font-semibold text-indigo-300">
                              {doc.number || "(Chưa có số)"}
                            </div>
                            {doc.issuer && (
                              <div className="text-[11px] text-slate-400">
                                {doc.issuer}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-400 whitespace-nowrap">
                            {doc.issued_on || "-"}
                          </td>
                          <td className="py-3 px-4 text-xs whitespace-nowrap">
                            {doc.expires_on ? (
                              <div>
                                <span className="font-medium text-slate-200">
                                  {doc.expires_on}
                                </span>
                                <span
                                  className={`block text-[11px] font-semibold ${
                                    isExpired
                                      ? "text-rose-400"
                                      : isExpiring
                                        ? "text-amber-400"
                                        : "text-emerald-400"
                                  }`}
                                >
                                  {isExpired
                                    ? `Quá hạn ${Math.abs(doc.days_remaining || 0)} ngày`
                                    : `Còn ${doc.days_remaining} ngày`}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs">
                                Vô thời hạn
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold inline-flex items-center gap-1 border ${
                                isExpired
                                  ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                  : isExpiring
                                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              }`}
                            >
                              {isExpired
                                ? "Đã hết hạn"
                                : isExpiring
                                  ? "Sắp hết hạn"
                                  : "Hợp lệ"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs">
                            {doc.file_paths && doc.file_paths.length > 0 ? (
                              <div className="flex items-center gap-1">
                                {doc.file_paths.map((path, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handleOpenSignedFile(path)}
                                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300"
                                    title={`Tải / Xem file #${idx + 1}`}
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                ))}
                                <span className="text-[11px] text-slate-400">
                                  ({doc.file_paths.length})
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-500 text-xs">
                                Chưa có file
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              {canManage && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openRenewModal(doc)}
                                  className="h-7 text-[11px] font-semibold gap-1 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                                  title="Gia hạn giấy phép mới (lưu bản cũ vào lịch sử)"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  <span>Gia hạn</span>
                                </Button>
                              )}

                              {canManage && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditModal(doc)}
                                  className="h-7 px-2 text-indigo-400 hover:text-indigo-300"
                                  title="Sửa thông tin hồ sơ"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </Button>
                              )}

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenHistory(doc)}
                                className="h-7 px-2 text-slate-400 hover:text-slate-200"
                                title="Xem lịch sử các lần cấp"
                              >
                                <History className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* QUICK VIEW CELL MODAL */}
      <Dialog
        open={Boolean(quickViewCell)}
        onOpenChange={(open) => !open && setQuickViewCell(null)}
      >
        <DialogContent className="max-w-md">
          {quickViewCell && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileCheck2 className="w-5 h-5 text-indigo-400" />
                  <span>
                    {docTypes.find((t) => t.id === quickViewCell.doc_type_id)
                      ?.name || "Hồ sơ pháp lý"}
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Cơ sở:{" "}
                  {branches.find((b) => b.id === quickViewCell.branch_id)?.name}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2 text-xs">
                <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div>
                    <span className="text-slate-500 block text-[11px]">
                      Số văn bản:
                    </span>
                    <strong className="text-slate-100 text-sm">
                      {quickViewCell.number || "Chưa có số"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">
                      Cơ quan cấp:
                    </span>
                    <span className="text-slate-200">
                      {quickViewCell.issuer || "Chưa rõ"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">
                      Ngày cấp phép:
                    </span>
                    <span className="text-slate-200">
                      {quickViewCell.issued_on || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">
                      Ngày hết hạn:
                    </span>
                    <span
                      className={`font-semibold ${
                        quickViewCell.status === "expired"
                          ? "text-rose-400"
                          : quickViewCell.status === "expiring"
                            ? "text-amber-400"
                            : "text-emerald-400"
                      }`}
                    >
                      {quickViewCell.expires_on || "Vô thời hạn"}
                    </span>
                  </div>
                </div>

                {quickViewCell.asset_name && (
                  <p className="text-slate-300">
                    <span className="text-slate-500">Thiết bị gắn liền:</span>{" "}
                    <strong>{quickViewCell.asset_name}</strong>
                  </p>
                )}

                {quickViewCell.note && (
                  <p className="text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    {quickViewCell.note}
                  </p>
                )}

                {/* Files attached */}
                {quickViewCell.file_paths &&
                  quickViewCell.file_paths.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <span className="text-slate-400 font-semibold block text-[11px]">
                        Tệp đính kèm ({quickViewCell.file_paths.length}):
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {quickViewCell.file_paths.map((p, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleOpenSignedFile(p)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 text-xs"
                          >
                            <Download className="w-3 h-3" />
                            <span>Tệp #{idx + 1}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
              </div>

              <DialogFooter className="pt-2 flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickViewCell(null)}
                  className="h-8 text-xs"
                >
                  Đóng
                </Button>
                {canManage && (
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(quickViewCell)}
                      className="h-8 text-xs text-indigo-400 border-indigo-500/30"
                    >
                      Sửa
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => openRenewModal(quickViewCell)}
                      className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Gia hạn ngay</span>
                    </Button>
                  </div>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* CREATE / EDIT / RENEW MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {modalMode === "renew" ? (
                <RefreshCw className="w-5 h-5 text-emerald-400" />
              ) : (
                <FileCheck2 className="w-5 h-5 text-indigo-400" />
              )}
              <span>
                {modalMode === "renew"
                  ? "Gia hạn Hồ sơ pháp lý"
                  : modalMode === "edit"
                    ? "Chỉnh sửa Hồ sơ pháp lý"
                    : "Thêm mới Hồ sơ pháp lý"}
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              {modalMode === "renew"
                ? "Tạo bản ghi cấp phép mới, hệ thống sẽ tự động lưu giữ bản cũ vào lịch sử hồ sơ"
                : "Quản lý thời hạn và đính kèm tệp giấy chứng nhận / kiểm định"}
            </DialogDescription>
          </DialogHeader>

          {modalMode === "renew" && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2">
              <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Quy trình gia hạn an toàn:</strong> Khi bạn lưu, bản ghi
                mới sẽ có hiệu lực ngay lập tức. Lịch sử các lần cấp trước đó
                vẫn được giữ nguyên vẹn để đối chiếu kiểm toán.
              </span>
            </div>
          )}

          <form onSubmit={handleSubmitForm} className="space-y-3.5 py-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Branch */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Cơ sở áp dụng *</Label>
                <select
                  value={formBranchId}
                  onChange={(e) => {
                    setFormBranchId(e.target.value);
                    setFormAssetId("");
                  }}
                  disabled={modalMode !== "create"}
                  className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs focus:ring-2 focus:ring-indigo-500/30"
                  required
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Doc Type */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Loại hồ sơ *</Label>
                <select
                  value={formDocTypeId}
                  onChange={(e) => {
                    setFormDocTypeId(e.target.value);
                    setFormAssetId("");
                  }}
                  disabled={modalMode !== "create"}
                  className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs focus:ring-2 focus:ring-indigo-500/30"
                  required
                >
                  {docTypes.map((dt) => (
                    <option key={dt.id} value={dt.id}>
                      {dt.name} (
                      {dt.applies_to === "asset" ? "Thiết bị" : "Khách sạn"})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Asset selector if applies_to === 'asset' */}
            {currentSelectedDocType?.applies_to === "asset" && (
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-indigo-300">
                  Thiết bị áp dụng kiểm định *
                </Label>
                <select
                  value={formAssetId}
                  onChange={(e) => setFormAssetId(e.target.value)}
                  className="w-full h-9 rounded-xl border border-indigo-500/50 bg-background px-3 text-xs focus:ring-2 focus:ring-indigo-500/30"
                  required
                >
                  <option value="">-- Chọn thiết bị trong cơ sở --</option>
                  {filteredAssets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Number */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold">
                  Số hiệu văn bản / Giấy phép
                </Label>
                <Input
                  value={formNumber}
                  onChange={(e) => setFormNumber(e.target.value)}
                  placeholder="VD: 124/GP-UBND hoặc PCCC-2024"
                  className="h-9 text-xs"
                />
              </div>

              {/* Issuer */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Cơ quan cấp</Label>
                <Input
                  value={formIssuer}
                  onChange={(e) => setFormIssuer(e.target.value)}
                  placeholder="VD: Phòng Cảnh sát PCCC & CNCH"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Ngày cấp phép</Label>
                <Input
                  type="date"
                  value={formIssuedOn}
                  onChange={(e) => setFormIssuedOn(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Ngày hết hạn</Label>
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formNoExpiry}
                      onChange={(e) => {
                        setFormNoExpiry(e.target.checked);
                        if (e.target.checked) setFormExpiresOn("");
                      }}
                      className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Không thời hạn</span>
                  </label>
                </div>
                <Input
                  type="date"
                  value={formExpiresOn}
                  onChange={(e) => setFormExpiresOn(e.target.value)}
                  disabled={formNoExpiry}
                  className="h-9 text-xs disabled:opacity-40"
                  required={!formNoExpiry}
                />
              </div>
            </div>

            {/* File attachments */}
            <div className="space-y-1.5 pt-1">
              <Label className="text-xs font-semibold">
                Tệp đính kèm (PDF / Ảnh chụp)
              </Label>
              <div className="flex items-center gap-2">
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-medium text-slate-200">
                  {isUploading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  <span>Tải tệp lên</span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                </label>
                <span className="text-[11px] text-slate-500">
                  Tối đa 15MB (.pdf, .png, .jpg)
                </span>
              </div>

              {formFilePaths.length > 0 && (
                <div className="space-y-1 pt-1">
                  {formFilePaths.map((path, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs"
                    >
                      <span className="truncate max-w-[320px] text-slate-300">
                        {path.split("/").pop()}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setFormFilePaths((prev) =>
                            prev.filter((_, i) => i !== idx),
                          )
                        }
                        className="p-1 text-rose-400 hover:text-rose-300"
                        title="Xóa tệp này"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Note */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Ghi chú thêm</Label>
              <Input
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                placeholder="Ghi chú điều kiện hoặc nhắc việc liên quan..."
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={isPending}
                className="h-9 text-xs"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={isPending || isUploading}
                className="h-9 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {modalMode === "renew"
                    ? "Lưu bản gia hạn mới"
                    : modalMode === "edit"
                      ? "Cập nhật hồ sơ"
                      : "Lưu hồ sơ mới"}
                </span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* HISTORY MODAL */}
      <Dialog
        open={Boolean(viewingHistoryDoc)}
        onOpenChange={(open) => !open && setViewingHistoryDoc(null)}
      >
        <DialogContent className="max-w-lg">
          {viewingHistoryDoc && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-400" />
                  <span>Lịch sử các lần cấp phép & Gia hạn</span>
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {viewingHistoryDoc.doc_type_name} •{" "}
                  {viewingHistoryDoc.branch_name}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto pr-1">
                {/* Current Active Doc */}
                <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-400 text-xs">
                      Bản ghi hiện hành (Đang áp dụng)
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Cấp: {viewingHistoryDoc.issued_on || "-"}
                    </span>
                  </div>
                  <p className="font-semibold text-slate-100">
                    Số: {viewingHistoryDoc.number || "Chưa có số"}
                  </p>
                  <p className="text-slate-300">
                    Hạn: {viewingHistoryDoc.expires_on || "Vô thời hạn"}
                  </p>
                  {viewingHistoryDoc.issuer && (
                    <p className="text-slate-400">
                      Cơ quan: {viewingHistoryDoc.issuer}
                    </p>
                  )}
                </div>

                {/* History list */}
                {loadingHistory ? (
                  <div className="py-8 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang tải lịch sử...</span>
                  </div>
                ) : historyItems.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">
                    Chưa có lịch sử các lần cấp phép trước đó
                  </p>
                ) : (
                  <div className="space-y-2 pt-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      Các lần cấp phép trước ({historyItems.length}):
                    </span>
                    {historyItems.map((old, idx) => (
                      <div
                        key={old.id || idx}
                        className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1 text-slate-300"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-200">
                            Số: {old.number || "Không có số"}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Lưu trữ:{" "}
                            {new Date(old.created_at).toLocaleDateString(
                              "vi-VN",
                            )}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-400">
                          <span>Ngày cấp: {old.issued_on || "-"}</span>
                          <span>Hạn: {old.expires_on || "Vô thời hạn"}</span>
                        </div>
                        {old.issuer && (
                          <p className="text-[11px] text-slate-400">
                            Cơ quan cấp: {old.issuer}
                          </p>
                        )}
                        {old.note && (
                          <p className="text-[11px] text-slate-500 italic">
                            Ghi chú: {old.note}
                          </p>
                        )}
                        {old.file_paths && old.file_paths.length > 0 && (
                          <div className="flex gap-2 pt-1">
                            {old.file_paths.map((p, fileIdx) => (
                              <button
                                key={fileIdx}
                                type="button"
                                onClick={() => handleOpenSignedFile(p)}
                                className="text-[11px] text-indigo-400 hover:underline flex items-center gap-1"
                              >
                                <Download className="w-3 h-3" />
                                <span>Tệp cũ #{fileIdx + 1}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewingHistoryDoc(null)}
                  className="h-8 text-xs"
                >
                  Đóng
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
