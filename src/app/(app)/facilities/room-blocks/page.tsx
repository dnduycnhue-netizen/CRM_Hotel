import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getActiveBranches } from "@/features/admin/data/branches";
import { getRooms } from "@/features/admin/data/rooms";
import { getRoomBlocks, RoomBlocksTable } from "@/features/facilities";
import { getSession, requirePermission } from "@/shared/auth/server";

export const metadata: Metadata = {
  title: "Khóa phòng ngừng bán | CRM Khách Sạn",
};

export default async function RoomBlocksPage() {
  const hasPerm = await requirePermission("room.block");
  if (!hasPerm.ok) {
    redirect("/");
  }

  const session = await getSession();
  const [blocks, branches, rooms] = await Promise.all([
    getRoomBlocks(),
    getActiveBranches(),
    getRooms(),
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
      currentBranchId={session?.currentBranchId || null}
    />
  );
}
