import { redirect } from "next/navigation";
import { getActiveBranches } from "@/features/admin";
import { getInHouseStays, InHouseTable } from "@/features/stays";
import { getSession } from "@/shared/auth/server";

export const metadata = {
  title: "Khách đang ở | CRM Chuỗi Khách Sạn",
  description: "Danh sách các lượt lưu trú đang ở tại cơ sở hiện tại",
};

export default async function StaysPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  if (!session.can("stay.view")) {
    redirect("/?denied=1");
  }
  const allBranches = await getActiveBranches();

  // Prioritize user's authorized branches
  const branches =
    session?.branchIds && session.branchIds.length > 0
      ? allBranches.filter((b) => session.branchIds.includes(b.id))
      : allBranches;

  const currentBranchId =
    (session?.currentBranchId &&
    branches.some((b) => b.id === session.currentBranchId)
      ? session.currentBranchId
      : branches[0]?.id) || allBranches[0]?.id;

  const currentBranch =
    branches.find((b) => b.id === currentBranchId) ||
    branches[0] ||
    allBranches[0];
  const stays = await getInHouseStays(currentBranchId, "all");

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Khách Đang Ở ({currentBranch.name})
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Quản lý các phòng có khách, gia hạn thời gian và xử lý thủ tục trả
          phòng
        </p>
      </div>

      <InHouseTable
        stays={stays}
        currentBranchId={currentBranchId}
        branchName={currentBranch.name}
      />
    </div>
  );
}
