import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getActiveBranches } from "@/features/admin";
import { FacilitiesReportView, getFacilityReport } from "@/features/reports";
import { getSession } from "@/shared/auth/server";

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
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const canView =
    session.can("report.view_chain") ||
    session.can("report.view_branch") ||
    session.can("facility.view");

  if (!canView) {
    redirect("/");
  }

  const searchParams = await props.searchParams;
  const rawBranchId = searchParams.branchId;
  const effectiveBranchId =
    !session.can("report.view_chain") && session.currentBranchId
      ? session.currentBranchId
      : rawBranchId;

  const branchIds =
    effectiveBranchId && effectiveBranchId !== "all"
      ? [effectiveBranchId]
      : undefined;
  const from = searchParams.from;
  const to = searchParams.to;

  const [data, allBranches] = await Promise.all([
    getFacilityReport({ from, to, branchIds }),
    getActiveBranches(),
  ]);

  const branches = session.can("report.view_chain")
    ? allBranches
    : allBranches.filter((b) => session.branchIds.includes(b.id));

  return (
    <FacilitiesReportView
      data={data}
      branches={branches}
      initialBranchId={effectiveBranchId || "all"}
      initialPreset={searchParams.preset || "30days"}
      initialFrom={from}
      initialTo={to}
    />
  );
}
