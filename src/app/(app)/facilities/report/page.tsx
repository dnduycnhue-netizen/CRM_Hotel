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

  const isOwner =
    session.can("settings.branches") ||
    session.branchIds.length >= allBranches.length;

  // Khóa danh sách cơ sở phát sinh sự cố về đúng chi nhánh cố định của tài khoản (với Chủ chuỗi thì được chọn toàn chuỗi)
  const branches = isOwner
    ? allBranches
    : allBranches.filter((b) => session.branchIds.includes(b.id));

  const currentBranchId =
    session.currentBranchId &&
    branches.some((b) => b.id === session.currentBranchId)
      ? session.currentBranchId
      : branches[0]?.id || null;

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
