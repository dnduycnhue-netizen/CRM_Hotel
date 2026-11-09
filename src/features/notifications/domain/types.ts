export type NotificationCategory =
  | "overdue_stay"
  | "guest_attention"
  | "expiring_doc"
  | "urgent_wo"
  | "approval_pending";

export type NotificationSeverity = "urgent" | "warning" | "info";

export interface AppNotification {
  id: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  title: string;
  description: string;
  branchId?: string | null;
  branchName?: string | null;
  href: string;
  createdAt: string;
  meta?: Record<string, string | number | boolean | null>;
}

export interface NotificationSummary {
  total: number;
  urgentCount: number;
  warningCount: number;
  infoCount: number;
  items: AppNotification[];
}

