import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getActiveBranches } from "@/features/admin/data/branches";
import { getWorkOrders, WorkOrdersTable } from "@/features/facilities";
import { getSession, requirePermission } from "@/shared/auth/server";

export const metadata: Metadata = {
  title: "Phiếu sự cố & Bảo trì | CRM Khách Sạn",
};

export default async function WorkOrdersPage() {
  const hasPerm = await requirePermission("wo.view");
  if (!hasPerm.ok) {
    redirect("/");
  }

  const session = await getSession();
  const [workOrders, branches] = await Promise.all([
    getWorkOrders({ limit: 100 }),
    getActiveBranches(),
  ]);

  return (
    <WorkOrdersTable
      initialOrders={workOrders}
      branches={branches}
      currentBranchId={session?.currentBranchId || null}
    />
  );
}
