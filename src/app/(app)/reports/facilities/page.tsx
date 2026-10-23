import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getActiveBranches } from "@/features/admin";
import { FacilitiesReportView, getFacilityReport } from "@/features/reports";
import { requirePermission } from "@/shared/auth/server";

export const metadata: Metadata = {
  title: "Báo cáo Vận hành Cơ sở vật chất & Bảo trì | CRM Khách Sạn",
};

interface FacilitiesReportPageProps {
  searchParams: Promise<{
    branchId?: string;
    from?: string;
    to?: string;
    preset?: string;
  }>;
}

export default async function FacilitiesReportPage(
  props: FacilitiesReportPageProps,
) {
  const hasPerm = await requirePermission("facility.view");
  if (!hasPerm.ok) {
    const altPerm = await requirePermission("report.view_branch");
    if (!altPerm.ok) {
      redirect("/reports");
    }
  }

  const searchParams = await props.searchParams;
  const branchId = searchParams.branchId;
  const branchIds = branchId && branchId !== "all" ? [branchId] : undefined;
  const from = searchParams.from;
  const to = searchParams.to;

  const [data, branches] = await Promise.all([
    getFacilityReport({ from, to, branchIds }),
    getActiveBranches(),
  ]);

  return (
    <FacilitiesReportView
      data={data}
      branches={branches}
      initialBranchId={branchId || "all"}
      initialPreset={searchParams.preset || "30days"}
      initialFrom={from}
      initialTo={to}
    />
  );
}
