import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getActiveBranches } from "@/features/admin/data/branches";
import { AuditTable, getAuditLogs } from "@/features/audit";
import { getSession } from "@/shared/auth/server";

export const metadata: Metadata = {
  title: "Nhật ký thao tác & Thay đổi | CRM Khách Sạn",
};

export default async function AuditPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const canViewChain = session.can("audit.view_all");
  const canViewBranch = session.can("audit.view_branch");

  if (!canViewChain && !canViewBranch) {
    redirect("/?denied=1");
  }

  const allBranches = await getActiveBranches();
  const branches = canViewChain
    ? allBranches
    : allBranches.filter((b) => session.branchIds.includes(b.id));

  const branchId = canViewChain
    ? undefined
    : session.currentBranchId || branches[0]?.id;

  const logs = await getAuditLogs({ limit: 100, branchId });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Nhật ký thao tác hệ thống
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Theo dõi toàn bộ lịch sử thêm mới, chỉnh sửa, xóa dữ liệu và các truy
          cập nhạy cảm (xem CCCD, xuất báo cáo).
        </p>
      </div>

      <AuditTable initialLogs={logs} branches={branches} />
    </div>
  );
}
