import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSourceChannels } from "@/features/admin/data/sources";
import { GuestForm } from "@/features/guests";
import { getSession } from "@/shared/auth/server";

export const metadata: Metadata = {
  title: "Thêm hồ sơ khách tiềm năng | CRM Khách Sạn",
};

export default async function NewGuestPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (!session.can("guest.create")) {
    redirect("/guests");
  }

  const channels = await getSourceChannels();
  const activeChannels = channels.filter((c) => c.is_active);

  return <GuestForm sourceChannels={activeChannels} />;
}
