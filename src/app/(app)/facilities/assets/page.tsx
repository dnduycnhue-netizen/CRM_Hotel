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
  const [assets, branches] = await Promise.all([
    getAssets({ limit: 150 }),
    getActiveBranches(),
  ]);

  return (
    <AssetsTable
      initialAssets={assets}
      branches={branches}
      currentBranchId={session?.currentBranchId || null}
    />
  );
}
