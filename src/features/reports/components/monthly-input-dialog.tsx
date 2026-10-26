"use client";

import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Info,
  Loader2,
  Lock,
  RefreshCw,
  Save,
  Unlock,
  Upload,
  X,
} from "lucide-react";
import React, { useEffect, useMemo, useState, useTransition } from "react";
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
  getMonthlyInputMatrixAction,
  lockMonthlyFiguresAction,
  saveMonthlyFiguresAction,
  unlockMonthlyFiguresAction,
} from "../actions";
import type { MonthlyInputBranchRow } from "../types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultMonth?: string; // YYYY-MM
  onSaved?: () => void;
}

interface FormRow {
  branch_id: string;
  branch_name: string;
  branch_code: string;
  is_locked: boolean;
  can_input: boolean;
  can_lock: boolean;
  can_unlock: boolean;
  arrivals: string;
  guests: string;
  room_nights: string;
  available_room_nights: string;
  room_revenue: string;
  other_revenue: string;
  note: string;
  crm_arrivals: number;
  crm_guests: number;
  crm_room_nights: number;
  suggested_available: number;
  entered_by_name?: string | null;
  entered_at?: string | null;
  locked_by_name?: string | null;
  unlock_reason?: string | null;
}

export function MonthlyInputDialog({
  isOpen,
  onClose,
  defaultMonth,
  onSaved,
}: Props) {
  const currentYearMonth = useMemo(() => {
    if (defaultMonth) return defaultMonth;
    const now = new Date();
    // Gợi ý tháng trước nếu ngày hiện tại < 15, ngược lại tháng hiện tại
    const m = now.getMonth() + 1;
    const y = now.getFullYear();
    return `${y}-${String(m).padStart(2, "0")}`;
  }, [defaultMonth]);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentYearMonth);
  const [rows, setRows] = useState<FormRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, startSaving] = useTransition();

  // Unlock dialog state
  const [unlockBranchId, setUnlockBranchId] = useState<string | null>(null);
  const [unlockBranchName, setUnlockBranchName] = useState<string>("");
  const [unlockReason, setUnlockReason] = useState("");
  const [isUnlocking, startUnlocking] = useTransition();

  // Fetch matrix whenever dialog opens or month changes
  const fetchMatrix = React.useCallback(async (monthStr: string) => {
    setIsLoading(true);
    const dateStr = `${monthStr}-01`;
    try {
      const res = await getMonthlyInputMatrixAction(dateStr);
      if (!res.ok) {
        toast.error(res.error.message || "Không thể tải bảng số liệu cơ sở");
        return;
      }
      const mapped: FormRow[] = res.data.map((b) => ({
        branch_id: b.branch_id,
        branch_name: b.branch_name,
        branch_code: b.branch_code,
        is_locked: b.is_locked,
        can_input: b.can_input,
        can_lock: b.can_lock,
        can_unlock: b.can_unlock,
        arrivals:
          b.figures.arrivals !== null && b.figures.arrivals !== undefined
            ? String(b.figures.arrivals)
            : "",
        guests:
          b.figures.guests !== null && b.figures.guests !== undefined
            ? String(b.figures.guests)
            : "",
        room_nights:
          b.figures.room_nights !== null && b.figures.room_nights !== undefined
            ? String(b.figures.room_nights)
            : "",
        available_room_nights:
          b.figures.available_room_nights !== null &&
          b.figures.available_room_nights !== undefined
            ? String(b.figures.available_room_nights)
            : String(b.suggested_available_room_nights || ""),
        room_revenue:
          b.figures.room_revenue !== null &&
          b.figures.room_revenue !== undefined
            ? String(b.figures.room_revenue)
            : "",
        other_revenue:
          b.figures.other_revenue !== null &&
          b.figures.other_revenue !== undefined
            ? String(b.figures.other_revenue)
            : "",
        note: b.figures.note || "",
        crm_arrivals: b.crm_figures.arrivals,
        crm_guests: b.crm_figures.guests,
        crm_room_nights: b.crm_figures.room_nights,
        suggested_available: b.suggested_available_room_nights,
        entered_by_name: b.figures.entered_by_name,
        entered_at: b.figures.entered_at,
        locked_by_name: b.figures.locked_by_name,
        unlock_reason: b.figures.unlock_reason,
      }));
      setRows(mapped);
    } catch {
      toast.error("Không thể đọc dữ liệu bảng số liệu cơ sở");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchMatrix(selectedMonth);
    }
  }, [isOpen, selectedMonth, fetchMatrix]);

  const handleFieldChange = (
    branchId: string,
    field: keyof FormRow,
    value: string,
  ) => {
    setRows((prev) =>
      prev.map((r) =>
        r.branch_id === branchId ? { ...r, [field]: value } : r,
      ),
    );
  };

  const handleSave = () => {
    const activeRowsToSave = rows.filter((r) => r.can_input && !r.is_locked);
    if (activeRowsToSave.length === 0) {
      toast.error("Không có cơ sở nào có thể lưu số liệu");
      return;
    }

    const payloadRows = activeRowsToSave.map((r) => ({
      branch_id: r.branch_id,
      month: `${selectedMonth}-01`,
      arrivals: r.arrivals.trim() ? parseInt(r.arrivals.trim(), 10) : null,
      guests: r.guests.trim() ? parseInt(r.guests.trim(), 10) : null,
      room_nights: r.room_nights.trim()
        ? parseInt(r.room_nights.trim(), 10)
        : null,
      available_room_nights: r.available_room_nights.trim()
        ? parseInt(r.available_room_nights.trim(), 10)
        : null,
      room_revenue: r.room_revenue.trim()
        ? parseFloat(r.room_revenue.trim())
        : null,
      other_revenue: r.other_revenue.trim()
        ? parseFloat(r.other_revenue.trim())
        : null,
      note: r.note.trim() || null,
    }));

    startSaving(async () => {
      const res = await saveMonthlyFiguresAction({ rows: payloadRows });
      if (res.ok) {
        toast.success(`Đã lưu số liệu doanh thu cho ${res.data.applied} cơ sở`);
        fetchMatrix(selectedMonth);
        onSaved?.();
      } else {
        toast.error(res.error.message || "Không thể lưu số liệu");
      }
    });
  };

  const handleLock = (branchId: string, branchName: string) => {
    if (
      !confirm(
        `Bạn có chắc chắn muốn khóa sổ tháng ${selectedMonth} cho cơ sở "${branchName}"? Sau khi khóa, chỉ quản trị viên cấp chuỗi mới có thể mở khóa.`,
      )
    ) {
      return;
    }

    startSaving(async () => {
      const res = await lockMonthlyFiguresAction({
        branch_id: branchId,
        month: `${selectedMonth}-01`,
      });
      if (res.ok) {
        toast.success(
          `Đã khóa sổ tháng ${selectedMonth} cho cơ sở ${branchName}`,
        );
        fetchMatrix(selectedMonth);
        onSaved?.();
      } else {
        toast.error(res.error.message || "Không thể khóa sổ");
      }
    });
  };

  const handleOpenUnlock = (branchId: string, branchName: string) => {
    setUnlockBranchId(branchId);
    setUnlockBranchName(branchName);
    setUnlockReason("");
  };

  const handleConfirmUnlock = () => {
    if (!unlockBranchId) return;
    if (unlockReason.trim().length < 10) {
      toast.error("Vui lòng nhập lý do mở khóa sổ tối thiểu 10 ký tự");
      return;
    }

    startUnlocking(async () => {
      const res = await unlockMonthlyFiguresAction({
        branch_id: unlockBranchId,
        month: `${selectedMonth}-01`,
        reason: unlockReason.trim(),
      });

      if (res.ok) {
        toast.success(
          `Đã mở khóa sổ tháng ${selectedMonth} cho cơ sở ${unlockBranchName}`,
        );
        setUnlockBranchId(null);
        fetchMatrix(selectedMonth);
        onSaved?.();
      } else {
        toast.error(res.error.message || "Không thể mở khóa sổ");
      }
    });
  };

  // Xuất file Excel mẫu
  const handleExportExcelTemplate = async () => {
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "CRM Chuỗi Khách Sạn";
      const worksheet = workbook.addWorksheet(`Doanh_Thu_${selectedMonth}`);

      worksheet.columns = [
        { header: "Mã cơ sở", key: "branch_code", width: 14 },
        { header: "Tên cơ sở", key: "branch_name", width: 28 },
        { header: "Tháng", key: "month", width: 14 },
        { header: "Doanh thu phòng (VND)", key: "room_revenue", width: 22 },
        { header: "Doanh thu khác (VND)", key: "other_revenue", width: 20 },
        { header: "Đêm phòng bán (ezCloud)", key: "room_nights", width: 24 },
        { header: "Lượt đến (ezCloud)", key: "arrivals", width: 18 },
        { header: "Số khách (ezCloud)", key: "guests", width: 18 },
        {
          header: "Đêm phòng khả dụng",
          key: "available_room_nights",
          width: 22,
        },
        { header: "Ghi chú", key: "note", width: 30 },
      ];

      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4F46E5" },
      };

      rows.forEach((r) => {
        worksheet.addRow({
          branch_code: r.branch_code,
          branch_name: r.branch_name,
          month: selectedMonth,
          room_revenue: r.room_revenue ? Number(r.room_revenue) : 0,
          other_revenue: r.other_revenue ? Number(r.other_revenue) : 0,
          room_nights: r.room_nights ? Number(r.room_nights) : 0,
          arrivals: r.arrivals ? Number(r.arrivals) : 0,
          guests: r.guests ? Number(r.guests) : 0,
          available_room_nights: r.available_room_nights
            ? Number(r.available_room_nights)
            : r.suggested_available,
          note: r.note || "",
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Mau_Nhap_Doanh_Thu_${selectedMonth}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Đã tải xuống file mẫu Excel");
    } catch (err: unknown) {
      toast.error(
        `Lỗi xuất Excel: ${(err as Error)?.message || "Không xác định"}`,
      );
    }
  };

  // Nhập file Excel
  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const buffer = await file.arrayBuffer();
      await workbook.xlsx.load(buffer);

      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        toast.error("File Excel không có dữ liệu");
        return;
      }

      let updatedCount = 0;
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // skip header
        const branchCode = String(row.getCell(1).value || "").trim();
        const roomRev = row.getCell(4).value;
        const otherRev = row.getCell(5).value;
        const roomNights = row.getCell(6).value;
        const arrivals = row.getCell(7).value;
        const guests = row.getCell(8).value;
        const availNights = row.getCell(9).value;
        const note = row.getCell(10).value;

        setRows((prev) =>
          prev.map((r) => {
            if (r.branch_code === branchCode && !r.is_locked && r.can_input) {
              updatedCount++;
              return {
                ...r,
                room_revenue:
                  roomRev !== null && roomRev !== undefined
                    ? String(roomRev)
                    : r.room_revenue,
                other_revenue:
                  otherRev !== null && otherRev !== undefined
                    ? String(otherRev)
                    : r.other_revenue,
                room_nights:
                  roomNights !== null && roomNights !== undefined
                    ? String(roomNights)
                    : r.room_nights,
                arrivals:
                  arrivals !== null && arrivals !== undefined
                    ? String(arrivals)
                    : r.arrivals,
                guests:
                  guests !== null && guests !== undefined
                    ? String(guests)
                    : r.guests,
                available_room_nights:
                  availNights !== null && availNights !== undefined
                    ? String(availNights)
                    : r.available_room_nights,
                note: note ? String(note) : r.note,
              };
            }
            return r;
          }),
        );
      });

      toast.success(
        `Đã nạp số liệu từ Excel cho ${updatedCount} cơ sở. Hãy kiểm tra và bấm "Lưu số liệu".`,
      );
      e.target.value = "";
    } catch (err: unknown) {
      toast.error(
        `Lỗi đọc file Excel: ${(err as Error)?.message || "File không đúng cấu trúc"}`,
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-3xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
        <DialogHeader className="p-6 pb-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  Phân hệ Nhập Doanh Thu Tháng (§14)
                </span>
                <span className="text-xs text-slate-400">
                  · Đối chiếu ezCloud & CRM
                </span>
              </div>
              <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                Nhập số liệu kinh doanh & Khóa sổ tháng
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Nhập số thực tế từ báo cáo ezCloud, hệ thống sẽ đối chiếu với dữ
                liệu CRM và tự tính các chỉ số ADR, OCC, RevPAR.
              </DialogDescription>
            </div>

            {/* Bộ chọn tháng & Nút Excel */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <Calendar className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Tháng:
                </span>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => {
                    const newMonth = e.target.value;
                    setSelectedMonth(newMonth);
                    if (newMonth && newMonth.length === 7) {
                      fetchMatrix(newMonth);
                    }
                  }}
                  className="bg-transparent font-bold text-xs text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer"
                />
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExportExcelTemplate}
                className="h-8.5 rounded-xl text-xs gap-1.5"
                title="Tải mẫu Excel để điền số liệu"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải mẫu</span>
              </Button>

              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 h-8.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 cursor-pointer shadow-xs transition">
                <Upload className="w-3.5 h-3.5 text-indigo-500" />
                <span>Nhập Excel</span>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleImportExcel}
                  className="hidden"
                />
              </label>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fetchMatrix(selectedMonth)}
                disabled={isLoading}
                className="h-8.5 rounded-xl text-xs"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Nội dung bảng nhập số liệu */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <p className="text-xs">Đang tải số liệu các cơ sở...</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">
              Bạn không có quyền nhập hoặc xem số liệu doanh thu cho cơ sở nào.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40 text-xs text-indigo-800 dark:text-indigo-300">
                <Info className="w-4 h-4 shrink-0 text-indigo-500" />
                <span>
                  <strong>Lưu ý:</strong> Cột nền vàng cảnh báo khi số đêm phòng
                  nhập từ ezCloud chênh lệch &gt; 10% so với dữ liệu lượt ở thực
                  tế được ghi nhận trên CRM.
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-850/60 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-3 px-3 min-w-[160px]">
                          Cơ sở & Trạng thái
                        </th>
                        <th className="py-3 px-3 min-w-[150px]">
                          Doanh thu phòng (VND)
                        </th>
                        <th className="py-3 px-3 min-w-[140px]">
                          Doanh thu khác (VND)
                        </th>
                        <th className="py-3 px-3 min-w-[110px]">
                          Đêm phòng bán
                        </th>
                        <th className="py-3 px-3 min-w-[110px]">
                          Đêm khả dụng
                        </th>
                        <th className="py-3 px-3 min-w-[90px]">Lượt đến</th>
                        <th className="py-3 px-3 min-w-[90px]">Số khách</th>
                        <th className="py-3 px-3 min-w-[130px]">
                          Chỉ số (ADR/OCC)
                        </th>
                        <th className="py-3 px-3 min-w-[140px]">Ghi chú</th>
                        <th className="py-3 px-3 text-right min-w-[100px]">
                          Khóa sổ
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {rows.map((r) => {
                        const roomRevNum = parseFloat(r.room_revenue) || 0;
                        const roomNightsNum = parseInt(r.room_nights, 10) || 0;
                        const availNightsNum =
                          parseInt(r.available_room_nights, 10) || 0;

                        // Tính toán chỉ số tự động
                        const occPct =
                          availNightsNum > 0
                            ? Math.min(
                                100,
                                Math.round(
                                  (roomNightsNum / availNightsNum) * 100,
                                ),
                              )
                            : 0;
                        const adr =
                          roomNightsNum > 0
                            ? Math.round(roomRevNum / roomNightsNum)
                            : 0;
                        const revpar =
                          availNightsNum > 0
                            ? Math.round(roomRevNum / availNightsNum)
                            : 0;

                        // Chênh lệch số đêm so với CRM
                        const crmNights = r.crm_room_nights;
                        const diffNights =
                          roomNightsNum > 0 && crmNights > 0
                            ? Math.abs(roomNightsNum - crmNights) / crmNights
                            : 0;
                        const isNightsDiffHigh =
                          diffNights > 0.1 && roomNightsNum > 0;

                        const isDisabled =
                          r.is_locked || !r.can_input || isSaving;

                        return (
                          <tr
                            key={r.branch_id}
                            className={`transition hover:bg-slate-50/50 dark:hover:bg-slate-800/30 ${
                              r.is_locked
                                ? "bg-slate-50/60 dark:bg-slate-900/40"
                                : ""
                            }`}
                          >
                            {/* Cột 1: Cơ sở */}
                            <td className="py-3 px-3">
                              <div className="font-bold text-slate-900 dark:text-slate-100 leading-snug">
                                {r.branch_name}
                              </div>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="font-mono text-[10px] text-slate-400">
                                  {r.branch_code}
                                </span>
                                {r.is_locked ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60">
                                    <Lock className="w-2.5 h-2.5" /> Đã khóa
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                                    <Unlock className="w-2.5 h-2.5" /> Mở
                                  </span>
                                )}
                              </div>
                              {r.entered_by_name && (
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  Nhập bởi: {r.entered_by_name}
                                </div>
                              )}
                            </td>

                            {/* Cột 2: Doanh thu phòng */}
                            <td className="py-3 px-3">
                              <Input
                                type="number"
                                min="0"
                                step="1000"
                                value={r.room_revenue}
                                disabled={isDisabled}
                                placeholder="0 đ"
                                onChange={(e) =>
                                  handleFieldChange(
                                    r.branch_id,
                                    "room_revenue",
                                    e.target.value,
                                  )
                                }
                                className="h-8 text-xs font-semibold text-right"
                              />
                            </td>

                            {/* Cột 3: Doanh thu khác */}
                            <td className="py-3 px-3">
                              <Input
                                type="number"
                                min="0"
                                step="1000"
                                value={r.other_revenue}
                                disabled={isDisabled}
                                placeholder="0 đ"
                                onChange={(e) =>
                                  handleFieldChange(
                                    r.branch_id,
                                    "other_revenue",
                                    e.target.value,
                                  )
                                }
                                className="h-8 text-xs text-right"
                              />
                            </td>

                            {/* Cột 4: Đêm phòng bán */}
                            <td className="py-3 px-3">
                              <div className="space-y-1">
                                <Input
                                  type="number"
                                  min="0"
                                  value={r.room_nights}
                                  disabled={isDisabled}
                                  placeholder="0"
                                  onChange={(e) =>
                                    handleFieldChange(
                                      r.branch_id,
                                      "room_nights",
                                      e.target.value,
                                    )
                                  }
                                  className={`h-8 text-xs font-bold text-right ${
                                    isNightsDiffHigh
                                      ? "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200"
                                      : ""
                                  }`}
                                />
                                <div className="text-[10px] text-slate-400 text-right">
                                  CRM: <strong>{crmNights}</strong>
                                </div>
                              </div>
                            </td>

                            {/* Cột 5: Đêm phòng khả dụng */}
                            <td className="py-3 px-3">
                              <div className="space-y-1">
                                <Input
                                  type="number"
                                  min="1"
                                  value={r.available_room_nights}
                                  disabled={isDisabled}
                                  placeholder={String(r.suggested_available)}
                                  onChange={(e) =>
                                    handleFieldChange(
                                      r.branch_id,
                                      "available_room_nights",
                                      e.target.value,
                                    )
                                  }
                                  className="h-8 text-xs text-right"
                                />
                                <div className="text-[10px] text-slate-400 text-right">
                                  Gợi ý: {r.suggested_available}
                                </div>
                              </div>
                            </td>

                            {/* Cột 6: Lượt đến */}
                            <td className="py-3 px-3">
                              <div className="space-y-1">
                                <Input
                                  type="number"
                                  min="0"
                                  value={r.arrivals}
                                  disabled={isDisabled}
                                  placeholder="0"
                                  onChange={(e) =>
                                    handleFieldChange(
                                      r.branch_id,
                                      "arrivals",
                                      e.target.value,
                                    )
                                  }
                                  className="h-8 text-xs text-right"
                                />
                                <div className="text-[10px] text-slate-400 text-right">
                                  CRM: {r.crm_arrivals}
                                </div>
                              </div>
                            </td>

                            {/* Cột 7: Số khách */}
                            <td className="py-3 px-3">
                              <div className="space-y-1">
                                <Input
                                  type="number"
                                  min="0"
                                  value={r.guests}
                                  disabled={isDisabled}
                                  placeholder="0"
                                  onChange={(e) =>
                                    handleFieldChange(
                                      r.branch_id,
                                      "guests",
                                      e.target.value,
                                    )
                                  }
                                  className="h-8 text-xs text-right"
                                />
                                <div className="text-[10px] text-slate-400 text-right">
                                  CRM: {r.crm_guests}
                                </div>
                              </div>
                            </td>

                            {/* Cột 8: Chỉ số tự tính */}
                            <td className="py-3 px-3">
                              <div className="space-y-0.5 text-[11px]">
                                <div className="flex justify-between">
                                  <span className="text-slate-400">OCC:</span>
                                  <strong className="text-indigo-600 dark:text-indigo-400">
                                    {occPct}%
                                  </strong>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-400">ADR:</span>
                                  <span>
                                    {adr > 0
                                      ? adr.toLocaleString("vi-VN")
                                      : "—"}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-400">
                                    RevPAR:
                                  </span>
                                  <span className="text-emerald-600 font-medium">
                                    {revpar > 0
                                      ? revpar.toLocaleString("vi-VN")
                                      : "—"}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Cột 9: Ghi chú */}
                            <td className="py-3 px-3">
                              <Input
                                value={r.note}
                                disabled={isDisabled}
                                placeholder="Ghi chú thêm..."
                                onChange={(e) =>
                                  handleFieldChange(
                                    r.branch_id,
                                    "note",
                                    e.target.value,
                                  )
                                }
                                className="h-8 text-xs"
                              />
                            </td>

                            {/* Cột 10: Thao tác khóa / mở khóa */}
                            <td className="py-3 px-3 text-right">
                              {r.is_locked ? (
                                r.can_unlock ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      handleOpenUnlock(
                                        r.branch_id,
                                        r.branch_name,
                                      )
                                    }
                                    className="h-7 px-2 text-[11px] text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg gap-1"
                                    title="Mở khóa sổ để chỉnh sửa số liệu"
                                  >
                                    <Unlock className="w-3 h-3" /> Mở khóa
                                  </Button>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">
                                    Đã khóa
                                  </span>
                                )
                              ) : r.can_lock ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleLock(r.branch_id, r.branch_name)
                                  }
                                  className="h-7 px-2 text-[11px] text-slate-600 hover:text-slate-900 rounded-lg gap-1"
                                  title="Khóa sổ tháng này để chống chỉnh sửa"
                                >
                                  <Lock className="w-3 h-3" /> Khóa sổ
                                </Button>
                              ) : (
                                <span className="text-[10px] text-slate-400">
                                  —
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 px-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {rows.filter((r) => r.is_locked).length} / {rows.length} cơ sở đã
            khóa sổ tháng {selectedMonth}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSaving}
              className="h-9 px-4 rounded-xl text-xs"
            >
              Đóng
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={
                isSaving ||
                isLoading ||
                rows.every((r) => r.is_locked || !r.can_input)
              }
              className="h-9 px-5 rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-sm"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Lưu số liệu</span>
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      {/* Modal mở khóa sổ */}
      <Dialog
        open={unlockBranchId !== null}
        onOpenChange={(open) => !open && setUnlockBranchId(null)}
      >
        <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Unlock className="w-4 h-4 text-amber-600" />
              Mở khóa sổ tháng {selectedMonth}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Cơ sở: <strong>{unlockBranchName}</strong>. Hành động này sẽ được
              ghi nhận vào nhật ký hệ thống (Audit log).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label className="text-xs font-semibold">
              Lý do mở khóa sổ <span className="text-red-500">*</span> (tối
              thiểu 10 ký tự):
            </Label>
            <Input
              value={unlockReason}
              onChange={(e) => setUnlockReason(e.target.value)}
              placeholder="VD: Điều chỉnh doanh thu phòng theo biên bản kiểm toán quý..."
              className="text-xs"
            />
            <p className="text-[11px] text-slate-400">
              Sau khi mở khóa, người dùng có quyền `revenue.input` có thể chỉnh
              sửa lại số liệu tháng này.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setUnlockBranchId(null)}
              disabled={isUnlocking}
              className="h-8.5 rounded-xl text-xs"
            >
              Hủy
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmUnlock}
              disabled={isUnlocking || unlockReason.trim().length < 10}
              className="h-8.5 rounded-xl text-xs bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
            >
              {isUnlocking ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Xác nhận mở khóa</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
