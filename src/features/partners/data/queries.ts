import { createClient } from "@/lib/supabase/server";
import type {
  BranchOption,
  GroupBooking,
  Partner,
  PartnerCommission,
  PartnerContract,
  PartnersOverviewStats,
} from "../types";

export async function getPartnersOverview(branchId?: string | null): Promise<{
  partners: Partner[];
  contracts: PartnerContract[];
  groupBookings: GroupBooking[];
  commissions: PartnerCommission[];
  branches: BranchOption[];
  stats: PartnersOverviewStats;
}> {
  const supabase = await createClient();

  let groupsQuery = (supabase.from("group_bookings") as any)
    .select(`
      id,
      code,
      branch_id,
      partner_id,
      group_name,
      leader_name,
      leader_phone,
      leader_email,
      expected_check_in_at,
      expected_check_out_at,
      actual_check_in_at,
      actual_check_out_at,
      rooms_count,
      guests_count,
      status,
      estimated_amount,
      deposit_amount,
      billing_note,
      note,
      created_by,
      created_at,
      updated_at,
      branch:branches(name),
      partner:partners(name)
    `)
    .order("expected_check_in_at", { ascending: false });

  if (branchId) {
    groupsQuery = groupsQuery.eq("branch_id", branchId);
  }

  let commissionsQuery = (supabase.from("partner_commissions") as any)
    .select(`
      id,
      partner_id,
      branch_id,
      stay_id,
      group_booking_id,
      amount,
      rate_pct,
      base_revenue,
      status,
      paid_at,
      paid_by,
      note,
      created_at,
      partner:partners(name),
      branch:branches(name),
      group_booking:group_bookings(code)
    `)
    .order("created_at", { ascending: false });

  if (branchId) {
    commissionsQuery = commissionsQuery.eq("branch_id", branchId);
  }

  const [partnersRes, contractsRes, groupsRes, commissionsRes, branchesRes] =
    await Promise.all([
      supabase.from("partners").select("*").order("name", { ascending: true }),
      supabase
        .from("partner_contracts")
        .select(`
        id,
        partner_id,
        contract_number,
        valid_from,
        valid_to,
        discount_pct,
        commission_rate_pct,
        payment_terms,
        status,
        attachment_url,
        note,
        created_at,
        updated_at,
        partner:partners(name, kind)
      `)
        .order("valid_to", { ascending: false }),
      groupsQuery,
      commissionsQuery,
      supabase
        .from("branches")
        .select("id, name, code")
        .eq("is_active", true)
        .order("name", { ascending: true }),
    ]);

  const rawPartners = (partnersRes.data as any) || [];
  const rawContracts = (contractsRes.data as any) || [];
  const rawGroups = (groupsRes.data as any) || [];
  const rawCommissions = (commissionsRes.data as any) || [];
  const branches = ((branchesRes.data as any) || []) as BranchOption[];

  // Parse contracts
  const contracts: PartnerContract[] = rawContracts.map((c: any) => ({
    id: c.id,
    partner_id: c.partner_id,
    partner_name: c.partner?.name,
    partner_kind: c.partner?.kind,
    contract_number: c.contract_number,
    valid_from: c.valid_from,
    valid_to: c.valid_to,
    discount_pct: c.discount_pct,
    commission_rate_pct: c.commission_rate_pct,
    payment_terms: c.payment_terms,
    status: c.status,
    attachment_url: c.attachment_url,
    note: c.note,
    created_at: c.created_at,
    updated_at: c.updated_at,
  }));

  // Parse group bookings
  const groupBookings: GroupBooking[] = rawGroups.map((g: any) => ({
    id: g.id,
    code: g.code,
    branch_id: g.branch_id,
    branch_name: g.branch?.name,
    partner_id: g.partner_id,
    partner_name: g.partner?.name,
    group_name: g.group_name,
    leader_name: g.leader_name,
    leader_phone: g.leader_phone,
    leader_email: g.leader_email,
    expected_check_in_at: g.expected_check_in_at,
    expected_check_out_at: g.expected_check_out_at,
    actual_check_in_at: g.actual_check_in_at,
    actual_check_out_at: g.actual_check_out_at,
    rooms_count: g.rooms_count,
    guests_count: g.guests_count,
    status: g.status,
    estimated_amount: Number(g.estimated_amount || 0),
    deposit_amount: Number(g.deposit_amount || 0),
    billing_note: g.billing_note,
    note: g.note,
    created_by: g.created_by,
    created_at: g.created_at,
    updated_at: g.updated_at,
  }));

  // Parse commissions
  const commissions: PartnerCommission[] = rawCommissions.map((cm: any) => ({
    id: cm.id,
    partner_id: cm.partner_id,
    partner_name: cm.partner?.name,
    branch_id: cm.branch_id,
    branch_name: cm.branch?.name,
    stay_id: cm.stay_id,
    group_booking_id: cm.group_booking_id,
    group_code: cm.group_booking?.code,
    amount: Number(cm.amount || 0),
    rate_pct: cm.rate_pct,
    base_revenue: Number(cm.base_revenue || 0),
    status: cm.status,
    paid_at: cm.paid_at,
    paid_by: cm.paid_by,
    note: cm.note,
    created_at: cm.created_at,
  }));

  // Map computed stats per partner
  const partners: Partner[] = rawPartners.map((p: any) => {
    const activeContractsCount = contracts.filter(
      (c) => c.partner_id === p.id && c.status === "active",
    ).length;
    const totalGroupsCount = groupBookings.filter(
      (g) => g.partner_id === p.id,
    ).length;
    const unpaidCommissionAmount = commissions
      .filter(
        (cm) =>
          cm.partner_id === p.id &&
          (cm.status === "pending" || cm.status === "approved"),
      )
      .reduce((sum, cm) => sum + cm.amount, 0);

    return {
      id: p.id,
      name: p.name,
      kind: p.kind,
      contact_name: p.contact_name,
      phone: p.phone,
      email: p.email,
      tax_code: p.tax_code,
      address: p.address,
      bank_name: p.bank_name,
      bank_account: p.bank_account,
      bank_holder: p.bank_holder,
      credit_limit: Number(p.credit_limit || 0),
      payment_terms: p.payment_terms,
      note: p.note,
      is_active: p.is_active,
      created_at: p.created_at,
      active_contracts_count: activeContractsCount,
      total_groups_count: totalGroupsCount,
      unpaid_commission_amount: unpaidCommissionAmount,
    };
  });

  // Calculate high-level stats
  const activePartnersCount = partners.filter((p) => p.is_active).length;
  const activeContractsCount = contracts.filter(
    (c) => c.status === "active",
  ).length;
  const activeGroups = groupBookings.filter(
    (g) => g.status === "confirmed" || g.status === "in_house",
  );
  const totalRoomsInGroups = activeGroups.reduce(
    (sum, g) => sum + g.rooms_count,
    0,
  );
  const pendingCommissionAmount = commissions
    .filter((cm) => cm.status === "pending" || cm.status === "approved")
    .reduce((sum, cm) => sum + cm.amount, 0);
  const paidCommissionAmount = commissions
    .filter((cm) => cm.status === "paid")
    .reduce((sum, cm) => sum + cm.amount, 0);

  const stats: PartnersOverviewStats = {
    totalPartners: partners.length,
    activePartners: activePartnersCount,
    activeContracts: activeContractsCount,
    activeGroups: activeGroups.length,
    totalRoomsInGroups,
    pendingCommissionAmount,
    paidCommissionAmount,
  };

  return {
    partners,
    contracts,
    groupBookings,
    commissions,
    branches,
    stats,
  };
}
