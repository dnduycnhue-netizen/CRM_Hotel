import { redirect } from "next/navigation";
import { getProspectsPageData, ProspectsHub } from "@/features/prospects";
import { getSession } from "@/shared/auth/server";

// Import tối đa 500 dòng chạy tuần tự theo lô qua Server Action của trang này
export const maxDuration = 60;

export const metadata = {
  title: "Khách hàng tiềm năng B2B | CRM Chuỗi Khách Sạn",
  description:
    "Quản lý công ty tour chưa hợp tác: chống trùng, nhật ký chăm sóc, chuyển đổi thành đối tác",
};

export default async function ProspectsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  if (!session.can("prospect.view")) {
    redirect("/?denied=1");
  }

  const { prospects, overview } = await getProspectsPageData();

  return (
    <div className="max-w-7xl mx-auto py-2">
      <ProspectsHub
        initialProspects={prospects}
        initialOverview={overview}
        canManage={session.can("prospect.manage")}
        canAssign={session.can("prospect.assign")}
        canConvert={session.can("prospect.convert")}
        canImport={session.can("prospect.import")}
        canExport={session.can("prospect.export")}
        canDelete={session.can("prospect.delete")}
      />
    </div>
  );
}
