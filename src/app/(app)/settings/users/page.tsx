import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  getActiveBranches,
  getSystemRoles,
  getUsersList,
  UsersTable,
} from "@/features/admin";
import { getSession } from "@/shared/auth/server";

export const metadata: Metadata = {
  title: "Người Dùng & Phân Quyền Tài Khoản | CRM Chuỗi Khách Sạn",
  description:
    "Thêm tài khoản nhân sự mới, phân bổ cơ sở làm việc và gán vai trò quyền hạn",
};

export default async function UsersPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  if (!session.can("settings.users")) {
    redirect("/?denied=1");
  }

  const [users, branches, { roles }] = await Promise.all([
    getUsersList(),
    getActiveBranches(),
    getSystemRoles(),
  ]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <UsersTable initialUsers={users} branches={branches} roles={roles} />
    </div>
  );
}
