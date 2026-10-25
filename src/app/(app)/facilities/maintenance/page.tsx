import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getActiveBranches } from "@/features/admin";
import {
  getChecklistTemplates,
  getInspectionsList,
  getPmPlans,
  MaintenanceHub,
} from "@/features/facilities";
import { getSession } from "@/shared/auth/server";

export const metadata: Metadata = {
  title: "Bảo trì định kỳ & Kiểm tra CSVC | CRM Khách Sạn",
  description:
    "Theo dõi kế hoạch bảo trì thiết bị và biên bản kiểm tra phòng, khu vực",
};

export default async function MaintenancePage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  if (!session.can("pm.view")) {
    redirect("/");
  }

  const canViewChain = session.can("report.view_chain");
  const allBranches = await getActiveBranches();
  const branches = canViewChain
    ? allBranches
    : allBranches.filter((b) => session.branchIds.includes(b.id));

  const [plans, inspections, templates] = await Promise.all([
    getPmPlans(),
    getInspectionsList(),
    getChecklistTemplates(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Bảo trì định kỳ & Kiểm tra phòng
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Theo dõi lịch bảo trì thiết bị chu kỳ và lịch sử biên bản kiểm tra
          phòng, khu vực chung
        </p>
      </div>

      <MaintenanceHub
        plans={plans}
        inspections={inspections}
        templates={templates}
        branches={branches}
        canManagePm={session.can("pm.manage")}
        canPerformInspection={session.can("inspection.perform")}
      />
    </div>
  );
}
