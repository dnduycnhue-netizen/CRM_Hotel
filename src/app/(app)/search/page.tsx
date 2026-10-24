import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SearchView } from "@/features/search";
import { getSession } from "@/shared/auth/server";

export const metadata: Metadata = {
  title: "Tra cứu khách hàng | CRM Khách Sạn",
};

export default async function SearchPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (!session.can("guest.search")) {
    redirect("/");
  }

  const canViewChain = session.can("report.view_chain");

  return <SearchView canViewChain={canViewChain} />;
}
