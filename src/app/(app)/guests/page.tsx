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

interface PageProps {
  searchParams: Promise<{
    consent?: string;
    tag?: string;
  }>;
}

export default async function GuestsPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (!session.can("guest.search")) {
    redirect("/?denied=1");
  }

  const { consent, tag } = await searchParams;

  // Quản lý cơ sở chỉ xem khách thuộc cơ sở của mình
  const canViewChain = session.can("report.view_chain");
  const branchId = canViewChain
    ? undefined
    : session.currentBranchId || session.branchIds[0];

  const [guests, salesUsers] = await Promise.all([
    getGuestsList({ limit: 100, branchId, consentChannel: consent, tag }),
    getSalesUsers(),
  ]);

  const canExport = session.can("guest.export");

  return (
    <GuestListTable
      initialGuests={guests}
      salesUsers={salesUsers}
      canExport={canExport}
      currentUserId={session.userId}
      initialConsentFilter={consent || "all"}
    />
  );
}
