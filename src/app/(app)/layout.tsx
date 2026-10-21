import { getSession } from '@/shared/auth/server';
import { AccessProvider } from '@/shared/auth';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppHeader } from '@/components/layout/app-header';
import { getActiveBranches } from '@/features/admin/data/branches';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const branches = await getActiveBranches();

  // If no active session, provide fallback empty access for previewing shells
  const access = session?.access || { permissions: {}, modules: {} };
  const currentBranchId = session?.currentBranchId || branches[0]?.id || null;

  return (
    <AccessProvider value={{ access, branchId: currentBranchId }}>
      <div className="flex min-h-screen bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader
            branches={branches}
            currentBranchId={currentBranchId}
            userEmail={session?.email}
          />
          <main className="flex-1 p-6 overflow-y-auto">{children}</main>
        </div>
      </div>
    </AccessProvider>
  );
}
