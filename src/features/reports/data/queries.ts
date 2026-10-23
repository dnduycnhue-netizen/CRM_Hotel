import { createClient } from "@/lib/supabase/server";
import { getVnDateRange } from "@/shared/utils/date";
import type {
  FacilityReportResponse,
  MonthlyReportRow,
  ReportKpisResponse,
  ReportSeriesPoint,
} from "../types";

export async function getReportKpis(options?: {
  from?: string;
  to?: string;
  branchIds?: string[];
  compareMode?: string;
}): Promise<ReportKpisResponse | null> {
  const supabase = await createClient();

  // Mặc định 30 ngày gần nhất theo giờ Việt Nam
  const defaultRange = getVnDateRange("30days");
  const p_from = options?.from || defaultRange.from;
  const p_to = options?.to || defaultRange.to;
  const p_compare = options?.compareMode || "same_period_ly";
  const p_branch_ids =
    options?.branchIds && options.branchIds.length > 0
      ? options.branchIds
      : null;

  try {
    const { data, error } = await supabase.rpc("report_kpis", {
      p_from,
      p_to,
      p_branch_ids,
      p_compare,
    });

    if (error || !data) {
      return null;
    }

    return data as ReportKpisResponse;
  } catch {
    return null;
  }
}

export async function getReportSeries(options?: {
  from?: string;
  to?: string;
  branchIds?: string[];
  grain?: "day" | "week" | "month";
  compareMode?: string;
}): Promise<ReportSeriesPoint[]> {
  const supabase = await createClient();

  const defaultRange = getVnDateRange("30days");
  const p_from = options?.from || defaultRange.from;
  const p_to = options?.to || defaultRange.to;
  const p_grain = options?.grain || "day";
  const p_compare = options?.compareMode || "same_period_ly";
  const p_branch_ids =
    options?.branchIds && options.branchIds.length > 0
      ? options.branchIds
      : null;

  try {
    const { data, error } = await supabase.rpc("report_series", {
      p_from,
      p_to,
      p_branch_ids,
      p_grain,
      p_compare,
    });

    if (error || !data) return [];
    return data as ReportSeriesPoint[];
  } catch {
    return [];
  }
}

export async function getMonthlyReport(
  year: number = new Date().getFullYear(),
  branchIds?: string[],
): Promise<MonthlyReportRow[]> {
  const supabase = await createClient();
  const p_branch_ids = branchIds && branchIds.length > 0 ? branchIds : null;

  try {
    const { data, error } = await supabase.rpc("report_monthly", {
      p_year: year,
      p_branch_ids,
    });

    if (error || !data) return [];
    return data as MonthlyReportRow[];
  } catch {
    return [];
  }
}

export async function getFacilityReport(options?: {
  from?: string;
  to?: string;
  branchIds?: string[];
  compareMode?: string;
}): Promise<FacilityReportResponse | null> {
  const supabase = await createClient();

  const defaultRange = getVnDateRange("30days");
  const p_from = options?.from || defaultRange.from;
  const p_to = options?.to || defaultRange.to;
  const p_compare = options?.compareMode || "same_period_ly";
  const p_branch_ids =
    options?.branchIds && options.branchIds.length > 0
      ? options.branchIds
      : null;

  try {
    const { data, error } = await supabase.rpc("report_facilities", {
      p_from,
      p_to,
      p_branch_ids,
      p_compare,
    });

    if (error || !data) return null;
    return data as FacilityReportResponse;
  } catch {
    return null;
  }
}
