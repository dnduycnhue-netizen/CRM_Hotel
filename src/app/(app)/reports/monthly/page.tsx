import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getActiveBranches } from "@/features/admin/data/branches";
import { getMonthlyReport, MonthlyRevenueTable } from "@/features/reports";
import { getSession } from "@/shared/auth/server";

export const metadata: Metadata = {
  title: "Báo cáo Doanh thu & Cùng kỳ YoY | CRM Khách Sạn",
};

interface MonthlyRevenuePageProps {
  searchParams: Promise<{
    branchId?: string;
    year?: string;
  }>;
}

export default async function MonthlyRevenuePage(
  props: MonthlyRevenuePageProps,
) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const canViewReports =
    session.can("report.view_chain") ||
    session.can("report.view_branch") ||
    session.can("revenue.view");

  if (!canViewReports) {
    redirect("/?denied=1");
  }

  const searchParams = await props.searchParams;
  const currentYear = searchParams.year
    ? parseInt(searchParams.year, 10)
    : new Date().getFullYear();
  const rawBranchId = searchParams.branchId;

  const effectiveBranchId =
    !session.can("report.view_chain") && session.currentBranchId
      ? session.currentBranchId
      : rawBranchId;

  const branchIds =
    effectiveBranchId && effectiveBranchId !== "all"
      ? [effectiveBranchId]
      : undefined;

  const [rows, allBranches] = await Promise.all([
    getMonthlyReport(currentYear, branchIds),
    getActiveBranches(),
  ]);

  const branches = session.can("report.view_chain")
    ? allBranches
    : allBranches.filter((b) => session.branchIds.includes(b.id));

  return (
    <MonthlyRevenueTable
      initialRows={rows}
      year={currentYear}
      branches={branches}
      initialBranchId={effectiveBranchId || "all"}
      canInput={session.can("revenue.input")}
    />
  );
}
