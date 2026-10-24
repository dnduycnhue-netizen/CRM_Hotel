import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getActiveBranches } from "@/features/admin";
import {
  ComplianceManager,
  getAssets,
  getComplianceDocsList,
  getComplianceDocTypes,
  getComplianceMatrix,
} from "@/features/facilities";
import { getSession } from "@/shared/auth/server";

export const metadata: Metadata = {
  title: "Hồ sơ pháp lý, PCCC & Kiểm định | CRM Khách Sạn",
  description:
    "Quản lý ma trận hồ sơ pháp lý, giấy phép PCCC, ATTP và kiểm định an toàn thiết bị theo từng cơ sở",
};

export default async function CompliancePage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  if (!session.can("compliance.view")) {
    redirect("/");
  }

  const canViewChain = session.can("report.view_chain");
  const allBranches = await getActiveBranches();
  const branches = canViewChain
    ? allBranches
    : allBranches.filter((b) => session.branchIds.includes(b.id));

  const targetBranchId = canViewChain ? undefined : branches[0]?.id;

  const [matrix, docs, docTypes, assets] = await Promise.all([
    getComplianceMatrix(targetBranchId),
    getComplianceDocsList(targetBranchId),
    getComplianceDocTypes(),
    getAssets(
      targetBranchId
        ? { branchId: targetBranchId, limit: 300 }
        : { limit: 300 },
    ),
  ]);

  return (
    <div className="space-y-6">
      <ComplianceManager
        matrix={matrix}
        docs={docs}
        docTypes={docTypes}
        branches={branches}
        assets={assets.map((a) => ({
          id: a.id,
          name: a.name,
          code: a.code,
          branch_id: a.branch_id,
        }))}
        canManage={session.can("compliance.manage")}
      />
    </div>
  );
}
