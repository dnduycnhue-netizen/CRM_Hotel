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
  if (!hasPerm.ok) {
    return hasPerm;
  }
  const callerUserId = hasPerm.data.userId;

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

  // Chống leo quyền: Chỉ Chủ chuỗi mới có quyền gán role Owner
  const { data: assignedRole } = await (adminClient
    .from('roles') as any)
    .select('key')
    .eq('id', roleId)
    .single();

  const { data: callerRoles } = await (adminClient.from('user_roles') as any)
    .select('role:roles(key)')
    .eq('user_id', callerUserId);
  const isCallerOwner = callerRoles?.some((r: any) => r.role?.key === 'owner');

  if (assignedRole?.key === 'owner' && !isCallerOwner) {
    return fail('FORBIDDEN', undefined, 'Chỉ Chủ chuỗi mới có quyền tạo tài khoản với vai trò Chủ chuỗi');
  }

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
 * Cập nhật thông tin nhân sự và phân bổ lại vai trò / cơ sở (chống leo quyền)
 */
export async function updateUserAction(
  formData: FormData
): Promise<ActionResult<{ success: boolean }>> {
  const hasPerm = await requirePermission('settings.users');
  if (!hasPerm.ok) {
    return hasPerm;
  }
  const callerUserId = hasPerm.data.userId;

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

  // Kiểm tra vai trò của người thực hiện
  const { data: callerRoles } = await (adminClient.from('user_roles') as any)
    .select('role:roles(key)')
    .eq('user_id', callerUserId);
  const isCallerOwner = callerRoles?.some((r: any) => r.role?.key === 'owner');

  // Kiểm tra tài khoản đích có phải là Chủ chuỗi
  const { data: targetRoles } = await (adminClient.from('user_roles') as any)
    .select('role:roles(key)')
    .eq('user_id', userId);
  const isTargetOwner = targetRoles?.some((r: any) => r.role?.key === 'owner');

  if (isTargetOwner && !isCallerOwner) {
    return fail('FORBIDDEN', undefined, 'Bạn không thể chỉnh sửa tài khoản của Chủ chuỗi');
  }

  // Kiểm tra vai trò đang muốn gán
  const { data: assignedRole } = await (adminClient
    .from('roles') as any)
    .select('key')
    .eq('id', roleId)
    .single();

  if (assignedRole?.key === 'owner' && !isCallerOwner) {
    return fail('FORBIDDEN', undefined, 'Chỉ Chủ chuỗi mới có quyền gán vai trò Chủ chuỗi');
  }

  // So sánh tập quyền: người thực hiện không được sửa tài khoản có quyền mà mình không có
  if (!isCallerOwner) {
    const { data: targetPerms } = await adminClient
      .from('user_effective_permissions')
      .select('permission_key')
      .eq('user_id', userId);
    const { data: callerPerms } = await adminClient
      .from('user_effective_permissions')
      .select('permission_key')
      .eq('user_id', callerUserId);

    const callerSet = new Set((callerPerms || []).map((p: any) => p.permission_key));
    const targetHasUnheld = (targetPerms || []).some((p: any) => !callerSet.has(p.permission_key));
    if (targetHasUnheld) {
      return fail('FORBIDDEN', undefined, 'Không thể chỉnh sửa nhân sự sở hữu tập quyền cao hơn bạn');
    }
  }

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
 * Lưu ma trận quyền hạn cho một vai trò hệ thống (chỉ Chủ chuỗi được chỉnh sửa)
 */
export async function updateRolePermissionsAction(
  roleId: string,
  permissionKeys: string[]
): Promise<ActionResult<{ count: number }>> {
  const hasPerm = await requirePermission('settings.roles');
  if (!hasPerm.ok) {
    return hasPerm;
  }
  const callerUserId = hasPerm.data.userId;

  const adminClient = supabaseAdmin();

  // Kiểm tra vai trò của người gọi
  const { data: callerRoles } = await (adminClient.from('user_roles') as any)
    .select('role:roles(key)')
    .eq('user_id', callerUserId);
  const isCallerOwner = callerRoles?.some((r: any) => r.role?.key === 'owner');

  if (!isCallerOwner) {
    return fail('FORBIDDEN', undefined, 'Chỉ Chủ chuỗi mới có thẩm quyền chỉnh sửa ma trận phân quyền hệ thống');
  }

  const { data: targetRole } = await (adminClient
    .from('roles') as any)
    .select('key, name')
    .eq('id', roleId)
    .single();

  if (!targetRole) {
    return fail('NOT_FOUND');
  }

  if (targetRole.key === 'owner') {
    return fail('FORBIDDEN', undefined, 'Vai trò Chủ chuỗi được bảo vệ, không thể sửa đổi ma trận quyền');
  }

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

export interface SaveBranchInput {
  id?: string | null;
  code: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  nightCutoff?: string;
  defaultCheckoutTime?: string;
  isActive?: boolean;
}

/**
 * Thêm mới hoặc cập nhật thông tin cơ sở khách sạn
 */
export async function saveBranchAction(
  rawInput: FormData | SaveBranchInput
): Promise<ActionResult<{ id: string }>> {
  const hasPerm = await requirePermission('settings.branches');
  if (!hasPerm.ok) return hasPerm;

  let id: string | null = null;
  let code = '';
  let name = '';
  let phone: string | null = null;
  let address: string | null = null;
  let nightCutoff = '06:00:00';
  let defaultCheckoutTime = '12:00:00';
  let isActive = true;

  if (rawInput instanceof FormData) {
    id = (rawInput.get('id') as string) || null;
    code = (rawInput.get('code') as string)?.trim().toUpperCase() || '';
    name = (rawInput.get('name') as string)?.trim() || '';
    phone = (rawInput.get('phone') as string)?.trim() || null;
    address = (rawInput.get('address') as string)?.trim() || null;
    nightCutoff = (rawInput.get('nightCutoff') as string) || '06:00:00';
    defaultCheckoutTime = (rawInput.get('defaultCheckoutTime') as string) || '12:00:00';
    isActive = rawInput.get('isActive') !== 'false';
  } else {
    id = rawInput.id || null;
    code = rawInput.code?.trim().toUpperCase() || '';
    name = rawInput.name?.trim() || '';
    phone = rawInput.phone?.trim() || null;
    address = rawInput.address?.trim() || null;
    nightCutoff = rawInput.nightCutoff || '06:00:00';
    defaultCheckoutTime = rawInput.defaultCheckoutTime || '12:00:00';
    isActive = rawInput.isActive !== undefined ? rawInput.isActive : true;
  }

  if (!code || !name) {
    return fail('VALIDATION', { name: ['Mã và tên cơ sở không được để trống'] });
  }

  const adminClient = supabaseAdmin();
  if (id) {
    const { error } = await (adminClient.from('branches') as any)
      .update({
        code,
        name,
        phone,
        address,
        night_cutoff: nightCutoff,
        default_checkout_time: defaultCheckoutTime,
        is_active: isActive,
      })
      .eq('id', id);
    if (error) return fail(error.code);
  } else {
    const { data, error } = await (adminClient.from('branches') as any)
      .insert({
        code,
        name,
        phone,
        address,
        night_cutoff: nightCutoff,
        default_checkout_time: defaultCheckoutTime,
        is_active: isActive,
      })
      .select('id')
      .single();
    if (error || !data) return fail(error?.code || 'INTERNAL_ERROR');
    revalidatePath('/settings/branches');
    return ok({ id: (data as any).id });
  }

  revalidatePath('/settings/branches');
  revalidatePath('/', 'layout');
  return ok({ id: id || '' });
}
