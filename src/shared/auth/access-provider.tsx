// src/shared/auth/access-provider.tsx
"use client";

import { createContext, useContext } from "react";
import type { Permission } from "./permission-keys";
import type { Access } from "./types";

const Ctx = createContext<{ access: Access; branchId: string | null } | null>(
  null,
);

export const AccessProvider = Ctx.Provider;

export function useCan() {
  const ctx = useContext(Ctx);
  return (perm: Permission, branchId = ctx?.branchId) =>
    !!ctx && !!branchId && !!ctx.access.permissions[branchId]?.includes(perm);
}

export function Can({
  perm,
  children,
}: {
  perm: Permission;
  children: React.ReactNode;
}) {
  const can = useCan();
  return can(perm) ? children : null;
}
