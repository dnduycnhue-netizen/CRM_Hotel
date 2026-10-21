import { Metadata } from 'next';
import { requirePermission, getSession } from '@/shared/auth/server';
import { redirect } from 'next/navigation';
import { getActiveBranches } from '@/features/admin/data/branches';
import { getWorkOrders, WorkOrdersTable } from '@/features/facilities';

export const metadata: Metadata = {
  title: 'Phiếu sự cố & Bảo trì | CRM Khách Sạn',
};

export default async function WorkOrdersPage() {
  const hasPerm = await requirePermission('wo.view');
  if (!hasPerm) {
    redirect('/');
  }

  const session = await getSession();
  const [workOrders, branches] = await Promise.all([
    getWorkOrders({ limit: 100 }),
    getActiveBranches(),
  ]);

  return (
    <WorkOrdersTable
      initialOrders={workOrders}
      branches={branches}
      currentBranchId={session?.currentBranchId || null}
    />
  );
}
