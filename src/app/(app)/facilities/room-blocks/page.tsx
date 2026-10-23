import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getActiveBranches } from "@/features/admin/data/branches";
import { getRooms } from "@/features/admin/data/rooms";
import { getRoomBlocks, RoomBlocksTable } from "@/features/facilities";
import { getSession } from "@/shared/auth/server";

export const metadata: Metadata = {
  title: "Khóa phòng ngừng bán | CRM Khách Sạn",
};

export default async function RoomBlocksPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  if (!session.can("room.block")) {
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

  const [blocks, rooms] = await Promise.all([
    getRoomBlocks(branchId),
    getRooms(branchId),
  ]);

  return (
    <RoomBlocksTable
      initialBlocks={blocks}
      branches={branches}
      rooms={rooms.map((r) => ({
        id: r.id,
        number: r.number,
        type: r.roomType || "Standard",
        branch_id: r.branchId,
      }))}
      currentBranchId={branchId || null}
    />
  );
}
