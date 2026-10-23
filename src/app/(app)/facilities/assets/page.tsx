import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getActiveBranches } from "@/features/admin/data/branches";
import { AssetsTable, getAssets } from "@/features/facilities";
import { getSession } from "@/shared/auth/server";

export const metadata: Metadata = {
  title: "Danh mục tài sản & Thiết bị | CRM Khách Sạn",
};

export default async function AssetsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  if (!session.can("facility.view")) {
    redirect("/");
  }
  const canViewChain = session.can("report.view_chain");
  const allBranches = await getActiveBranches();
  const branches = canViewChain
    ? allBranches
    : allBranches.filter((b) => session.branchIds.includes(b.id));

  const branchId = canViewChain
    ? undefined
    : session.currentBranchId || branches[0]?.id;

  const assets = await getAssets({ limit: 150, branchId });

  return (
    <AssetsTable
      initialAssets={assets}
      branches={branches}
      currentBranchId={branchId || null}
    />
  );
}
