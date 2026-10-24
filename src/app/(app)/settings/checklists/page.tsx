import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  ChecklistsManager,
  getChecklistTemplates,
} from "@/features/facilities";
import { getSession } from "@/shared/auth/server";

export const metadata: Metadata = {
  title: "Mẫu kiểm tra (Checklists) | CRM Khách Sạn",
  description:
    "Quản lý danh sách tiêu chí kiểm tra buồng phòng, khu vực và kỹ thuật định kỳ",
};

export default async function SettingsChecklistsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  if (!session.can("inspection.manage")) {
    redirect("/");
  }

  const templates = await getChecklistTemplates();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Mẫu Kiểm Tra (Checklists)
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Thiết lập bộ tiêu chí kiểm tra phòng, kiểm tra định kỳ cơ sở vật chất
          và an toàn kỹ thuật
        </p>
      </div>

      <ChecklistsManager
        templates={templates}
        canManage={session.can("inspection.manage")}
      />
    </div>
  );
}
