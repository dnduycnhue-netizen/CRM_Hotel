'use client';

import { BranchSelector } from './branch-selector';
import { logoutAction } from '@/features/auth/actions';
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
import { Search, LogOut, User } from 'lucide-react';

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
  const userInitials = (userEmail ? userEmail.slice(0, 2) : 'NV').toUpperCase();

  return (
    <header className="h-16 border-b border-border/40 bg-background/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Branch Selector */}
      <div className="flex items-center gap-4">
        <BranchSelector
          branches={branches}
          currentBranchId={currentBranchId}
        />
      </div>

      {/* Center: Global Search Bar */}
      <div className="flex-1 max-w-md mx-6">
        <button
          onClick={() => {
            const event = new KeyboardEvent('keydown', {
              key: 'k',
              ctrlKey: true,
            });
            window.dispatchEvent(event);
          }}
          className="w-full h-9 px-3 rounded-lg border border-border/50 bg-muted/40 hover:bg-muted/70 text-muted-foreground flex items-center justify-between text-xs transition-colors"
        >
          <span className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Tìm theo tên, SĐT, 6 số CCCD, Passport...</span>
          </span>
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border/60 bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">⌘</span>K
          </kbd>
        </button>
      </div>

      {/* Right: User Menu */}
      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger className="focus:outline-none">
            <Avatar className="h-8 w-8 border border-border/60 transition-transform hover:scale-105">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                {userInitials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-xs font-semibold leading-none text-foreground">
                  Tài khoản đăng nhập
                </p>
                <p className="text-[11px] leading-none text-muted-foreground truncate">
                  {userEmail || 'nhanvien@khachsan.vn'}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-xs cursor-pointer">
              <User className="mr-2 h-3.5 w-3.5" />
              <span>Hồ sơ cá nhân</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-xs text-destructive focus:text-destructive cursor-pointer"
              onClick={() => logoutAction()}
            >
              <LogOut className="mr-2 h-3.5 w-3.5" />
              <span>Đăng xuất</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
