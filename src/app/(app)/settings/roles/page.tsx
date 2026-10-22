import { getSystemRoles, RoleMatrixTable } from '@/features/admin';
import { requirePermission } from '@/shared/auth/server';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Ma trận vai trò & quyền | CRM Chuỗi Khách Sạn',
  description: 'Phân quyền động dạng ma trận checkbox cho các vai trò',
};

export default async function SettingsRolesPage() {
  const hasPerm = await requirePermission('settings.roles');
  if (!hasPerm.ok) {
    redirect('/');
  }

  const { roles, permissions } = await getSystemRoles();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Phân Quyền Vai Trò (Role Matrix)
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Ma trận checkbox tùy chỉnh quyền hạn cho từng nhóm nhân viên (Lễ tân, Quản lý, Sales, Kỹ thuật)
        </p>
      </div>

      <RoleMatrixTable roles={roles} permissions={permissions} />
    </div>
  );
}
