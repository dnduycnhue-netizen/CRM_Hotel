import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getActiveBranches } from "@/features/admin/data/branches";
import { getMonthlyReport, MonthlyRevenueTable } from "@/features/reports";
import { requirePermission } from "@/shared/auth/server";

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
  const hasPerm = await requirePermission("revenue.view");
  if (!hasPerm.ok) {
    redirect("/reports");
  }

  const searchParams = await props.searchParams;
  const currentYear = searchParams.year
    ? parseInt(searchParams.year, 10)
    : new Date().getFullYear();
  const branchId = searchParams.branchId;
  const branchIds = branchId && branchId !== "all" ? [branchId] : undefined;

  const [rows, branches] = await Promise.all([
    getMonthlyReport(currentYear, branchIds),
    getActiveBranches(),
  ]);

  return (
    <MonthlyRevenueTable
      initialRows={rows}
      year={currentYear}
      branches={branches}
      initialBranchId={branchId || "all"}
    />
  );
}
