'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BranchSelector } from './branch-selector';
import { logoutAction } from '@/features/auth/actions';
import { CommandPalette } from '@/features/search';
import { Button } from '@/shared/ui';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui';
import { Avatar, AvatarFallback } from '@/shared/ui';
import {
  Search,
  LogOut,
  User,
  UserCheck,
  AlertTriangle,
  Sparkles,
  Shield,
  HelpCircle,
} from 'lucide-react';

interface AppHeaderProps {
  branches: Array<{ id: string; code: string; name: string }>;
  currentBranchId: string | null;
  userEmail?: string;
}

export function AppHeader({
  branches,
  currentBranchId,
  userEmail,
}: AppHeaderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const userInitials = (userEmail ? userEmail.slice(0, 2) : 'AD').toUpperCase();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <CommandPalette isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
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
          <Link
            href="/check-in"
            className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <UserCheck className="h-3.5 w-3.5" />
            <span>Check-in</span>
          </Link>

          {/* Quick Report Button */}
          <Link
            href="/facilities/report"
            className="hidden lg:inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border/70 bg-card hover:bg-accent text-foreground text-xs font-semibold shadow-xs transition-all hover:border-amber-500/40"
          >
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            <span>Báo sự cố</span>
          </Link>

          {/* Mobile search trigger */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="md:hidden h-9 w-9 flex items-center justify-center rounded-lg border border-border/60 bg-card text-muted-foreground"
          >
            <Search className="h-4 w-4" />
          </button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger className="focus:outline-none ml-1">
              <div className="relative group flex items-center gap-2 p-1 rounded-full hover:bg-muted/50 transition-colors">
                <Avatar className="h-9 w-9 border-2 border-amber-500/30 transition-transform group-hover:scale-105 shadow-sm">
                  <AvatarFallback className="bg-gradient-to-br from-amber-500 to-amber-700 text-white text-xs font-bold">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 p-1.5 shadow-lg border-border/60">
              <DropdownMenuLabel className="font-normal px-2.5 py-2">
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-foreground">
                      {userEmail?.includes('admin') || userEmail?.includes('owner') || userEmail?.includes('duy')
                        ? 'Chủ chuỗi / Admin'
                        : 'Nhân viên lễ tân'}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20">
                      Full Access
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {userEmail || 'admin@khachsan.vn'}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-xs cursor-pointer rounded-md p-0">
                <Link href="/settings/users" className="flex items-center w-full px-2 py-1.5">
                  <User className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                  <span>Quản lý tài khoản</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs cursor-pointer rounded-md p-0">
                <Link href="/settings/roles" className="flex items-center w-full px-2 py-1.5">
                  <Shield className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                  <span>Ma trận phân quyền</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-xs text-destructive focus:text-destructive cursor-pointer rounded-md focus:bg-destructive/10"
                onClick={() => logoutAction()}
              >
                <LogOut className="mr-2 h-3.5 w-3.5" />
                <span className="font-semibold">Đăng xuất</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </>
  );
}
