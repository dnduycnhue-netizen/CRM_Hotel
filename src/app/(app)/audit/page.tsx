import { Metadata } from 'next';
import { requirePermission } from '@/shared/auth/server';
import { redirect } from 'next/navigation';
import { getActiveBranches } from '@/features/admin/data/branches';
import { getAuditLogs, AuditTable } from '@/features/audit';

export const metadata: Metadata = {
  title: 'Nhật ký thao tác & Thay đổi | CRM Khách Sạn',
};

export default async function AuditPage() {
  const [hasAllPerm, hasBranchPerm] = await Promise.all([
    requirePermission('audit.view_all'),
    requirePermission('audit.view_branch'),
  ]);

  if (!hasAllPerm.ok && !hasBranchPerm.ok) {
    redirect('/');
  }

  const [logs, branches] = await Promise.all([
    getAuditLogs({ limit: 100 }),
    getActiveBranches(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Nhật ký thao tác hệ thống
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Theo dõi toàn bộ lịch sử thêm mới, chỉnh sửa, xóa dữ liệu và các truy cập nhạy cảm (xem CCCD, xuất báo cáo).
        </p>
      </div>

      <AuditTable initialLogs={logs} branches={branches} />
    </div>
  );
}
