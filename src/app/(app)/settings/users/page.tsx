import { Metadata } from 'next';
import { requirePermission } from '@/shared/auth/server';
import { redirect } from 'next/navigation';
import { getUsersList, getActiveBranches, getSystemRoles, UsersTable } from '@/features/admin';

export const metadata: Metadata = {
  title: 'Người Dùng & Phân Quyền Tài Khoản | CRM Chuỗi Khách Sạn',
  description: 'Thêm tài khoản nhân sự mới, phân bổ cơ sở làm việc và gán vai trò quyền hạn',
};

export default async function UsersPage() {
  const hasPerm = await requirePermission('settings.users');
  if (!hasPerm) {
    redirect('/');
  }

  const [users, branches, { roles }] = await Promise.all([
    getUsersList(),
    getActiveBranches(),
    getSystemRoles(),
  ]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <UsersTable initialUsers={users} branches={branches} roles={roles} />
    </div>
  );
}
