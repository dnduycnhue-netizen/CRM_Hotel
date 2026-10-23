import { redirect } from "next/navigation";
import { getSession } from "@/shared/auth/server";

export default async function RootPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  // Executive dashboard for chain owner and branch managers
  if (session.can("report.view_chain") || session.can("report.view_branch")) {
    redirect("/reports");
  }

  // Facilities & technician staff -> Work orders
  if (session.can("wo.view") && !session.can("stay.create")) {
    redirect("/facilities/work-orders");
  }

  // Sales & Business development -> Guest directory
  if (session.can("guest.search") && !session.can("stay.create")) {
    redirect("/guests");
  }

  // Receptionists & front-desk operations
  redirect("/check-in");
}
