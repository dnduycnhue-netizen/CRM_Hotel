import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  ApprovalsHub,
  getActiveBlacklist,
  getPendingFlags,
  getPendingMergeRequests,
} from "@/features/approvals";
import { getSession } from "@/shared/auth/server";

export const metadata: Metadata = {
  title: "Trung tâm Phê duyệt & Hợp nhất | CRM Khách Sạn",
};

export default async function ApprovalsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const hasMergePerm = session.can("merge.approve");
  const hasFlagPerm = session.can("blacklist.approve");

  if (!hasMergePerm && !hasFlagPerm) {
    redirect("/");
  }

  const [mergeRequests, pendingFlags, activeFlags] = await Promise.all([
    getPendingMergeRequests(),
    getPendingFlags(),
    getActiveBlacklist(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Trung tâm Phê duyệt & Hợp nhất
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Kiểm duyệt các đề xuất hợp nhất hồ sơ khách trùng lặp và phê duyệt
          danh sách đen (Blacklist) toàn chuỗi.
        </p>
      </div>

      <ApprovalsHub
        mergeRequests={mergeRequests}
        pendingFlags={pendingFlags}
        activeFlags={activeFlags}
      />
    </div>
  );
}
