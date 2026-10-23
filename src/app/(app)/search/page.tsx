import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SearchView } from "@/features/search";
import { requirePermission } from "@/shared/auth/server";

export const metadata: Metadata = {
  title: "Tra cứu khách hàng | CRM Khách Sạn",
};

export default async function SearchPage() {
  const hasPerm = await requirePermission("guest.search");
  if (!hasPerm.ok) {
    redirect("/");
  }

  return <SearchView />;
}
