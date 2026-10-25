import { AppHeader } from "@/components/layout/app-header";
import { AccessDeniedToast } from "@/components/layout/access-denied-toast";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { NetworkStatusBanner } from "@/components/pwa/network-status-banner";
import { getActiveBranches } from "@/features/admin/data/branches";
import { AccessProvider } from "@/shared/auth";
import { getSession } from "@/shared/auth/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const allBranches = await getActiveBranches();

  // If no active session, provide fallback empty access for previewing shells
  const access = session?.access || { permissions: {}, modules: {} };

  // Only provide branches the user actually has access to
  const branches =
    session?.branchIds && session.branchIds.length > 0
      ? allBranches.filter((b) => session.branchIds.includes(b.id))
      : allBranches;

  const currentBranchId =
    session?.currentBranchId &&
    branches.some((b) => b.id === session.currentBranchId)
      ? session.currentBranchId
      : branches[0]?.id || null;

  return (
    <AccessProvider value={{ access, branchId: currentBranchId }}>
      <NetworkStatusBanner />
      <AccessDeniedToast />
      <div className="flex min-h-screen bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader
            branches={branches}
            currentBranchId={currentBranchId}
            userEmail={session?.email}
            userFullName={session?.fullName}
            canManageUsers={session?.can("settings.users") ?? false}
            canViewRoles={session?.can("settings.roles") ?? false}
            canCreateStay={session?.can("stay.create") ?? false}
            canReportFacility={session?.can("wo.create") ?? false}
          />
          <main className="flex-1 p-6 overflow-y-auto">{children}</main>
        </div>
      </div>
    </AccessProvider>
  );
}
