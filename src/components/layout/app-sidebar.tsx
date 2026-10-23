"use client";

import {
  AlertTriangle,
  BarChart3,
  Boxes,
  Building,
  CheckSquare,
  ChevronRight,
  ClipboardList,
  Compass,
  FileSpreadsheet,
  Hotel,
  KeyRound,
  Lock,
  Search,
  Settings,
  ShieldCheck,
  UserCheck,
  Users,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCan } from "@/shared/auth";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  perm?: import("@/shared/auth").Permission;
  badge?: string;
  badgeVariant?: "gold" | "emerald" | "amber";
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    group: "Lễ tân & Vận hành",
    items: [
      {
        title: "Check-in phòng",
        href: "/check-in",
        icon: UserCheck,
        perm: "stay.create",
        badge: "Ưu tiên",
        badgeVariant: "emerald",
      },
      {
        title: "Khách đang ở",
        href: "/stays",
        icon: Users,
        perm: "stay.view",
      },
      {
        title: "Báo sự cố nhanh",
        href: "/facilities/report",
        icon: AlertTriangle,
        perm: "wo.create",
      },
    ],
  },
  {
    group: "Khách hàng & Sales",
    items: [
      {
        title: "Tra cứu khách",
        href: "/search",
        icon: Search,
        perm: "guest.search",
      },
      {
        title: "Hồ sơ khách hàng",
        href: "/guests",
        icon: Users,
        perm: "guest.view_summary",
      },
      {
        title: "Duyệt gộp hồ sơ",
        href: "/approvals",
        icon: CheckSquare,
        perm: "merge.approve",
      },
    ],
  },
  {
    group: "Cơ sở vật chất & CSVC",
    items: [
      {
        title: "Phiếu sự cố / Sửa chữa",
        href: "/facilities/work-orders",
        icon: Wrench,
        perm: "wo.view",
      },
      {
        title: "Khóa phòng ngừng bán",
        href: "/facilities/room-blocks",
        icon: Lock,
        perm: "room.block",
      },
      {
        title: "Danh mục tài sản",
        href: "/facilities/assets",
        icon: Boxes,
        perm: "facility.view",
      },
      {
        title: "Bảo trì & Kiểm tra",
        href: "/facilities/maintenance",
        icon: ClipboardList,
        perm: "pm.view",
      },
      {
        title: "Cảnh báo hết hạn",
        href: "/facilities/alerts",
        icon: AlertTriangle,
        perm: "facility.view",
      },
    ],
  },
  {
    group: "Báo cáo & Doanh thu",
    items: [
      {
        title: "Công suất & Khách",
        href: "/reports",
        icon: BarChart3,
        perm: "report.view_branch",
      },
      {
        title: "Doanh thu & Cùng kỳ",
        href: "/reports/monthly",
        icon: FileSpreadsheet,
        perm: "revenue.view",
      },
    ],
  },
  {
    group: "Hệ thống & Cài đặt",
    items: [
      {
        title: "Cơ sở & Phòng",
        href: "/settings/branches",
        icon: Building,
        perm: "settings.branches",
      },
      {
        title: "Người dùng & Tài khoản",
        href: "/settings/users",
        icon: KeyRound,
        perm: "settings.users",
      },
      {
        title: "Ma trận phân quyền",
        href: "/settings/roles",
        icon: ShieldCheck,
        perm: "settings.roles",
      },
      {
        title: "Bật / Tắt Module",
        href: "/settings/modules",
        icon: Settings,
        perm: "settings.modules",
      },
      {
        title: "Nguồn khách & Kênh",
        href: "/settings/sources",
        icon: Users,
        perm: "settings.sources",
      },
      {
        title: "Nhật ký thao tác (Audit)",
        href: "/audit",
        icon: ClipboardList,
        perm: "audit.view_branch",
      },
    ],
  },
  {
    group: "Tài liệu & Đào tạo",
    items: [
      {
        title: "Hướng dẫn & Quy trình",
        href: "/guide",
        icon: Compass,
        badge: "SOP",
        badgeVariant: "gold",
      },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const can = useCan();

  return (
    <aside className="w-64 shrink-0 border-r border-border/60 bg-card/90 backdrop-blur-xl flex flex-col h-screen sticky top-0 z-20 shadow-sm transition-all select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-5 border-b border-border/50 gap-3 bg-gradient-to-r from-card to-card/50">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 text-white shadow-md shadow-amber-500/20">
          <Hotel className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm tracking-tight text-foreground truncate block">
              CRM Khách Sạn
            </span>
          </div>
          <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold tracking-wider block uppercase truncate">
            8 Cơ sở · 240 Phòng
          </span>
        </div>
      </div>

      {/* Nav Menu */}
      <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6">
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter(
            (item) => !item.perm || can(item.perm),
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.group} className="space-y-1">
              <p className="px-2.5 text-[10px] font-bold tracking-wider text-muted-foreground/80 uppercase">
                {group.group}
              </p>
              <div className="space-y-0.5 pt-1">
                {visibleItems.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/" && pathname.startsWith(`${item.href}/`));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group relative flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm font-semibold pl-3.5"
                          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground hover:translate-x-0.5"
                      }`}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-amber-500" />
                      )}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`h-4 w-4 shrink-0 transition-transform ${
                            isActive
                              ? "text-amber-400"
                              : "text-muted-foreground group-hover:text-foreground"
                          }`}
                        />
                        <span className="truncate">{item.title}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                            item.badgeVariant === "emerald"
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer System Status */}
      <div className="p-3 border-t border-border/50 bg-muted/20">
        <div className="p-2.5 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-medium text-foreground">
              Hệ thống Live
            </span>
          </div>
          <Link
            href="/settings/branches"
            className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-0.5 font-medium transition-colors"
          >
            <span>Quản lý</span>
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
