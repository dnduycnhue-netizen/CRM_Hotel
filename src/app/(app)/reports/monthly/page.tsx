import { Metadata } from 'next';
import { requirePermission } from '@/shared/auth/server';
import { redirect } from 'next/navigation';
import { getActiveBranches } from '@/features/admin/data/branches';
import { getMonthlyReport, MonthlyRevenueTable } from '@/features/reports';

export const metadata: Metadata = {
  title: 'Báo cáo Doanh thu & Cùng kỳ YoY | CRM Khách Sạn',
};

export default async function MonthlyRevenuePage() {
  const hasPerm = await requirePermission('revenue.view');
  if (!hasPerm) {
    redirect('/reports');
  }

  const currentYear = new Date().getFullYear();
  const [rows, branches] = await Promise.all([
    getMonthlyReport(currentYear),
    getActiveBranches(),
  ]);

  return (
    <MonthlyRevenueTable
      initialRows={rows}
      year={currentYear}
      branches={branches}
    />
  );
}
