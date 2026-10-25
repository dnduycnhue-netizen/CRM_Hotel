import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getActiveBranches } from "@/features/admin/data/branches";
import { getWorkOrders, WorkOrdersTable } from "@/features/facilities";
import { getSession } from "@/shared/auth/server";

export const metadata: Metadata = {
  title: "Phiếu sự cố & Bảo trì | CRM Khách Sạn",
};

export default async function WorkOrdersPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  if (!session.can("wo.view")) {
    redirect("/?denied=1");
  }
  const canViewChain = session.can("report.view_chain");
  const allBranches = await getActiveBranches();
  const branches = canViewChain
    ? allBranches
    : allBranches.filter((b) => session.branchIds.includes(b.id));

  const branchId = canViewChain
    ? undefined
    : session.currentBranchId || branches[0]?.id;

  const workOrders = await getWorkOrders({ limit: 100, branchId });

  return (
    <WorkOrdersTable
      initialOrders={workOrders}
      branches={branches}
      currentBranchId={branchId || null}
    />
  );
}
