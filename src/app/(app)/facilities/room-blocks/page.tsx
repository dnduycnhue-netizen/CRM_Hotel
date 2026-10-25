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
    redirect("/?denied=1");
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

  const [blocks, rooms] = await Promise.all([
    getRoomBlocks(branchId),
    getRooms(branchId),
  ]);

  const visibleBlocks =
    canViewChain && !session.can("report.view_chain")
      ? blocks.filter((b) => session.branchIds.includes(b.branch_id))
      : blocks;

  const visibleRooms =
    canViewChain && !session.can("report.view_chain")
      ? rooms.filter((r) => session.branchIds.includes(r.branchId))
      : rooms;

  return (
    <RoomBlocksTable
      initialBlocks={visibleBlocks}
      branches={branches}
      rooms={visibleRooms.map((r) => ({
        id: r.id,
        number: r.number,
        type: r.roomType || "Standard",
        branch_id: r.branchId,
      }))}
      currentBranchId={branchId || null}
      isChainAdmin={canViewChain}
    />
  );
}
