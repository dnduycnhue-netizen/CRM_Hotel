import { redirect } from "next/navigation";
import { getActiveBranches, getRooms, RoomsTable } from "@/features/admin";
import { requirePermission } from "@/shared/auth/server";

export const metadata = {
  title: "Cài đặt phòng | CRM Chuỗi Khách Sạn",
  description: "Danh mục 240 phòng kinh doanh của 8 khách sạn",
};

export default async function SettingsRoomsPage() {
  const hasPerm = await requirePermission("settings.rooms");
  if (!hasPerm.ok) {
    redirect("/");
  }

  const [rooms, branches] = await Promise.all([
    getRooms(),
    getActiveBranches(),
  ]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Cài đặt Danh Mục Phòng
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Danh mục 240 phòng thuộc 8 khách sạn, hỗ trợ lọc theo tầng và cơ sở
        </p>
      </div>

      <RoomsTable rooms={rooms} branches={branches} />
    </div>
  );
}
