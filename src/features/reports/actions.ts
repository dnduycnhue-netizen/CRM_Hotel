"use server";

import { getActiveBranches } from "@/features/admin/data/branches";
import { requirePermission } from "@/shared/auth/server";
import { type ActionResult, fail, ok } from "@/shared/errors";
import { getReportKpis, getReportSeries } from "./data/queries";

export async function exportReportAction(params: {
  from?: string;
  to?: string;
  branchId?: string;
}): Promise<ActionResult<{ filename: string; base64: string }>> {
  try {
    const hasPerm = await requirePermission("report.export");
    if (!hasPerm.ok) {
      return hasPerm;
    }

    const branchIds =
      params.branchId && params.branchId !== "all"
        ? [params.branchId]
        : undefined;

    const [kpis, series, branches] = await Promise.all([
      getReportKpis({ from: params.from, to: params.to, branchIds }),
      getReportSeries({
        from: params.from,
        to: params.to,
        branchIds,
        grain: "day",
      }),
      getActiveBranches(),
    ]);

    if (!kpis) {
      return fail("NOT_FOUND", undefined, "Không có dữ liệu báo cáo");
    }

    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "CRM Chuỗi Khách Sạn";
    workbook.created = new Date();

    // Sheet 1: Tổng quan KPI
    const kpiSheet = workbook.addWorksheet("Tổng quan KPI", {
      views: [{ showGridLines: true }],
    });

    kpiSheet.columns = [
      { header: "Chỉ số vận hành", key: "metric", width: 35 },
      { header: "Kỳ báo cáo", key: "current", width: 20 },
      { header: "Kỳ so sánh (YoY)", key: "compare", width: 20 },
      { header: "Đơn vị tính", key: "unit", width: 15 },
    ];

    const kpiHeader = kpiSheet.getRow(1);
    kpiHeader.font = { bold: true, color: { argb: "FFFFFFFF" } };
    kpiHeader.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF312E81" }, // Indigo 900
    };
    kpiHeader.alignment = { vertical: "middle", horizontal: "center" };
    kpiHeader.height = 26;

    kpiSheet.addRow({
      metric: "Công suất phòng trung bình (Occupancy)",
      current: `${(kpis.current.occupancy * 100).toFixed(1)}%`,
      compare: kpis.compare
        ? `${(kpis.compare.occupancy * 100).toFixed(1)}%`
        : "—",
      unit: "%",
    });
    kpiSheet.addRow({
      metric: "Tổng số lượt khách đến (Arrivals)",
      current: kpis.current.arrivals,
      compare: kpis.compare ? kpis.compare.arrivals : "—",
      unit: "Lượt",
    });
    kpiSheet.addRow({
      metric: "Thời gian lưu trú bình quân (ALOS)",
      current: `${kpis.current.alos.toFixed(2)} đêm`,
      compare: kpis.compare ? `${kpis.compare.alos.toFixed(2)} đêm` : "—",
      unit: "Đêm/lượt",
    });
    kpiSheet.addRow({
      metric: "Tỷ lệ khách quay lại (Returning Rate)",
      current: `${(kpis.current.returning_rate * 100).toFixed(1)}%`,
      compare: kpis.compare
        ? `${(kpis.compare.returning_rate * 100).toFixed(1)}%`
        : "—",
      unit: "%",
    });
    kpiSheet.addRow({
      metric: "Tỷ lệ hủy phòng (Cancellation Rate)",
      current: `${(kpis.current.cancel_rate * 100).toFixed(1)}%`,
      compare: kpis.compare
        ? `${(kpis.compare.cancel_rate * 100).toFixed(1)}%`
        : "—",
      unit: "%",
    });

    // Sheet 2: Báo cáo theo cơ sở
    const branchSheet = workbook.addWorksheet("Theo từng cơ sở", {
      views: [{ showGridLines: true }],
    });
    branchSheet.columns = [
      { header: "STT", key: "stt", width: 8 },
      { header: "Mã CS", key: "code", width: 12 },
      { header: "Tên khách sạn", key: "name", width: 30 },
      { header: "Công suất (Occupancy)", key: "occupancy", width: 22 },
      { header: "Lượt khách đến", key: "arrivals", width: 18 },
    ];

    const branchHeader = branchSheet.getRow(1);
    branchHeader.font = { bold: true, color: { argb: "FFFFFFFF" } };
    branchHeader.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E293B" }, // Slate 800
    };
    branchHeader.alignment = { vertical: "middle", horizontal: "center" };
    branchHeader.height = 26;

    kpis.by_branch.forEach((b, idx) => {
      const branchInfo = branches.find((item) => item.id === b.branch_id);
      branchSheet.addRow({
        stt: idx + 1,
        code: branchInfo?.code || b.branch_id.slice(0, 8),
        name: branchInfo?.name || b.branch || "Khách sạn",
        occupancy: `${(b.current.occupancy * 100).toFixed(1)}%`,
        arrivals: b.current.arrivals,
      });
    });

    // Sheet 3: Diễn biến theo ngày
    if (series && series.length > 0) {
      const seriesSheet = workbook.addWorksheet("Chuỗi ngày", {
        views: [{ showGridLines: true }],
      });
      seriesSheet.columns = [
        { header: "Ngày", key: "date", width: 16 },
        { header: "Công suất (%)", key: "occupancy", width: 18 },
        { header: "Lượt khách đến", key: "arrivals", width: 18 },
      ];
      const seriesHeader = seriesSheet.getRow(1);
      seriesHeader.font = { bold: true, color: { argb: "FFFFFFFF" } };
      seriesHeader.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0F766E" }, // Teal 700
      };
      seriesHeader.height = 26;

      series.forEach((pt) => {
        seriesSheet.addRow({
          date: pt.bucket,
          occupancy: `${(pt.cur.occupancy * 100).toFixed(1)}%`,
          arrivals: pt.cur.arrivals,
        });
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const filename = `Bao_Cao_Van_Hanh_${params.from || "all"}_den_${params.to || "all"}.xlsx`;

    return ok({ filename, base64 });
  } catch (_err) {
    return fail(
      "UNKNOWN",
      undefined,
      "Lỗi trong quá trình xuất file Excel báo cáo",
    );
  }
}
