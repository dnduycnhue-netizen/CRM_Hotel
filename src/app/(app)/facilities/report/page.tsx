import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getActiveBranches } from "@/features/admin/data/branches";
import { getRooms } from "@/features/admin/data/rooms";
import { getFacilityLocations, ReportIssueForm } from "@/features/facilities";
import { getSession, requirePermission } from "@/shared/auth/server";

export const metadata: Metadata = {
  title: "Báo sự cố buồng phòng | CRM Khách Sạn",
};

export default async function ReportIssuePage() {
  const hasPerm = await requirePermission("wo.create");
  if (!hasPerm.ok) {
    redirect("/");
  }

  const session = await getSession();
  const [branches, rooms, locations] = await Promise.all([
    getActiveBranches(),
    getRooms(),
    getFacilityLocations(),
  ]);

  return (
    <ReportIssueForm
      branches={branches}
      currentBranchId={session?.currentBranchId || branches[0]?.id || null}
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
