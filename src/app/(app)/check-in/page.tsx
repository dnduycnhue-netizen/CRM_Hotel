import { redirect } from "next/navigation";
import { getActiveBranches, getRooms } from "@/features/admin";
import { CheckInForm } from "@/features/check-in";
import { getActiveLoyaltyPolicy } from "@/features/loyalty";
import { getActivePartners } from "@/features/partners";
import { getSession } from "@/shared/auth/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Check-in | CRM Chuỗi Khách Sạn",
  description:
    "Thủ tục nhận phòng nhanh cho khách lẻ, khách đoàn và khách quen",
};

export default async function CheckInPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  if (!session.can("stay.create")) {
    redirect("/?denied=1");
  }
  const branches = await getActiveBranches();

  const currentBranchId = session?.currentBranchId || branches[0]?.id || "b1";
  const currentBranch =
    branches.find((b) => b.id === currentBranchId) || branches[0];
  const [rooms, partners, activePolicy] = await Promise.all([
    getRooms(currentBranch.id),
    getActivePartners(),
    getActiveLoyaltyPolicy(),
  ]);
  const isCompanionsEnabled = session.isModuleOn(
    "companions",
    currentBranch.id,
  );
  const companionsCountDefault = activePolicy?.companionsCountDefault ?? true;
  const canConfirmClean = session.can("stay.checkout", currentBranch.id);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <CheckInForm
        currentBranchId={currentBranch.id}
        branchName={currentBranch.name}
        rooms={rooms}
        partners={partners}
        isCompanionsEnabled={isCompanionsEnabled}
        companionsCountDefault={companionsCountDefault}
        canConfirmClean={canConfirmClean}
      />
    </div>
  );
}
