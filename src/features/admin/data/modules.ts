import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { BranchModuleMatrix, SystemModule } from "../domain/types";
import { getActiveBranches } from "./branches";

export async function getSystemModules(): Promise<SystemModule[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("modules")
    .select(
      "key, name, group_name, depends_on, default_state, is_core, is_available, is_hidden, sort",
    )
    .eq("is_hidden", false)
    .order("sort");

  if (error || !data) {
    throw new Error(
      `Không thể tải danh sách module hệ thống: ${error?.message || "Lỗi không xác định"}`,
    );
  }

  return data.map((m: any) => ({
    key: m.key,
    name: m.name,
    groupName: m.group_name,
    dependsOn: m.depends_on || [],
    defaultState: m.default_state,
    isCore: m.is_core,
    isAvailable: m.is_available,
    isHidden: m.is_hidden ?? false,
    sort: m.sort,
  }));
}

export async function getBranchModuleMatrix(): Promise<BranchModuleMatrix> {
  const supabase = await createClient();

  const [modules, branches, bmResult] = await Promise.all([
    getSystemModules(),
    getActiveBranches(),
    (supabase.from("branch_modules") as any).select(
      "branch_id, module_key, state",
    ),
  ]);

  if (bmResult.error) {
    throw new Error(
      `Không thể tải cấu hình module cơ sở: ${bmResult.error.message}`,
    );
  }

  const bmMap = new Map<string, "off" | "readonly" | "on">();
  for (const row of (bmResult.data || []) as any[]) {
    bmMap.set(
      `${row.branch_id}:${row.module_key}`,
      row.state as "off" | "readonly" | "on",
    );
  }

  const states: Record<string, Record<string, "off" | "readonly" | "on">> = {};

  for (const mod of modules) {
    states[mod.key] = {};
    for (const branch of branches) {
      if (mod.isCore) {
        states[mod.key][branch.id] = "on";
      } else {
        const stored = bmMap.get(`${branch.id}:${mod.key}`);
        states[mod.key][branch.id] = stored ?? mod.defaultState;
      }
    }
  }

  return {
    modules,
    branches,
    states,
  };
}
