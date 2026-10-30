import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getActiveBranches } from "@/features/admin/data/branches";
import { getRooms } from "@/features/admin/data/rooms";
import { getFacilityLocations, ReportIssueForm } from "@/features/facilities";
import { getSession } from "@/shared/auth/server";

export const metadata: Metadata = {
  title: "Báo sự cố buồng phòng | CRM Khách Sạn",
};

export default async function ReportIssuePage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  if (!session.can("wo.create")) {
    redirect("/?denied=1");
  }

  const [allBranches, rooms, locations] = await Promise.all([
    getActiveBranches(),
    getRooms(),
    getFacilityLocations(),
  ]);

  // Chỉ Chủ chuỗi (có quyền settings.branches) mới được báo sự cố trên toàn chuỗi
  const isOwner = session.can("settings.branches");

  // Khóa danh sách cơ sở phát sinh sự cố về đúng chi nhánh CỐ ĐỊNH của tài khoản (profile.default_branch_id)
  let branches = allBranches;
  if (!isOwner) {
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

  const currentBranchId =
    branches.find((b) => b.id === session.defaultBranchId)?.id ||
    branches.find((b) => b.id === session.currentBranchId)?.id ||
    branches[0]?.id ||
    null;

  return (
    <ReportIssueForm
      branches={branches}
      currentBranchId={currentBranchId}
      rooms={rooms.map((r) => ({
        id: r.id,
        number: r.number,
        type: r.roomType || "Standard",
        branch_id: r.branchId,
      }))}
      locations={locations.map((l) => ({
        id: l.id,
        name: l.name,
        branch_id: l.branch_id,
      }))}
    />
  );
}
