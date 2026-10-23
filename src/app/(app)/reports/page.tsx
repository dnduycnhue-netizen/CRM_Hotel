import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getActiveBranches } from "@/features/admin/data/branches";
import {
  DashboardOverview,
  getReportKpis,
  getReportSeries,
} from "@/features/reports";
import { requirePermission } from "@/shared/auth/server";

export const metadata: Metadata = {
  title: "Báo cáo công suất & Lưu trú | CRM Khách Sạn",
};

interface ReportsPageProps {
  searchParams: Promise<{
    branchId?: string;
    from?: string;
    to?: string;
    preset?: string;
  }>;
}

export default async function ReportsPage(props: ReportsPageProps) {
  const hasPerm = await requirePermission("report.view_branch");
  if (!hasPerm.ok) {
    redirect("/");
  }

  const searchParams = await props.searchParams;
  const branchId = searchParams.branchId;
  const branchIds = branchId && branchId !== "all" ? [branchId] : undefined;
  const from = searchParams.from;
  const to = searchParams.to;

  const [kpis, series, branches] = await Promise.all([
    getReportKpis({ from, to, branchIds }),
    getReportSeries({ from, to, branchIds, grain: "day" }),
    getActiveBranches(),
  ]);

  return (
    <DashboardOverview
      data={kpis}
      series={series}
      branches={branches}
      initialBranchId={branchId || "all"}
      initialPreset={searchParams.preset || "30days"}
      initialFrom={from}
      initialTo={to}
    />
  );
}
