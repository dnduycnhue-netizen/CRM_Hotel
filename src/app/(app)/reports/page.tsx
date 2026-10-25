import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getActiveBranches } from "@/features/admin/data/branches";
import {
  DashboardOverview,
  getReportKpis,
  getReportSeries,
} from "@/features/reports";
import { getSession } from "@/shared/auth/server";

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
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const canViewChain = session.can("report.view_chain");
  const canViewBranch = session.can("report.view_branch");
  if (!canViewChain && !canViewBranch) {
    redirect("/?denied=1");
  }

  const canExport = session.can("report.export");
  const allBranches = await getActiveBranches();

  // If user cannot view chain, filter branches strictly to user's assigned branches
  const branches = canViewChain
    ? allBranches
    : allBranches.filter((b) => session?.branchIds.includes(b.id));

  const searchParams = await props.searchParams;

  // If user cannot view chain, they are not allowed to view "all"
  let branchId = searchParams.branchId;
  if (!canViewChain) {
    if (
      !branchId ||
      branchId === "all" ||
      !branches.some((b) => b.id === branchId)
    ) {
      branchId = session?.currentBranchId || branches[0]?.id || "";
    }
  } else if (!branchId) {
    branchId = "all";
  }

  const branchIds = branchId && branchId !== "all" ? [branchId] : undefined;
  const from = searchParams.from;
  const to = searchParams.to;

  const [kpis, series] = await Promise.all([
    getReportKpis({ from, to, branchIds }),
    getReportSeries({ from, to, branchIds, grain: "day" }),
  ]);

  return (
    <DashboardOverview
      data={kpis}
      series={series}
      branches={branches}
      initialBranchId={branchId}
      initialPreset={searchParams.preset || "30days"}
      initialFrom={from}
      initialTo={to}
      canViewChain={canViewChain}
      canExport={canExport}
    />
  );
}
