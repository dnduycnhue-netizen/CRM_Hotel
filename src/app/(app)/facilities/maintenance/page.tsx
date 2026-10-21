import { Metadata } from 'next';
import { requirePermission } from '@/shared/auth/server';
import { redirect } from 'next/navigation';
import { getActiveBranches } from '@/features/admin';
import { getPmPlans, getInspections, MaintenanceHub } from '@/features/facilities';

export const metadata: Metadata = {
  title: 'Bảo trì định kỳ & Kiểm tra CSVC | CRM Khách Sạn',
};

export default async function MaintenancePage() {
  const hasPerm = await requirePermission('pm.view');
  if (!hasPerm) {
    redirect('/');
  }

  const [plans, inspections, branches] = await Promise.all([
    getPmPlans(),
    getInspections(),
    getActiveBranches(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Bảo trì định kỳ & Kiểm tra phòng
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Theo dõi lịch bảo trì thiết bị chu kỳ và lịch sử biên bản kiểm tra phòng, khu vực chung
        </p>
      </div>

      <MaintenanceHub
        plans={plans}
        inspections={inspections}
        branches={branches}
      />
    </div>
  );
}
