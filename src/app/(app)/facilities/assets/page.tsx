import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getActiveBranches } from "@/features/admin/data/branches";
import { getRooms } from "@/features/admin/data/rooms";
import {
  AssetsTable,
  getAssetCategories,
  getAssets,
} from "@/features/facilities";
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
  const canViewChain =
    session.can("report.view_chain") || session.branchIds.length > 1;
  const allBranches = await getActiveBranches();
  const branches = session.can("report.view_chain")
    ? allBranches
    : allBranches.filter((b) => session.branchIds.includes(b.id));

  const branchId = canViewChain
    ? undefined
    : session.currentBranchId || branches[0]?.id;

  const [assets, categories, rooms] = await Promise.all([
    getAssets({ limit: 300, branchId }),
    getAssetCategories(),
    getRooms(branchId),
  ]);

  const visibleAssets =
    canViewChain && !session.can("report.view_chain")
      ? assets.filter((a) => session.branchIds.includes(a.branch_id))
      : assets;

  const visibleRooms =
    canViewChain && !session.can("report.view_chain")
      ? rooms.filter((r) => session.branchIds.includes(r.branchId))
      : rooms;

  return (
    <AssetsTable
      initialAssets={visibleAssets}
      branches={branches}
      categories={categories}
      rooms={visibleRooms.map((r) => ({
        id: r.id,
        number: r.number,
        branchId: r.branchId,
      }))}
      currentBranchId={branchId || null}
      canManage={session.can("facility.manage")}
    />
  );
}
