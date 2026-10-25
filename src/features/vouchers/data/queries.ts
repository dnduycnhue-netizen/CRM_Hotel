import { createClient } from "@/lib/supabase/server";
import type {
  RewardsOverviewStats,
  UpcomingBirthdayGuest,
  Voucher,
  VoucherRedemption,
} from "../types";

/**
 * Lấy danh sách khách hàng có sinh nhật sắp tới
 */
export async function getUpcomingBirthdays(
  daysAhead: number = 30,
  branchId?: string,
): Promise<UpcomingBirthdayGuest[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "get_upcoming_birthdays" as never,
    {
      p_days_ahead: daysAhead,
      p_branch_id: branchId || null,
    } as never,
  );

  if (error) {
    console.error("Lỗi get_upcoming_birthdays RPC:", error);
    return [];
  }

  if (!data || !Array.isArray(data)) {
    return [];
  }

  return (data as any[]).map((row) => ({
    guest_id: row.guest_id,
    full_name: row.full_name,
    dob: row.dob,
    phone: row.phone,
    email: row.email,
    gender: row.gender,
    days_until: Number(row.days_until),
    birthday_this_year: row.birthday_this_year,
    age: Number(row.age),
    marketing_consent: Boolean(row.marketing_consent),
    tier_code: row.tier_code,
    tier_name: row.tier_name,
    total_stays: Number(row.total_stays || 0),
    last_stay_date: row.last_stay_date,
    last_branch_name: row.last_branch_name,
    greeting_status: row.greeting_status,
    greeting_channel: row.greeting_channel,
    greeting_gift: row.greeting_gift,
    greeting_voucher_code: row.greeting_voucher_code,
  }));
}

/**
 * Lấy danh sách voucher trong hệ thống
 */
