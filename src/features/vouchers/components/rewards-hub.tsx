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
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">
              Sinh nhật 7 ngày tới
            </p>
            <p className="text-2xl font-bold text-pink-400 mt-1">
              {stats.birthdaysNext7Days}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Trong 30 ngày: {stats.birthdaysNext30Days} khách
            </p>
          </div>
          <span className="p-3 rounded-xl bg-pink-500/10 text-pink-400">
            <Cake className="w-6 h-6" />
          </span>
        </div>

        {/* KPI 2: Lời chúc đã gửi năm nay */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">
              Đã chúc mừng năm nay
            </p>
            <p className="text-2xl font-bold text-indigo-400 mt-1">
              {stats.greetingsSentThisMonth}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Ghi nhận quà & voucher
            </p>
          </div>
          <span className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400">
            <Gift className="w-6 h-6" />
          </span>
        </div>

        {/* KPI 3: Voucher đang hiệu lực */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">
              Voucher đang hiệu lực
            </p>
            <p className="text-2xl font-bold text-cyan-400 mt-1">
              {stats.activeVouchersCount}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Đã đổi: {stats.totalVouchersRedeemed} lượt
            </p>
          </div>
          <span className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400">
            <Tag className="w-6 h-6" />
          </span>
        </div>

        {/* KPI 4: Tổng chiết khấu đã trao */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">
              Tổng chiết khấu đã trao
            </p>
            <p className="text-xl font-bold text-emerald-400 mt-1">
              {new Intl.NumberFormat("vi-VN", {
                style: "currency",
                currency: "VND",
              }).format(stats.totalDiscountGiven)}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Tiết kiệm cho khách VIP
            </p>
          </div>
          <span className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
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
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <TabsList className="bg-slate-900 border border-slate-800 p-1">
            <TabsTrigger
              value="birthdays"
              className="data-[state=active]:bg-pink-600 data-[state=active]:text-white text-xs gap-1.5"
            >
              <Cake className="w-3.5 h-3.5" />
              Sinh nhật khách hàng
            </TabsTrigger>
            <TabsTrigger
              value="vouchers"
              className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-xs gap-1.5"
            >
              <Tag className="w-3.5 h-3.5" />
              Mã ưu đãi / Voucher
            </TabsTrigger>
            <TabsTrigger
              value="redemptions"
              className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs gap-1.5"
            >
              <History className="w-3.5 h-3.5" />
              Lịch sử đổi voucher
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRedeemDialogOpen(true)}
              className="h-8 border-slate-700 text-slate-200 hover:bg-slate-800 gap-1.5 text-xs"
            >
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              Áp dụng Voucher
            </Button>
            <Button
              size="sm"
              onClick={() => setCreateDialogOpen(true)}
              className="h-8 bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5 text-xs"
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
