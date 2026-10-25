import { redirect } from "next/navigation";
import { getSession } from "@/shared/auth/server";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  // Redirect to first permitted settings tab or fallback to root
  if (session.can("settings.users")) {
    redirect("/settings/users");
  }
  if (session.can("settings.roles")) {
    redirect("/settings/roles");
  }
  if (session.can("settings.modules")) {
    redirect("/settings/modules");
  }
  if (session.can("settings.branches")) {
    redirect("/settings/branches");
  }
  if (session.can("settings.rooms")) {
    redirect("/settings/rooms");
  }
  if (session.can("inspection.manage")) {
    redirect("/settings/checklists");
  }
  if (session.can("loyalty.view") || session.can("loyalty.configure")) {
    redirect("/settings/loyalty");
  }

  redirect("/");
}