export async function getVouchersList(options?: {
  status?: string;
  branchId?: string;
  guestId?: string;
  limit?: number;
}): Promise<Voucher[]> {
  const supabase = await createClient();
  const limit = options?.limit || 50;

  let query = (supabase.from("vouchers") as any)
    .select(
      `
      id,
      code,
      title,
      discount_type,
      discount_value,
      max_discount_amount,
      min_spend_amount,
      valid_from,
      valid_to,
      usage_limit,
      used_count,
      target_guest_id,
      applicable_branch_id,
      status,
      note,
      created_at,
      updated_at,
      target_guest:guests!target_guest_id(full_name),
      branch:branches!applicable_branch_id(name)
    `,
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options?.status && options.status !== "all") {
    query = query.eq("status", options.status);
  }

  if (options?.branchId) {
    query = query.or(
      `applicable_branch_id.eq.${options.branchId},applicable_branch_id.is.null`,
    );
  }

  if (options?.guestId) {
    query = query.or(
      `target_guest_id.eq.${options.guestId},target_guest_id.is.null`,
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("Lỗi lấy danh sách voucher:", error);
    return [];
  }

  return (data || []).map((v: any) => ({
    id: v.id,
    code: v.code,
    title: v.title,
    discount_type: v.discount_type,
    discount_value: Number(v.discount_value),
    max_discount_amount: v.max_discount_amount
      ? Number(v.max_discount_amount)
      : null,
    min_spend_amount: Number(v.min_spend_amount || 0),
    valid_from: v.valid_from,
    valid_to: v.valid_to,
    usage_limit: Number(v.usage_limit || 1),
    used_count: Number(v.used_count || 0),
    target_guest_id: v.target_guest_id,
    target_guest_name: v.target_guest?.full_name || null,
    applicable_branch_id: v.applicable_branch_id,
    applicable_branch_name: v.branch?.name || null,
    status: v.status,
    note: v.note,
    created_at: v.created_at,
    updated_at: v.updated_at,
  }));
}

/**
 * Lấy lịch sử đổi mã voucher
 */
export async function getVoucherRedemptionsList(options?: {
  voucherId?: string;
  guestId?: string;
  branchId?: string;
  limit?: number;
}): Promise<VoucherRedemption[]> {
  const supabase = await createClient();
  const limit = options?.limit || 50;

  let query = (supabase.from("voucher_redemptions") as any)
    .select(
      `
      id,
      voucher_id,
      guest_id,
      stay_id,
      branch_id,
      discount_applied,
      redeemed_at,
      note,
      voucher:vouchers(code, title),
      guest:guests(full_name),
      branch:branches(name)
    `,
    )
    .order("redeemed_at", { ascending: false })
    .limit(limit);

  if (options?.voucherId) {
    query = query.eq("voucher_id", options.voucherId);
  }
  if (options?.guestId) {
    query = query.eq("guest_id", options.guestId);
  }
  if (options?.branchId) {
    query = query.eq("branch_id", options.branchId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Lỗi lấy lịch sử đổi voucher:", error);
    return [];
  }

  return (data || []).map((r: any) => ({
    id: r.id,
    voucher_id: r.voucher_id,
    voucher_code: r.voucher?.code || "",
    voucher_title: r.voucher?.title || "",
    guest_id: r.guest_id,
    guest_name: r.guest?.full_name || "Khách hàng",
    stay_id: r.stay_id,
    branch_id: r.branch_id,
    branch_name: r.branch?.name || "",
    discount_applied: Number(r.discount_applied || 0),
    redeemed_at: r.redeemed_at,
    note: r.note,
  }));
}

/**
 * Tổng hợp số liệu tổng quan Rewards & Sinh nhật
 */
export async function getRewardsOverview(
  branchId?: string,
): Promise<RewardsOverviewStats> {
  const supabase = await createClient();

  // 1. Sinh nhật 7 ngày và 30 ngày
  const [b7, b30] = await Promise.all([
    getUpcomingBirthdays(7, branchId),
    getUpcomingBirthdays(30, branchId),
  ]);

  // 2. Lời chúc sinh nhật đã gửi trong năm nay
  const currentYear = new Date().getFullYear();
  let greetingsQuery = (supabase.from("birthday_greetings") as any)
    .select("id", { count: "exact", head: true })
    .eq("year", currentYear)
    .eq("status", "sent");

  if (branchId) {
    greetingsQuery = greetingsQuery.eq("branch_id", branchId);
  }
  const { count: greetingsCount } = await greetingsQuery;

  // 3. Số lượng voucher đang active
  const todayStr = new Date().toISOString().slice(0, 10);
  let activeVouchersQuery = (supabase.from("vouchers") as any)
    .select("id", { count: "exact", head: true })
    .eq("status", "active")
    .gte("valid_to", todayStr);

  if (branchId) {
    activeVouchersQuery = activeVouchersQuery.or(
      `applicable_branch_id.eq.${branchId},applicable_branch_id.is.null`,
    );
  }
  const { count: activeVouchersCount } = await activeVouchersQuery;

  // 4. Lịch sử đổi voucher & tổng tiền chiết khấu
  let redemptionsQuery = (supabase.from("voucher_redemptions") as any).select(
    "discount_applied",
  );

  if (branchId) {
    redemptionsQuery = redemptionsQuery.eq("branch_id", branchId);
  }
  const { data: redemptionsData } = await redemptionsQuery;

  const totalVouchersRedeemed = redemptionsData?.length || 0;
  const totalDiscountGiven = (redemptionsData || []).reduce(
    (acc: number, r: any) => acc + Number(r.discount_applied || 0),
    0,
  );

  return {
    birthdaysNext7Days: b7.length,
    birthdaysNext30Days: b30.length,
    greetingsSentThisMonth: greetingsCount || 0,
    activeVouchersCount: activeVouchersCount || 0,
    totalVouchersRedeemed,
    totalDiscountGiven,
  };
}

/**
 * Lấy danh sách cơ sở đang hoạt động để hiển thị bộ lọc
 */
export async function getActiveBranches(): Promise<
  Array<{ id: string; name: string; code: string }>
> {
  const supabase = await createClient();
  const { data } = await (supabase.from("branches") as any)
    .select("id, name, code")
    .eq("is_active", true)
    .order("name", { ascending: true });

  return (data as Array<{ id: string; name: string; code: string }>) || [];
}

/**
 * Lấy danh sách khách hàng để chọn trong dialog
 */
export async function getGuestsForSelection(
  limit: number = 20,
): Promise<Array<{ id: string; full_name: string; phone: string | null }>> {
  const supabase = await createClient();
  const { data } = await (supabase.from("guests") as any)
    .select("id, full_name, phone")
    .eq("status", "active")
    .order("full_name", { ascending: true })
    .limit(limit);

  return data || [];
}
