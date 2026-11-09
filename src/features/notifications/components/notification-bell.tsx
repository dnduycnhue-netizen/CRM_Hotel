"use client";

import {
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Loader2,
  RefreshCw,
  Wrench,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui";
import { getNotificationsAction } from "../actions";
import type {
  AppNotification,
  NotificationCategory,
  NotificationSummary,
} from "../domain/types";

interface NotificationBellProps {
  currentBranchId?: string | null;
  initialSummary?: NotificationSummary | null;
}

export function NotificationBell({
  currentBranchId,
  initialSummary,
}: NotificationBellProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [summary, setSummary] = useState<NotificationSummary>(
    initialSummary || {
      total: 0,
      urgentCount: 0,
      warningCount: 0,
      infoCount: 0,
      items: [],
    },
  );
  const [activeTab, setActiveTab] = useState<"all" | NotificationCategory>(
    "all",
  );
  const [isOpen, setIsOpen] = useState(false);

  // Tải dữ liệu thông báo
  const fetchNotifications = () => {
    startTransition(async () => {
      const res = await getNotificationsAction(currentBranchId);
      if (res.ok) {
        setSummary(res.data);
      }
    });
  };

  // Tự động tải lần đầu và làm mới khi đổi chi nhánh
  useEffect(() => {
    fetchNotifications();
  }, [currentBranchId]);

  // Tự động làm mới định kỳ mỗi 60 giây khi tab đang mở
  useEffect(() => {
    const interval = setInterval(() => {
      fetchNotifications();
    }, 60000);
    return () => clearInterval(interval);
  }, [currentBranchId]);

  const filteredItems = useMemo(() => {
    if (activeTab === "all") return summary.items;
    return summary.items.filter((item) => item.category === activeTab);
  }, [summary.items, activeTab]);

  const getCategoryIcon = (category: NotificationCategory, severity: string) => {
    switch (category) {
      case "overdue_stay":
        return <Clock className="h-4 w-4 text-rose-600 dark:text-rose-400" />;
      case "expiring_doc":
        return (
          <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        );
      case "urgent_wo":
        return <Wrench className="h-4 w-4 text-rose-600 dark:text-rose-400" />;
      case "approval_pending":
        return (
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        );
      case "guest_attention":
      default:
        return (
          <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        );
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "urgent":
        return (
          <Badge
            variant="destructive"
            className="text-[9px] px-1.5 py-0 font-bold uppercase"
          >
            Khẩn cấp
          </Badge>
        );
      case "warning":
        return (
          <Badge
            variant="outline"
            className="text-[9px] px-1.5 py-0 font-semibold border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10"
          >
            Sắp hết hạn
          </Badge>
        );
      case "info":
      default:
        return (
          <Badge
            variant="outline"
            className="text-[9px] px-1.5 py-0 font-semibold text-blue-700 dark:text-blue-300 bg-blue-500/10 border-blue-500/30"
          >
            Lưu ý
          </Badge>
        );
    }
  };

  const handleItemClick = (item: AppNotification) => {
    setIsOpen(false);
    router.push(item.href);
  };

  // Phân loại số lượng cho từng tab
  const overdueCount = summary.items.filter(
    (i) => i.category === "overdue_stay",
  ).length;
  const docCount = summary.items.filter(
    (i) => i.category === "expiring_doc",
  ).length;
  const noteCount = summary.items.filter(
    (i) => i.category === "guest_attention",
  ).length;
  const woCount = summary.items.filter(
    (i) => i.category === "urgent_wo",
  ).length;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger
        className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 min-h-[38px] min-w-[38px] flex items-center justify-center transition-all focus:outline-none"
        aria-label="Xem cảnh báo và thông báo"
      >
        <Bell className="h-4.5 w-4.5" />

        {/* Badge số lượng thông báo */}
        {summary.total > 0 && (
          <span
            className={`absolute -top-0.5 -right-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white shadow-xs ring-2 ring-background ${
              summary.urgentCount > 0
                ? "bg-rose-600 animate-pulse"
                : "bg-amber-500"
            }`}
          >
            {summary.total > 99 ? "99+" : summary.total}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[330px] sm:w-[420px] p-0 shadow-xl border-border/70 rounded-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-3 bg-muted/40 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Bell className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                <span>Trung tâm Cảnh báo</span>
                {summary.total > 0 && (
                  <Badge
                    variant={summary.urgentCount > 0 ? "destructive" : "default"}
                    className="text-[10px] px-1.5 py-0 h-4.5 font-bold"
                  >
                    {summary.total}
                  </Badge>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Theo dõi quá hạn, ghi chú khách, giấy phép & sự cố
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              fetchNotifications();
            }}
            disabled={isPending}
            className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground"
            title="Làm mới cảnh báo"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`}
            />
          </Button>
        </div>

        {/* Quick Filter Tabs */}
        <div className="flex items-center gap-1 p-1.5 bg-muted/20 border-b overflow-x-auto text-[11px] scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-2 py-1 rounded-md font-medium whitespace-nowrap transition-all ${
              activeTab === "all"
                ? "bg-background text-foreground shadow-2xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Tất cả ({summary.total})
          </button>

          {overdueCount > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab("overdue_stay")}
              className={`px-2 py-1 rounded-md font-medium whitespace-nowrap transition-all flex items-center gap-1 ${
                activeTab === "overdue_stay"
                  ? "bg-background text-rose-600 shadow-2xs font-bold"
                  : "text-muted-foreground hover:text-rose-600"
              }`}
            >
              <Clock className="h-3 w-3" />
              Trả phòng ({overdueCount})
            </button>
          )}

          {docCount > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab("expiring_doc")}
              className={`px-2 py-1 rounded-md font-medium whitespace-nowrap transition-all flex items-center gap-1 ${
                activeTab === "expiring_doc"
                  ? "bg-background text-amber-600 shadow-2xs font-bold"
                  : "text-muted-foreground hover:text-amber-600"
              }`}
            >
              <FileText className="h-3 w-3" />
              Pháp lý ({docCount})
            </button>
          )}

          {noteCount > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab("guest_attention")}
              className={`px-2 py-1 rounded-md font-medium whitespace-nowrap transition-all flex items-center gap-1 ${
                activeTab === "guest_attention"
                  ? "bg-background text-blue-600 shadow-2xs font-bold"
                  : "text-muted-foreground hover:text-blue-600"
              }`}
            >
              <AlertCircle className="h-3 w-3" />
              Lưu ý ({noteCount})
            </button>
          )}

          {woCount > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab("urgent_wo")}
              className={`px-2 py-1 rounded-md font-medium whitespace-nowrap transition-all flex items-center gap-1 ${
                activeTab === "urgent_wo"
                  ? "bg-background text-rose-600 shadow-2xs font-bold"
                  : "text-muted-foreground hover:text-rose-600"
              }`}
            >
              <Wrench className="h-3 w-3" />
              Sự cố ({woCount})
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="max-h-[360px] overflow-y-auto divide-y divide-border/40">
          {isPending && summary.items.length === 0 ? (
            <div className="py-8 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-xs">Đang kiểm tra cảnh báo...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-8 px-4 flex flex-col items-center justify-center text-center">
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-2">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-foreground">
                Mọi thứ đều ổn định!
              </span>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Hiện không có lượt ở quá hạn, giấy phép hết hạn hay sự cố khẩn
                cấp cần xử lý.
              </p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`p-3 text-xs flex items-start gap-2.5 hover:bg-muted/50 cursor-pointer transition-colors group ${
                  item.severity === "urgent" ? "bg-rose-500/[0.03]" : ""
                }`}
              >
                <div className="mt-0.5 shrink-0 p-1.5 rounded-lg bg-muted border border-border/50">
                  {getCategoryIcon(item.category, item.severity)}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="font-semibold text-foreground text-xs leading-snug group-hover:text-primary transition-colors">
                      {item.title}
                    </span>
                    {getSeverityBadge(item.severity)}
                  </div>

                  <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                    {item.description}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground/80 pt-0.5">
                    {item.branchName && (
                      <span className="font-medium text-foreground/70 truncate max-w-[150px]">
                        📍 {item.branchName}
                      </span>
                    )}
                    <span className="ml-auto text-primary font-medium flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                      Xử lý ngay
                      <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {summary.total > 0 && (
          <div className="p-2 bg-muted/30 border-t flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">
              {summary.urgentCount > 0
                ? `⚠️ Có ${summary.urgentCount} mục khẩn cấp cần xử lý`
                : "Nhấn vào từng mục để đi đến màn hình xử lý"}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-6 text-[11px] px-2"
            >
              Đóng
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

