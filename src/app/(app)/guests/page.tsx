import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  GuestListTable,
  getGuestsList,
  getSalesUsers,
} from "@/features/guests";
import { requirePermission } from "@/shared/auth/server";

export const metadata: Metadata = {
  title: "Hồ sơ khách hàng & Sales | CRM Khách Sạn",
};

export default async function GuestsPage() {
  const hasPerm = await requirePermission("guest.search");
  if (!hasPerm.ok) {
    redirect("/");
  }

  const [guests, salesUsers, canExportRes] = await Promise.all([
    getGuestsList({ limit: 100 }),
    getSalesUsers(),
    requirePermission("guest.export"),
  ]);

  return (
    <GuestListTable
      initialGuests={guests}
      salesUsers={salesUsers}
      canExport={canExportRes.ok}
    />
  );
}
