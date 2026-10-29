import { redirect } from "next/navigation";
import { getActiveBranches, getRooms, RoomsTable } from "@/features/admin";
import { getSession } from "@/shared/auth/server";

export const metadata = {
  title: "Cài đặt phòng | CRM Chuỗi Khách Sạn",
  description: "Danh mục 240 phòng kinh doanh của 8 khách sạn",
};

export default async function SettingsRoomsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  if (!session.can("settings.rooms")) {
    redirect("/?denied=1");
  }

  const [allRooms, allBranches] = await Promise.all([
    getRooms(),
    getActiveBranches(),
  ]);

  const isOwner =
    session.can("settings.branches") ||
    session.branchIds.length >= allBranches.length;

  const allowedBranches = isOwner
    ? allBranches
    : allBranches.filter((b) => session.branchIds.includes(b.id));

  const initialBranchId = isOwner
    ? "all"
    : session.currentBranchId || allowedBranches[0]?.id || "all";

  const rooms = isOwner
    ? allRooms
    : allRooms.filter((r) => session.branchIds.includes(r.branchId));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Cài đặt Danh Mục Phòng
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isOwner
            ? "Danh mục phòng thuộc 8 khách sạn, hỗ trợ thêm, sửa, ngừng kinh doanh và xóa phòng"
            : `Quản lý danh mục phòng cơ sở ${allowedBranches[0]?.name || ""}`}
        </p>
      </div>

      <RoomsTable
        rooms={rooms}
        branches={allowedBranches}
        isOwner={isOwner}
        defaultBranchId={initialBranchId}
      />
    </div>
  );
}
