'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCan } from '@/shared/auth';
import {
  Hotel,
  UserCheck,
  Users,
  Search,
  Wrench,
  AlertTriangle,
  ClipboardList,
  BarChart3,
  Settings,
  ShieldCheck,
  CheckSquare,
  Building,
  KeyRound,
  FileSpreadsheet,
  Boxes,
} from 'lucide-react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  perm?: import('@/shared/auth').Permission;
  badge?: number;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    group: 'Lễ tân & Vận hành',
    items: [
      { title: 'Check-in', href: '/check-in', icon: UserCheck, perm: 'stay.create' },
      { title: 'Khách đang ở', href: '/stays', icon: Users, perm: 'stay.view' },
      { title: 'Báo sự cố nhanh', href: '/facilities/report', icon: AlertTriangle, perm: 'wo.create' },
    ],
  },
  {
    group: 'Khách hàng & Sales',
    items: [
      { title: 'Tìm kiếm khách', href: '/search', icon: Search, perm: 'guest.search' },
      { title: 'Danh sách khách', href: '/guests', icon: Users, perm: 'guest.view_summary' },
      { title: 'Chờ duyệt', href: '/approvals', icon: CheckSquare, perm: 'merge.approve' },
    ],
  },
  {
    group: 'Cơ sở vật chất',
    items: [
      { title: 'Danh mục tài sản', href: '/facilities/assets', icon: Boxes, perm: 'facility.view' },
      { title: 'Phiếu sự cố / sửa chữa', href: '/facilities/work-orders', icon: Wrench, perm: 'wo.view' },
      { title: 'Bảo trì & Kiểm tra', href: '/facilities/maintenance', icon: ClipboardList, perm: 'pm.view' },
      { title: 'Cảnh báo hết hạn', href: '/facilities/alerts', icon: AlertTriangle, perm: 'facility.view' },
    ],
  },
  {
    group: 'Báo cáo & Phân tích',
    items: [
      { title: 'Công suất & Khách', href: '/reports', icon: BarChart3, perm: 'report.view_branch' },
      { title: 'Doanh thu & Cùng kỳ', href: '/reports/monthly', icon: FileSpreadsheet, perm: 'revenue.view' },
    ],
  },
  {
    group: 'Cài đặt hệ thống',
    items: [
      { title: 'Cơ sở & Phòng', href: '/settings/branches', icon: Building, perm: 'settings.branches' },
      { title: 'Người dùng & Tài khoản', href: '/settings/users', icon: KeyRound, perm: 'settings.users' },
      { title: 'Ma trận phân quyền', href: '/settings/roles', icon: ShieldCheck, perm: 'settings.roles' },
      { title: 'Bật/tắt Module', href: '/settings/modules', icon: Settings, perm: 'settings.modules' },
      { title: 'Nguồn khách & Kênh', href: '/settings/sources', icon: Users, perm: 'settings.sources' },
      { title: 'Nhật ký thao tác', href: '/audit', icon: ClipboardList, perm: 'audit.view_branch' },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const can = useCan();

  return (
    <aside className="w-64 shrink-0 border-r border-border/40 bg-card/60 backdrop-blur-md flex flex-col h-screen sticky top-0">
      {/* Brand Logo Header */}
      <div className="h-16 flex items-center px-6 border-b border-border/40 gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
          <Hotel className="h-5 w-5" />
        </div>
        <div>
          <span className="font-bold text-sm tracking-tight block">CRM Chuỗi KS</span>
          <span className="text-[10px] text-muted-foreground tracking-wide font-medium block uppercase">
            8 Cơ sở · 240 Phòng
          </span>
        </div>
      </div>

      {/* Nav Menu */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {NAV_GROUPS.map((group) => {
          // Filter items by permission if defined, or show if user has access
          const visibleItems = group.items.filter((item) => !item.perm || can(item.perm));
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.group} className="space-y-1">
              <p className="px-2 text-[11px] font-semibold tracking-wider text-muted-foreground/70 uppercase">
                {group.group}
              </p>
              <div className="space-y-0.5 pt-1">
                {visibleItems.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href + '/'));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm font-semibold'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.title}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
