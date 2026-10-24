export interface Branch {
  id: string;
  code: string;
  name: string;
  address: string | null;
  phone: string | null;
  googleReviewUrl: string | null;
  nightCutoff: string;
  defaultCheckoutTime: string;
  idleLogoutMinutes: number;
  isActive: boolean;
  roomsCount?: number;
}

export interface RoomItem {
  id: string;
  branchId: string;
  branchCode: string;
  branchName: string;
  number: string;
  floor: number | null;
  roomType: string | null;
  isActive: boolean;
  isOccupied?: boolean;
  isBlocked?: boolean;
  isCleaning?: boolean;
}

export interface SystemModule {
  key: string;
  name: string;
  groupName: string;
  dependsOn: string[];
  defaultState: "off" | "readonly" | "on";
  isCore: boolean;
  isAvailable: boolean;
  isHidden?: boolean;
  sort: number;
}

export interface BranchModuleMatrix {
  modules: SystemModule[];
  branches: Branch[];
  states: Record<string, Record<string, "off" | "readonly" | "on">>; // moduleKey -> branchId -> state
}

export interface SystemRole {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissionKeys: string[];
}

export interface SystemPermission {
  key: string;
  moduleKey: string;
  groupName: string;
  kind: "view" | "write";
  label: string;
  description: string | null;
  sort: number;
}
