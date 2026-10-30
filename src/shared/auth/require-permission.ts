// src/shared/auth/require-permission.ts
import "server-only";
import { type ActionResult, fail, ok } from "@/shared/errors";
import type { Permission } from "./permission-keys";
import { getSession } from "./session";

export async function requirePermission(
  perm: Permission,
  branchId?: string | null,
): Promise<ActionResult<{ userId: string }>> {
  const s = await getSession();
  if (!s) return fail("UNAUTHENTICATED");
  if (!s.can(perm, branchId)) return fail("FORBIDDEN");
  return ok({ userId: s.userId });
}

export async function requireAnyPermission(
  perms: Permission[],
  branchId?: string | null,
): Promise<ActionResult<{ userId: string }>> {
  const s = await getSession();
  if (!s) return fail("UNAUTHENTICATED");
  const hasAny = perms.some((p) => s.can(p, branchId));
  if (!hasAny) return fail("FORBIDDEN");
  return ok({ userId: s.userId });
}
