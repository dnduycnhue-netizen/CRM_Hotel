import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  GuestListTable,
  getGuestsList,
  getSalesUsers,
} from "@/features/guests";
import { getSession } from "@/shared/auth/server";

export const metadata: Metadata = {
  title: "Hồ sơ khách hàng & Sales | CRM Khách Sạn",
};

export default async function GuestsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (!session.can("guest.search")) {
    redirect("/");
  }

  // Quản lý cơ sở chỉ xem khách thuộc cơ sở của mình
  const branchId =
    !session.can("report.view_chain") && session.currentBranchId
      ? session.currentBranchId
      : undefined;

  const [guests, salesUsers] = await Promise.all([
    getGuestsList({ limit: 100, branchId }),
    getSalesUsers(),
  ]);

  const canExport = session.can("guest.export");

  return (
    <GuestListTable
      initialGuests={guests}
      salesUsers={salesUsers}
      canExport={canExport}
    />
  );
}
