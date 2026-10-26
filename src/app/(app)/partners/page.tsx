import { redirect } from "next/navigation";
import { getPartnersOverview, PartnersHub } from "@/features/partners";
import { getSession } from "@/shared/auth/server";

export const metadata = {
  title: "Đối tác lữ hành & Khách đoàn | CRM Chuỗi Khách Sạn",
  description:
    "Quản lý công ty lữ hành, đại lý OTA, hợp đồng giá bán buôn, khách đoàn MICE và chi trả hoa hồng",
};

export default async function PartnersPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  // User must have at least partner.view or group.manage or commission.view
  const canAccess =
    session.can("partner.view") ||
    session.can("group.manage") ||
    session.can("commission.view");

  if (!canAccess) {
    redirect("/?denied=1");
  }

  const isChainAdmin =
    session.can("report.view_chain") || session.can("partner.manage");
  // Sales có partner.manage nhưng chỉ được sửa đoàn của chính mình;
  // quản lý/chủ chuỗi (có quyền xem báo cáo) mới được sửa mọi đoàn.
  const canEditAnyGroup =
    session.can("report.view_chain") || session.can("report.view_branch");
  const branchId = isChainAdmin
    ? null
    : session.currentBranchId || session.branchIds[0];

  const overview = await getPartnersOverview(branchId);
  const allPermissions = Array.from(
    new Set(Object.values(session.access.permissions || {}).flat()),
  );

  return (
    <div className="max-w-7xl mx-auto py-2">
      <PartnersHub
        initialPartners={overview.partners}
        initialContracts={overview.contracts}
        initialGroupBookings={overview.groupBookings}
        initialCommissions={overview.commissions}
        branches={overview.branches}
        stats={overview.stats}
        userPermissions={allPermissions}
        currentUserId={session.userId}
        currentBranchId={session.currentBranchId}
        isChainAdmin={isChainAdmin}
        canEditAnyGroup={canEditAnyGroup}
      />
    </div>
  );
}
