import { Metadata } from 'next';
import { requirePermission, getSession } from '@/shared/auth/server';
import { redirect } from 'next/navigation';
import { getActiveBranches } from '@/features/admin/data/branches';
import { getAssets, AssetsTable } from '@/features/facilities';

export const metadata: Metadata = {
  title: 'Danh mục tài sản & Thiết bị | CRM Khách Sạn',
};

export default async function AssetsPage() {
  const hasPerm = await requirePermission('facility.view');
  if (!hasPerm.ok) {
    redirect('/');
  }

  const session = await getSession();
  const [assets, branches] = await Promise.all([
    getAssets({ limit: 150 }),
    getActiveBranches(),
  ]);

  return (
    <AssetsTable
      initialAssets={assets}
      branches={branches}
      currentBranchId={session?.currentBranchId || null}
    />
  );
}
