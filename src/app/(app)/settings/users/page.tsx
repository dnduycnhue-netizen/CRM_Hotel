import { Metadata } from 'next';
import { requirePermission } from '@/shared/auth/server';
import { redirect } from 'next/navigation';
import { getUsersList, getActiveBranches, UsersTable } from '@/features/admin';

export const metadata: Metadata = {
  title: 'Người dùng & Tài khoản nhân sự | Cài đặt hệ thống',
};

export default async function UsersPage() {
  const hasPerm = await requirePermission('settings.users');
  if (!hasPerm) {
    redirect('/');
  }

  const [users, branches] = await Promise.all([
    getUsersList(),
    getActiveBranches(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Người dùng & Tài khoản nhân sự
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Quản lý danh sách nhân sự toàn chuỗi (19 tài khoản), cơ sở công tác và phân bổ vai trò
        </p>
      </div>

      <UsersTable initialUsers={users} branches={branches} />
    </div>
  );
}
