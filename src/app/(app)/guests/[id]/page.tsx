import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getActiveBranches } from "@/features/admin/data/branches";
import {
  GuestProfileView,
  getGuestProfile,
  getSalesUsers,
} from "@/features/guests";
import { getSession } from "@/shared/auth/server";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const profile = await getGuestProfile(id);
  if (!profile) {
    return { title: "Không tìm thấy khách hàng" };
  }
  return {
    title: `${profile.guest.full_name} | Hồ sơ 360° Khách hàng`,
  };
}

export default async function GuestDetailPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  if (!session.can("guest.view_summary")) {
    redirect("/");
  }

  const { id } = await params;
  const [profile, salesUsers, branches] = await Promise.all([
    getGuestProfile(id),
    getSalesUsers(),
    getActiveBranches(),
  ]);

  if (!profile) {
    notFound();
  }

  return (
    <GuestProfileView
      profile={profile}
      salesUsers={salesUsers}
      branches={branches}
    />
  );
}
