import { redirect } from "next/navigation";
import { BranchesTable, getActiveBranches } from "@/features/admin";
import { getSession } from "@/shared/auth/server";

export const metadata = {
  title: "Cài đặt cơ sở | CRM Chuỗi Khách Sạn",
  description:
    "Quản lý danh sách 8 cơ sở, địa chỉ, số điện thoại và giờ cắt đêm",
};

export default async function SettingsBranchesPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  if (!session.can("settings.branches")) {
    redirect("/?denied=1");
  }

  const branches = await getActiveBranches();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Cài đặt Cơ Sở Khách Sạn
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Quản lý thông tin 8 khách sạn thành viên trong chuỗi
        </p>
      </div>

      <BranchesTable branches={branches} />
    </div>
  );
}
