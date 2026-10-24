import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getActiveBranches } from "@/features/admin/data/branches";
import { getRooms } from "@/features/admin/data/rooms";
import {
  getChecklistTemplates,
  getFacilityLocations,
  InspectionRunner,
} from "@/features/facilities";
import { getSession } from "@/shared/auth/server";

export const metadata: Metadata = {
  title: "Thực hiện kiểm tra phòng & CSVC | CRM Khách Sạn",
  description:
    "Biên bản kiểm tra kỹ thuật buồng phòng và cơ sở vật chất trực quan",
};

export default async function NewInspectionPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  if (!session.can("inspection.perform")) {
    redirect("/");
  }

  const canViewChain = session.can("report.view_chain");
  const [allBranches, allRooms, allLocations, allTemplates] = await Promise.all(
    [
      getActiveBranches(),
      getRooms(),
      getFacilityLocations(),
      getChecklistTemplates(),
    ],
  );

  const branches = canViewChain
    ? allBranches
    : allBranches.filter((b) => session.branchIds.includes(b.id));

  const branchIds = new Set(branches.map((b) => b.id));
  const rooms = allRooms
    .filter((r) => branchIds.has(r.branchId))
    .map((r) => ({
      id: r.id,
      number: r.number,
      type: r.roomType || "Standard",
      branch_id: r.branchId,
    }));

  const locations = allLocations
    .filter((l) => branchIds.has(l.branch_id))
    .map((l) => ({
      id: l.id,
      name: l.name,
      branch_id: l.branch_id,
    }));

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Kiểm Tra Phòng & Cơ Sở Vật Chất
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Đánh giá chất lượng buồng phòng, trang thiết bị theo bộ tiêu chuẩn
          checklist. Các mục lỗi sẽ tự động sinh phiếu sửa chữa cho kỹ thuật.
        </p>
      </div>

      <InspectionRunner
        branches={branches}
        currentBranchId={session.currentBranchId || branches[0]?.id || null}
        templates={allTemplates}
        rooms={rooms}
        locations={locations}
      />
    </div>
  );
}
