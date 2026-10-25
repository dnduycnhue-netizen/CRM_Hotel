"use client";

import { Cake, DollarSign, Gift, History, Plus, Tag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  RewardsOverviewStats,
  UpcomingBirthdayGuest,
  Voucher,
  VoucherRedemption,
} from "../types";
import { BirthdayListView } from "./birthday-list-view";
import { CreateVoucherDialog } from "./create-voucher-dialog";
import { RedeemVoucherDialog } from "./redeem-voucher-dialog";
import { RedemptionsHistoryTable } from "./redemptions-history-table";
import { VoucherListTable } from "./voucher-list-table";

interface Props {
  stats: RewardsOverviewStats;
  birthdays: UpcomingBirthdayGuest[];
  vouchers: Voucher[];
  redemptions: VoucherRedemption[];
  branches: Array<{ id: string; name: string }>;
  guests: Array<{ id: string; full_name: string; phone: string | null }>;
}

export function RewardsHub({
  stats,
  birthdays,
  vouchers,
  redemptions,
  branches,
  guests,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("birthdays");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [redeemDialogOpen, setRedeemDialogOpen] = useState(false);

  function refreshData() {
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* 4 Thẻ KPI Tổng quan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Sinh nhật 7 ngày tới */}
        <div className="bg-card border border-border/80 rounded-2xl p-4 flex items-center justify-between shadow-2xs hover:shadow-xs transition">
          <div>
            <p className="text-xs font-semibold text-muted-foreground">
              Sinh nhật 7 ngày tới
            </p>
            <p className="text-2xl font-black text-pink-600 dark:text-pink-400 mt-1">
              {stats.birthdaysNext7Days}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Trong 30 ngày:{" "}
              <span className="font-semibold text-foreground">
                {stats.birthdaysNext30Days}
              </span>{" "}
              khách
            </p>
          </div>
          <span className="p-3 rounded-2xl bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20">
            <Cake className="w-6 h-6" />
          </span>
        </div>

        {/* KPI 2: Lời chúc đã gửi năm nay */}
        <div className="bg-card border border-border/80 rounded-2xl p-4 flex items-center justify-between shadow-2xs hover:shadow-xs transition">
          <div>
            <p className="text-xs font-semibold text-muted-foreground">
              Đã chúc mừng năm nay
            </p>
            <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
              {stats.greetingsSentThisMonth}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Ghi nhận quà & voucher
            </p>
          </div>
          <span className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <Gift className="w-6 h-6" />
          </span>
        </div>

        {/* KPI 3: Voucher đang hiệu lực */}
        <div className="bg-card border border-border/80 rounded-2xl p-4 flex items-center justify-between shadow-2xs hover:shadow-xs transition">
          <div>
            <p className="text-xs font-semibold text-muted-foreground">
              Voucher đang hiệu lực
            </p>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
              {stats.activeVouchersCount}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Đã đổi:{" "}
              <span className="font-semibold text-foreground">
                {stats.totalVouchersRedeemed}
              </span>{" "}
              lượt
            </p>
          </div>
          <span className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Tag className="w-6 h-6" />
          </span>
        </div>

        {/* KPI 4: Tổng chiết khấu đã trao */}
        <div className="bg-card border border-border/80 rounded-2xl p-4 flex items-center justify-between shadow-2xs hover:shadow-xs transition">
          <div>
            <p className="text-xs font-semibold text-muted-foreground">
              Tổng chiết khấu đã trao
            </p>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {new Intl.NumberFormat("vi-VN", {
                style: "currency",
                currency: "VND",
              }).format(stats.totalDiscountGiven)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Tiết kiệm cho khách VIP
            </p>
          </div>
          <span className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <DollarSign className="w-6 h-6" />
          </span>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
          <TabsList className="bg-muted/70 border border-border/60 p-1 rounded-xl">
            <TabsTrigger
              value="birthdays"
              className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-2xs text-xs font-semibold gap-1.5 rounded-lg px-3 py-1.5 transition"
            >
              <Cake className="w-3.5 h-3.5 text-pink-500" />
              Sinh nhật khách hàng
            </TabsTrigger>
            <TabsTrigger
              value="vouchers"
              className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-2xs text-xs font-semibold gap-1.5 rounded-lg px-3 py-1.5 transition"
            >
              <Tag className="w-3.5 h-3.5 text-amber-500" />
              Mã ưu đãi / Voucher
            </TabsTrigger>
            <TabsTrigger
              value="redemptions"
              className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-2xs text-xs font-semibold gap-1.5 rounded-lg px-3 py-1.5 transition"
            >
              <History className="w-3.5 h-3.5 text-emerald-500" />
              Lịch sử đổi voucher
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRedeemDialogOpen(true)}
              className="h-9 border-border text-foreground hover:bg-muted gap-1.5 text-xs font-semibold rounded-xl"
            >
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              Áp dụng Voucher
            </Button>
            <Button
              size="sm"
              onClick={() => setCreateDialogOpen(true)}
              className="h-9 bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 text-xs font-semibold rounded-xl shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Phát hành Voucher
            </Button>
          </div>
        </div>

        {/* Tab 1: Sinh nhật khách hàng */}
        <TabsContent value="birthdays" className="mt-0 space-y-4">
          <BirthdayListView
            initialBirthdays={birthdays}
            branches={branches}
            onRefresh={refreshData}
          />
        </TabsContent>

        {/* Tab 2: Danh sách voucher */}
        <TabsContent value="vouchers" className="mt-0 space-y-4">
          <VoucherListTable
            initialVouchers={vouchers}
            branches={branches}
            guests={guests}
            onRefresh={refreshData}
          />
        </TabsContent>

        {/* Tab 3: Lịch sử đổi voucher */}
        <TabsContent value="redemptions" className="mt-0 space-y-4">
          <RedemptionsHistoryTable redemptions={redemptions} />
        </TabsContent>
      </Tabs>

      {/* Dialog tạo voucher mới */}
      <CreateVoucherDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        branches={branches}
        guests={guests}
        onSuccess={refreshData}
      />

      {/* Dialog đổi voucher */}
      <RedeemVoucherDialog
        open={redeemDialogOpen}
        onOpenChange={setRedeemDialogOpen}
        branches={branches}
        guests={guests}
        onSuccess={refreshData}
      />
    </div>
  );
}
