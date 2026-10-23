import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getActiveBranches } from "@/features/admin/data/branches";
import {
  GuestProfileView,
  getGuestProfile,
  getSalesUsers,
} from "@/features/guests";
import { requirePermission } from "@/shared/auth/server";

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
  const hasPerm = await requirePermission("guest.view_summary");
  if (!hasPerm.ok) {
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
