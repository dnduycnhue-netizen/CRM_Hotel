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

  const canViewAudit =
    session.can("audit.view_all") || session.can("audit.view_branch");

  if (!canViewAudit) {
    redirect("/");
  }

  const branchId =
    !session.can("audit.view_all") && session.currentBranchId
      ? session.currentBranchId
      : undefined;

  const [logs, allBranches] = await Promise.all([
    getAuditLogs({ limit: 100, branchId }),
    getActiveBranches(),
  ]);

  const branches = session.can("audit.view_all")
    ? allBranches
    : allBranches.filter((b) => session.branchIds.includes(b.id));

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
