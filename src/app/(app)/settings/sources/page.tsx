import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  getPartnersList,
  getSourceChannels,
  SourcesTable,
} from "@/features/admin";
import { requirePermission } from "@/shared/auth/server";

export const metadata: Metadata = {
  title: "Nguồn khách & Kênh đối tác | Cài đặt hệ thống",
};

export default async function SourcesPage() {
  const hasPerm = await requirePermission("settings.sources");
  if (!hasPerm.ok) {
    redirect("/");
  }

  const [channels, partners] = await Promise.all([
    getSourceChannels(),
    getPartnersList(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Nguồn khách & Kênh đối tác
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Cấu hình danh mục nguồn khách, kênh OTA và danh sách đối tác lữ hành /
          doanh nghiệp
        </p>
      </div>

      <SourcesTable channels={channels} partners={partners} />
    </div>
  );
}
