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
    redirect("/?denied=1");
  }

  const isOwner = session.can("settings.branches");
  const canViewChain = session.can("report.view_chain") || isOwner;
  const allBranches = await getActiveBranches();

  // Khóa danh sách chi nhánh: Chỉ Chủ chuỗi (hoặc có quyền xem toàn chuỗi) mới xem tất cả cơ sở;
  // Nhân viên cơ sở & kỹ thuật chỉ xem cơ sở cố định của mình (session.defaultBranchId)
  let branches = allBranches;
  if (!canViewChain) {
    if (session.defaultBranchId) {
      const fixed = allBranches.filter((b) => b.id === session.defaultBranchId);
      branches =
        fixed.length > 0
          ? fixed
          : allBranches.filter((b) => b.id === session.currentBranchId);
    } else if (session.currentBranchId) {
      branches = allBranches.filter((b) => b.id === session.currentBranchId);
    } else {
      branches = allBranches.slice(0, 1);
    }
  }

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
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Hồ sơ pháp lý & Kiểm định
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Giấy phép, PCCC, bảo hiểm cháy nổ… theo cơ sở; cảnh báo trước hạn 30 /
          60 / 90 ngày.
        </p>
      </div>
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
        canManage={
          session.can("compliance.manage") || session.can("facility.manage")
        }
      />
    </div>
  );
}
