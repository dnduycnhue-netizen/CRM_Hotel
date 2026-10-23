import { redirect } from "next/navigation";
import { getActiveBranches, getRooms } from "@/features/admin";
import { CheckInForm } from "@/features/check-in";
import { getSession } from "@/shared/auth/server";

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
    redirect("/");
  }
  const branches = await getActiveBranches();

  const currentBranchId = session?.currentBranchId || branches[0]?.id || "b1";
  const currentBranch =
    branches.find((b) => b.id === currentBranchId) || branches[0];
  const rooms = await getRooms(currentBranchId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <CheckInForm
        currentBranchId={currentBranch.id}
        branchName={currentBranch.name}
        rooms={rooms}
      />
    </div>
  );
}
