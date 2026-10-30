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

  // Chỉ cho phép chọn cơ sở mà người dùng có quyền tạo phiếu sự cố (wo.create)
  const branches = allBranches.filter((b) => session.can("wo.create", b.id));
  const currentBranchId =
    session.currentBranchId && session.can("wo.create", session.currentBranchId)
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
