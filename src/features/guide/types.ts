export type RoleKey =
  | "owner"
  | "branch_manager"
  | "receptionist"
  | "sales"
  | "technician";

export interface RoleGuide {
  key: RoleKey;
  title: string;
  badge: string;
  badgeColor: string;
  iconName: string;
  description: string;
  keyResponsibilities: string[];
  allowedRoutes: { path: string; label: string; desc: string }[];
  prohibitedActions: string[];
  dailyChecklist: string[];
  securityNote: string;
}

export interface WorkflowNode {
  id: string;
  stepNumber: number;
  title: string;
  role: string;
  action: string;
  screen: string;
  details: string[];
  caution?: string;
}

export interface WorkflowDiagram {
  id: string;
  code: string;
  title: string;
  description: string;
  primaryRole: string;
  nodes: WorkflowNode[];
}

export interface ModuleGuide {
  id: string;
  title: string;
  route: string;
  iconName: string;
  summary: string;
  rolesInvolved: string[];
  features: {
    name: string;
    description: string;
    howTo: string[];
    tips?: string;
  }[];
  faq: { q: string; a: string }[];
}

/** Quy tắc nghiệp vụ cần ghi nhớ (tra cứu nhanh, gom theo chủ đề) */
export interface RuleGroup {
  id: string;
  title: string;
  iconName: string;
  rules: {
    rule: string;
    detail: string;
    /** Màn hình / nơi áp dụng (đường dẫn hoặc tên phân hệ) */
    where?: string;
  }[];
}
