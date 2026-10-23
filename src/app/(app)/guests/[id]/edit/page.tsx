import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getGuestProfile } from "@/features/guests";
import { EditGuestForm } from "@/features/guests/components/edit-guest-form";
import { requirePermission } from "@/shared/auth/server";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Chỉnh sửa hồ sơ khách hàng | CRM Khách Sạn",
};

export default async function EditGuestPage({ params }: PageProps) {
  const hasPerm = await requirePermission("guest.update");
  if (!hasPerm.ok) {
    redirect("/guests");
  }

  const { id } = await params;
  const profile = await getGuestProfile(id);

  if (!profile) {
    notFound();
  }

  return (
    <div className="p-4 sm:p-6">
      <EditGuestForm
        guest={{
          id: profile.guest.id,
          full_name: profile.guest.full_name,
          gender: profile.guest.gender,
          dob: profile.guest.dob,
          nationality: profile.guest.nationality,
          phone: profile.guest.phone,
          email: profile.guest.email,
          address_line: profile.guest.address_line,
          province_code: profile.guest.province_code,
          ward_code: profile.guest.ward_code,
          updated_at: profile.guest.updated_at,
        }}
      />
    </div>
  );
}
