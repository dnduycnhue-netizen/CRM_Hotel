// src/shared/auth/require-permission.ts
import 'server-only';
import { getSession } from './session';
import { fail, ok, type ActionResult } from '@/shared/errors';
import type { Permission } from './permission-keys';

export async function requirePermission(
  perm: Permission,
  branchId?: string | null
): Promise<ActionResult<{ userId: string }>> {
  const s = await getSession();
  if (!s) return fail('UNAUTHENTICATED');
  if (!s.can(perm, branchId)) return fail('FORBIDDEN');
  return ok({ userId: s.userId });
}
