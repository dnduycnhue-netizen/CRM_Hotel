import { redirect } from "next/navigation";
import { getBranchModuleMatrix, ModuleMatrixTable } from "@/features/admin";
import { getSession } from "@/shared/auth/server";

export const metadata = {
  title: "Bật/tắt Module tính năng | CRM Chuỗi Khách Sạn",
  description: "Cấu hình trạng thái module theo từng cơ sở khách sạn",
};

export default async function SettingsModulesPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  if (!session.can("settings.modules")) {
    redirect("/");
  }

  const matrix = await getBranchModuleMatrix();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Bật / Tắt Module Tính Năng
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Tùy chỉnh bật, tắt hoặc chỉ xem đối với các tính năng (Gộp hồ sơ,
          Blacklist, CSVC, Báo cáo) theo từng khách sạn
        </p>
      </div>

      <ModuleMatrixTable matrix={matrix} />
    </div>
  );
}
