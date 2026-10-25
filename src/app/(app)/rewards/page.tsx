import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  getActiveBranches,
  getGuestsForSelection,
  getRewardsOverview,
  getUpcomingBirthdays,
  getVoucherRedemptionsList,
  getVouchersList,
  RewardsHub,
} from "@/features/vouchers";
import { getSession } from "@/shared/auth/server";

export const metadata: Metadata = {
  title: "Sinh nhật & Voucher ưu đãi | CRM Khách Sạn",
  description:
    "Quản lý sinh nhật khách hàng VIP, phát hành và áp dụng mã voucher giảm giá",
};

export default async function RewardsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  // Kiểm tra quyền truy cập module
  const canViewBirthday = session.can("birthday.view");
  const canIssueVoucher = session.can("voucher.issue");
  const canRedeemVoucher = session.can("voucher.redeem");

  if (!canViewBirthday && !canIssueVoucher && !canRedeemVoucher) {
    redirect("/");
  }

  const isChainAdmin = session.branchIds.length > 1;
  const branchId = isChainAdmin
    ? undefined
    : session.currentBranchId || undefined;

  const [stats, birthdays, vouchers, redemptions, branches, guests] =
    await Promise.all([
      getRewardsOverview(branchId),
      getUpcomingBirthdays(60, branchId),
      getVouchersList({ limit: 100, branchId }),
      getVoucherRedemptionsList({ limit: 100, branchId }),
      getActiveBranches(),
      getGuestsForSelection(100),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Sinh nhật & Voucher ưu đãi
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Theo dõi sinh nhật khách hàng VIP, gửi lời chúc mừng & thiệp quà, phát
          hành và áp dụng mã voucher giảm giá khi check-in hoặc thanh toán.
        </p>
      </div>

      <RewardsHub
        stats={stats}
        birthdays={birthdays}
        vouchers={vouchers}
        redemptions={redemptions}
        branches={branches}
        guests={guests}
      />
    </div>
  );
}
