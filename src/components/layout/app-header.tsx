"use client";

import {
  AlertTriangle,
  Compass,
  KeyRound,
  LogOut,
  Search,
  Shield,
  User,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChangePasswordDialog } from "@/features/auth";
import { CommandPalette } from "@/features/search";
import {
  Avatar,
  AvatarFallback,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui";
import { BranchSelector } from "./branch-selector";

interface AppHeaderProps {
  branches: Array<{ id: string; code: string; name: string }>;
  currentBranchId: string | null;
  userEmail?: string;
  canManageUsers?: boolean;
  canViewRoles?: boolean;
  canCreateStay?: boolean;
  canReportFacility?: boolean;
}

export function AppHeader({
  branches,
  currentBranchId,
  userEmail,
  canManageUsers = false,
  canViewRoles = false,
  canCreateStay = false,
  canReportFacility = false,
}: AppHeaderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  // Compute friendly role description and clean initials
  const isOwner =
    userEmail?.includes("owner") ||
    userEmail?.includes("duy") ||
    userEmail?.includes("admin");
  const isManager = userEmail?.includes("quanly");
  const isReception = userEmail?.includes("letan");
  const isSales = userEmail?.includes("sales");
  const isTech = userEmail?.includes("kythuat");

  const roleName = isOwner
    ? "Chủ chuỗi"
    : isManager
      ? "Quản lý cơ sở"
      : isReception
        ? "Lễ tân"
        : isSales
          ? "Kinh doanh (Sales)"
          : isTech
            ? "Kỹ thuật CSVC"
            : "Nhân viên";

  const roleBadge = isOwner
    ? "Toàn quyền"
    : isManager
      ? "Cơ sở"
      : isReception
        ? "Vận hành"
        : isSales
          ? "Bán hàng"
          : isTech
            ? "Bảo trì"
            : "Nội bộ";

  const userInitials = isOwner
    ? "CC"
    : isManager
      ? "QL"
      : isReception
        ? "LT"
        : isSales
          ? "KD"
          : isTech
            ? "KT"
            : userEmail
              ? userEmail.slice(0, 2).toUpperCase()
              : "NV";

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <CommandPalette
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
      <header className="h-16 border-b border-border/50 bg-background/85 backdrop-blur-xl px-5 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        {/* Left: Branch Selector */}
        <div className="flex items-center gap-3">
          <BranchSelector
            branches={branches}
            currentBranchId={currentBranchId}
          />
        </div>

        {/* Center: Global Search Bar */}
        <div className="flex-1 max-w-lg mx-4 hidden md:block">
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="w-full h-9.5 px-3.5 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/70 text-muted-foreground flex items-center justify-between text-xs transition-all shadow-xs hover:border-amber-500/40 hover:shadow-sm group"
          >
            <span className="flex items-center gap-2.5 truncate">
              <Search className="h-4 w-4 text-muted-foreground group-hover:text-amber-500 transition-colors" />
              <span className="text-muted-foreground/80 group-hover:text-foreground transition-colors truncate">
                Tìm nhanh khách hàng (Tên, SĐT, CCCD, Passport)...
              </span>
            </span>
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded-md border border-border/70 bg-card px-1.5 font-mono text-[10px] font-semibold text-muted-foreground shadow-xs">
              <span className="text-xs">⌘</span>K
            </kbd>
          </button>
        </div>

        {/* Right: Quick Actions & User Menu */}
        <div className="flex items-center gap-2.5">
          {/* Quick Check-in Button */}
          {canCreateStay && (
            <Link
              href="/check-in"
              className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>Check-in</span>
            </Link>
          )}

          {/* Quick Report Button */}
          {canReportFacility && (
            <Link
              href="/facilities/report"
              className="hidden lg:inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border/70 bg-card hover:bg-accent text-foreground text-xs font-semibold shadow-xs transition-all hover:border-amber-500/40"
            >
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              <span>Báo sự cố</span>
            </Link>
          )}

          {/* Quick Accounts & Roles Button (Only if has settings.users) */}
          {canManageUsers && (
            <Link
              href="/settings/users"
              className="hidden xl:inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border/70 bg-card hover:bg-accent text-foreground text-xs font-semibold shadow-xs transition-all hover:border-amber-500/40"
            >
              <User className="h-3.5 w-3.5 text-amber-500" />
              <span>Phân quyền nhân sự</span>
            </Link>
          )}

          {/* Quick Guide / SOP Button */}
          <Link
            href="/guide"
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
            title="Xem Hướng dẫn sử dụng & Quy trình nghiệp vụ (SOP)"
          >
            <Compass className="h-3.5 w-3.5 text-amber-400" />
            <span className="hidden sm:inline">Quy trình (SOP)</span>
          </Link>

          {/* Mobile search trigger */}
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="md:hidden h-9 w-9 flex items-center justify-center rounded-lg border border-border/60 bg-card text-muted-foreground"
          >
            <Search className="h-4 w-4" />
          </button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger className="focus:outline-none ml-1">
              <div className="relative group flex items-center gap-2 p-1 rounded-full hover:bg-muted/50 transition-colors cursor-pointer">
                <Avatar className="h-9 w-9 border-2 border-amber-500/30 transition-transform group-hover:scale-105 shadow-sm">
                  <AvatarFallback className="bg-gradient-to-br from-amber-500 to-amber-700 text-white text-xs font-bold">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-60 p-1.5 shadow-lg border-border/60"
            >
              <div className="font-normal px-2.5 py-2">
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="font-bold text-xs text-foreground truncate">
                      {roleName}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20 shrink-0">
                      {roleBadge}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {userEmail || "Chưa đăng nhập"}
                  </p>
                </div>
              </div>
              <DropdownMenuSeparator />

              {canManageUsers && (
                <DropdownMenuItem className="text-xs cursor-pointer rounded-md p-0">
                  <Link
                    href="/settings/users"
                    className="flex items-center w-full px-2 py-1.5"
                  >
                    <User className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                    <span>Quản lý tài khoản</span>
                  </Link>
                </DropdownMenuItem>
              )}

              {canViewRoles && (
                <DropdownMenuItem className="text-xs cursor-pointer rounded-md p-0">
                  <Link
                    href="/settings/roles"
                    className="flex items-center w-full px-2 py-1.5"
                  >
                    <Shield className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                    <span>Ma trận phân quyền</span>
                  </Link>
                </DropdownMenuItem>
              )}

              <DropdownMenuItem
                className="text-xs cursor-pointer rounded-md"
                onClick={() => setIsChangePasswordOpen(true)}
              >
                <KeyRound className="mr-2 h-3.5 w-3.5 text-amber-500" />
                <span>Đổi mật khẩu</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                variant="destructive"
                className="text-xs cursor-pointer font-semibold py-1.5"
                onClick={() => {
                  try {
                    document.cookie =
                      "branch_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
                    if (typeof window !== "undefined") {
                      localStorage.clear();
                      sessionStorage.clear();
                    }
                  } catch {}
                  window.location.href = "/logout";
                }}
              >
                <LogOut className="mr-2 h-3.5 w-3.5 text-destructive" />
                <span>Đăng xuất</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Modal Tự đổi mật khẩu người dùng */}
      <ChangePasswordDialog
        open={isChangePasswordOpen}
        onOpenChange={setIsChangePasswordOpen}
      />
    </>
  );
}
