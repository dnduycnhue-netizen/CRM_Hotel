'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/shared/auth/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ok, fail, type ActionResult } from '@/shared/errors';

export async function selectBranchAction(branchId: string) {
  const cookieStore = await cookies();
  cookieStore.set('branch_id', branchId, {
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  revalidatePath('/', 'layout');
}

/**
 * Tạo tài khoản nhân sự mới và phân quyền vai trò
 */
export async function createUserAction(
  formData: FormData
): Promise<ActionResult<{ id: string; fullName: string }>> {
  const hasPerm = await requirePermission('settings.users');
  if (!hasPerm) {
    return fail('FORBIDDEN');
  }

  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const password = formData.get('password') as string;
  const fullName = (formData.get('fullName') as string)?.trim();
  const phone = (formData.get('phone') as string)?.trim() || null;
  const roleId = formData.get('roleId') as string;
  const branchId = (formData.get('branchId') as string) || null;

  if (!email || !password || !fullName || !roleId) {
    return fail('VALIDATION');
  }

  if (password.length < 6) {
    return fail('VALIDATION', { password: ['Mật khẩu phải có tối thiểu 6 ký tự'] });
  }

  const adminClient = supabaseAdmin();

  // 1. Tạo auth user
  const { data: userRes, error: userErr } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (userErr || !userRes.user) {
    return fail('CONFLICT', { email: [userErr?.message || 'Email này đã tồn tại trong hệ thống!'] });
  }

  const userId = userRes.user.id;

  // 2. Thêm profile nhân sự
  const { error: profileErr } = await adminClient.from('profiles').insert({
    id: userId,
    full_name: fullName,
    phone,
    default_branch_id: branchId || null,
    is_active: true,
  });

  if (profileErr) {
    await adminClient.auth.admin.deleteUser(userId);
    return fail('UNKNOWN');
  }

  // 3. Gán vai trò (user_roles)
  await adminClient.from('user_roles').insert({
    user_id: userId,
    role_id: roleId,
    branch_id: branchId || null,
  });

  // 4. Kích hoạt trigger tính lại permissions
  await adminClient.from('profiles').update({ is_active: true }).eq('id', userId);

  revalidatePath('/settings/users');
  return ok({ id: userId, fullName });
}

/**
 * Cập nhật thông tin nhân sự và phân bổ lại vai trò / cơ sở
 */
export async function updateUserAction(
  formData: FormData
): Promise<ActionResult<{ success: boolean }>> {
  const hasPerm = await requirePermission('settings.users');
  if (!hasPerm) {
    return fail('FORBIDDEN');
  }

  const userId = formData.get('userId') as string;
  const fullName = (formData.get('fullName') as string)?.trim();
  const phone = (formData.get('phone') as string)?.trim() || null;
  const roleId = formData.get('roleId') as string;
  const branchId = (formData.get('branchId') as string) || null;
  const isActive = formData.get('isActive') === 'true';

  if (!userId || !fullName || !roleId) {
    return fail('VALIDATION');
  }

  const adminClient = supabaseAdmin();

  // 1. Cập nhật profile
  const { error: pErr } = await adminClient
    .from('profiles')
    .update({
      full_name: fullName,
      phone,
      default_branch_id: branchId || null,
      is_active: isActive,
    })
    .eq('id', userId);

  if (pErr) {
    return fail('UNKNOWN');
  }

  // 2. Cập nhật vai trò (user_roles)
  await adminClient.from('user_roles').delete().eq('user_id', userId);
  await adminClient.from('user_roles').insert({
    user_id: userId,
    role_id: roleId,
    branch_id: branchId || null,
  });

  // 3. Kích hoạt trigger tính lại permissions
  await adminClient.from('profiles').update({ is_active: isActive }).eq('id', userId);

  revalidatePath('/settings/users');
  return ok({ success: true });
}

/**
 * Lưu ma trận quyền hạn cho một vai trò hệ thống
 */
export async function updateRolePermissionsAction(
  roleId: string,
  permissionKeys: string[]
): Promise<ActionResult<{ count: number }>> {
  const hasPerm = await requirePermission('settings.roles');
  if (!hasPerm) {
    return fail('FORBIDDEN');
  }

  const adminClient = supabaseAdmin();

  // Xóa quyền cũ và ghi quyền mới
  await adminClient.from('role_permissions').delete().eq('role_id', roleId);

  if (permissionKeys.length > 0) {
    const rows = permissionKeys.map((k) => ({
      role_id: roleId,
      permission_key: k,
    }));
    await adminClient.from('role_permissions').insert(rows);
  }

  // Dựng lại quyền cho các user mang vai trò này
  const { data: usersWithRole } = await (adminClient.from('user_roles') as any)
    .select('user_id')
    .eq('role_id', roleId);

  if (usersWithRole && Array.isArray(usersWithRole)) {
    for (const u of usersWithRole) {
      await adminClient.from('profiles').update({ is_active: true }).eq('id', (u as any).user_id);
    }
  }

  revalidatePath('/settings/roles');
  return ok({ count: permissionKeys.length });
}
