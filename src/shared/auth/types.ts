import type { Permission } from "./permission-keys";

export type ModuleState = "off" | "readonly" | "on";

export type Access = {
  permissions: Record<string, Permission[]>;
  modules: Record<string, Record<string, ModuleState>>;
};
