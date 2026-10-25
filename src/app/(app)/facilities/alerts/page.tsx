import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getActiveBranches } from "@/features/admin";
import {
  ComplianceAlertsView,
  getComplianceAlerts,
} from "@/features/facilities";
import { getSession } from "@/shared/auth/server";

export const metadata: Metadata = {
  title: "Cảnh báo hết hạn pháp lý & PCCC | CRM Khách Sạn",
};

export default async function ComplianceAlertsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  if (!session.can("facility.view")) {
    redirect("/?denied=1");
  }

  const canViewChain = session.can("report.view_chain");
  const allBranches = await getActiveBranches();
  const branches = canViewChain
    ? allBranches
    : allBranches.filter((b) => session.branchIds.includes(b.id));

  const alerts = await getComplianceAlerts();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Cảnh báo hết hạn hồ sơ & PCCC
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Theo dõi hạn định kỳ của bảo hiểm cháy nổ, kiểm định thang máy, PCCC
          và bảo hành thiết bị toàn chuỗi (US-32)
        </p>
      </div>

      <ComplianceAlertsView alerts={alerts} branches={branches} />
    </div>
  );
}
