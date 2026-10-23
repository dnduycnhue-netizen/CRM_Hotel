// src/shared/auth/session.ts
import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Permission } from "./permission-keys";
import type { Access } from "./types";

export * from "./types";

// cache(): mỗi request chỉ gọi DB đúng 1 lần dù nhiều component cùng hỏi
export const getSession = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return null;

  const [{ data: access }, cookieStore] = await Promise.all([
    supabase.rpc("my_access"),
    cookies(),
  ]);
  const a = (access ?? { permissions: {}, modules: {} }) as Access;
  const branchIds = Object.keys(a.permissions || {});
  const wanted = cookieStore.get("branch_id")?.value;
  const currentBranchId =
    wanted && branchIds.includes(wanted) ? wanted : (branchIds[0] ?? null);

  const can = (perm: Permission, branchId?: string | null) =>
    branchId
      ? !!a.permissions[branchId]?.includes(perm)
      : branchIds.some((b) => a.permissions[b]?.includes(perm));

  return {
    userId: data.claims.sub as string,
    email: data.claims.email as string | undefined,
    access: a,
    branchIds,
    currentBranchId,
    can,
  };
});
