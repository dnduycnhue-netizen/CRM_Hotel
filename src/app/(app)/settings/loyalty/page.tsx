import { redirect } from "next/navigation";
import {
  getActiveLoyaltyPolicy,
  getLoyaltyPolicies,
  getPolicyTiers,
  LoyaltyPoliciesView,
  type LoyaltyTierItem,
} from "@/features/loyalty";
import { getSession } from "@/shared/auth/server";

export const metadata = {
  title: "Chính sách hạng & Giảm giá | CRM Chuỗi Khách Sạn",
  description:
    "Cấu hình chính sách hạng thành viên và tỷ lệ giảm giá theo mùa hoặc theo năm",
};

export default async function SettingsLoyaltyPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (!session.can("loyalty.view") && !session.can("loyalty.configure")) {
    redirect("/?denied=1");
  }

  const [policies, activePolicy] = await Promise.all([
    getLoyaltyPolicies(),
    getActiveLoyaltyPolicy(),
  ]);

  const tiersByPolicyId: Record<string, LoyaltyTierItem[]> = {};
  await Promise.all(
    policies.map(async (p) => {
      tiersByPolicyId[p.id] = await getPolicyTiers(p.id);
    }),
  );

  return (
    <div className="max-w-7xl mx-auto py-2">
      <LoyaltyPoliciesView
        initialPolicies={policies}
        initialActivePolicy={activePolicy}
        initialTiersByPolicyId={tiersByPolicyId}
        canConfigure={session.can("loyalty.configure")}
      />
    </div>
  );
}
