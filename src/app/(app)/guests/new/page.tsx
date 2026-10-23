import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GuestForm } from "@/features/guests";
import { requirePermission } from "@/shared/auth/server";

export const metadata: Metadata = {
  title: "Thêm hồ sơ khách tiềm năng | CRM Khách Sạn",
};

export default async function NewGuestPage() {
  const hasPerm = await requirePermission("guest.create");
  if (!hasPerm.ok) {
    redirect("/guests");
  }

  return <GuestForm />;
}
