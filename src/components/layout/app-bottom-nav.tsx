"use client";

import {
  AlertTriangle,
  BarChart3,
  Menu,
  Search,
  UserCheck,
  Users,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCan } from "@/shared/auth";
import { useSidebar } from "./sidebar-context";

export function AppBottomNav() {
  const pathname = usePathname();
  const can = useCan();
  const { toggle, isOpen } = useSidebar();

  const canCheckIn = can("stay.create");
  const canViewStays = can("stay.view");
  const canSearch = can("guest.search");
  const canReportWO = can("wo.create");
  const canViewReports = can("report.view_branch") || can("report.view_chain");
  const canViewMaintenance =
    can("wo.view") || can("facility.view") || can("pm.view");

  // Determine top 4 items + Menu button
  const navItems = [];

  if (canCheckIn) {
    navItems.push({
      title: "Check-in",
      href: "/check-in",
      icon: UserCheck,
      active: pathname === "/check-in",
    });
  } else if (canReportWO) {
    navItems.push({
      title: "Báo sự cố",
      href: "/facilities/report",
      icon: AlertTriangle,
      active: pathname === "/facilities/report",
    });
  }

  if (canViewStays) {
    navItems.push({
      title: "Khách ở",
      href: "/stays",
      icon: Users,
      active: pathname.startsWith("/stays"),
    });
  } else if (canViewMaintenance) {
    navItems.push({
      title: "Bảo trì",
      href: "/facilities/maintenance",
      icon: Wrench,
      active: pathname.startsWith("/facilities/maintenance"),
    });
  }

  if (canSearch) {
    navItems.push({
      title: "Tìm kiếm",
      href: "/search",
      icon: Search,
      active: pathname === "/search",
    });
  }

  if (canViewReports) {
    navItems.push({
      title: "Báo cáo",
      href: "/reports",
      icon: BarChart3,
      active: pathname.startsWith("/reports"),
    });
  }

  return (
    <nav
      aria-label="Điều hướng di động"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border/70 shadow-lg px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1.5 transition-all"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 min-h-[44px] py-1 px-1 rounded-xl transition-all ${
                item.active
                  ? "text-amber-600 dark:text-amber-400 font-semibold"
                  : "text-muted-foreground hover:text-foreground active:scale-95"
              }`}
            >
              <div
                className={`relative flex items-center justify-center p-1 rounded-lg ${
                  item.active ? "bg-amber-500/15" : ""
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5 truncate max-w-[64px]">
                {item.title}
              </span>
            </Link>
          );
        })}

        {/* 5th Button: Toggle Full Menu Drawer */}
        <button
          type="button"
          onClick={toggle}
          aria-label={isOpen ? "Đóng menu" : "Mở menu chức năng"}
          aria-expanded={isOpen}
          className={`flex flex-col items-center justify-center flex-1 min-h-[44px] py-1 px-1 rounded-xl transition-all ${
            isOpen
              ? "text-amber-600 dark:text-amber-400 font-semibold"
              : "text-muted-foreground hover:text-foreground active:scale-95"
          }`}
        >
          <div
            className={`relative flex items-center justify-center p-1 rounded-lg ${
              isOpen ? "bg-amber-500/15" : ""
            }`}
          >
            <Menu className="h-5 w-5" />
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">Menu</span>
        </button>
      </div>
    </nav>
  );
}
