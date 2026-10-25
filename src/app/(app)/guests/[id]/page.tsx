import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getActiveBranches } from "@/features/admin";
import {
  GuestProfileView,
  getGuestConsentHistory,
  getGuestProfile,
  getSalesUsers,
} from "@/features/guests";
import { getActiveLoyaltyPolicy, getPolicyTiers } from "@/features/loyalty";
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
    redirect("/?denied=1");
  }

  const { id } = await params;
  const [profile, salesUsers, branches, activePolicy, consentHistory] =
    await Promise.all([
      getGuestProfile(id),
      getSalesUsers(),
      getActiveBranches(),
      getActiveLoyaltyPolicy(),
      getGuestConsentHistory(id),
    ]);

  if (!profile) {
    notFound();
  }

  const availableTiers = activePolicy?.id
    ? await getPolicyTiers(activePolicy.id)
    : [];

  return (
    <GuestProfileView
      profile={profile}
      salesUsers={salesUsers}
      branches={branches}
      currentUserId={session.userId}
      availableTiers={availableTiers}
      consentHistory={consentHistory}
    />
  );
}
