import { redirect } from "next/navigation";
import { getActiveBranches, getRooms } from "@/features/admin";
import { CheckInForm } from "@/features/check-in";
import { getActiveLoyaltyPolicy } from "@/features/loyalty";
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
  const rooms = await getRooms(currentBranch.id);
  const isCompanionsEnabled = session.isModuleOn(
    "companions",
    currentBranch.id,
  );
  const activePolicy = await getActiveLoyaltyPolicy();
  const companionsCountDefault = activePolicy?.companionsCountDefault ?? true;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <CheckInForm
        currentBranchId={currentBranch.id}
        branchName={currentBranch.name}
        rooms={rooms}
        isCompanionsEnabled={isCompanionsEnabled}
        companionsCountDefault={companionsCountDefault}
      />
    </div>
  );
}
