import { Metadata } from 'next';
import { requirePermission } from '@/shared/auth/server';
import { redirect } from 'next/navigation';
import { getActiveBranches } from '@/features/admin';
import { getComplianceAlerts, ComplianceAlertsView } from '@/features/facilities';

export const metadata: Metadata = {
  title: 'Cảnh báo hết hạn pháp lý & PCCC | CRM Khách Sạn',
};

export default async function ComplianceAlertsPage() {
  const hasPerm = await requirePermission('facility.view');
  if (!hasPerm) {
    redirect('/');
  }

  const [alerts, branches] = await Promise.all([
    getComplianceAlerts(),
    getActiveBranches(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Cảnh báo hết hạn hồ sơ & PCCC
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Theo dõi hạn định kỳ của bảo hiểm cháy nổ, kiểm định thang máy, PCCC và bảo hành thiết bị toàn chuỗi (US-32)
        </p>
      </div>

      <ComplianceAlertsView alerts={alerts} branches={branches} />
    </div>
  );
}
