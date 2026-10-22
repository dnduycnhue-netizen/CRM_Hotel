import { Metadata } from 'next';
import { requirePermission } from '@/shared/auth/server';
import { redirect } from 'next/navigation';
import { getActiveBranches } from '@/features/admin/data/branches';
import { getReportKpis, getReportSeries, DashboardOverview } from '@/features/reports';

export const metadata: Metadata = {
  title: 'Báo cáo công suất & Lưu trú | CRM Khách Sạn',
};

export default async function ReportsPage() {
  const hasPerm = await requirePermission('report.view_branch');
  if (!hasPerm.ok) {
    redirect('/');
  }

  const [kpis, series, branches] = await Promise.all([
    getReportKpis(),
    getReportSeries({ grain: 'day' }),
    getActiveBranches(),
  ]);

  return (
    <DashboardOverview
      data={kpis}
      series={series}
      branches={branches}
    />
  );
}
