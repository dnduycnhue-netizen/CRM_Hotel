"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/shared/auth/server";
import { type ActionResult, fail, ok } from "@/shared/errors";

export async function selectBranchAction(branchId: string) {
  const cookieStore = await cookies();
  cookieStore.set("branch_id", branchId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  revalidatePath("/", "layout");
}

/**
 * Tạo tài khoản nhân sự mới và phân quyền vai trò
 */
export async function createUserAction(
  formData: FormData,
): Promise<ActionResult<{ id: string; fullName: string }>> {
  const hasPerm = await requirePermission("settings.users");
  if (!hasPerm.ok) {
    return hasPerm;
  }
  const callerUserId = hasPerm.data.userId;

  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;
  const fullName = (formData.get("fullName") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim() || null;
  const roleId = formData.get("roleId") as string;
  const branchId = (formData.get("branchId") as string) || null;

  if (!email || !password || !fullName || !roleId) {
    return fail("VALIDATION");
  }

  const adminClient = supabaseAdmin();

  // Chống leo quyền: Chỉ Chủ chuỗi mới có quyền gán role Owner
  const { data: assignedRole } = await (adminClient.from("roles") as any)
    .select("key")
    .eq("id", roleId)
    .single();

  const { data: callerRoles } = await (adminClient.from("user_roles") as any)
    .select("role:roles(key)")
    .eq("user_id", callerUserId);
  const isCallerOwner = callerRoles?.some((r: any) => r.role?.key === "owner");

  if (assignedRole?.key === "owner" && !isCallerOwner) {
    return fail(
      "FORBIDDEN",
      undefined,
      "Chỉ Chủ chuỗi mới có quyền tạo tài khoản với vai trò Chủ chuỗi",
    );
  }

  // 1. Tạo auth user
  const { data: userRes, error: userErr } =
    await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

  if (userErr || !userRes.user) {
    return fail("CONFLICT", {
      email: [userErr?.message || "Email này đã tồn tại trong hệ thống!"],
    });
  }

  const userId = userRes.user.id;

  // 2. Thêm profile nhân sự
  const { error: profileErr } = await adminClient.from("profiles").insert({
    id: userId,
    full_name: fullName,
    phone,
    default_branch_id: branchId || null,
    is_active: true,
  });

  if (profileErr) {
    await adminClient.auth.admin.deleteUser(userId);
    return fail("UNKNOWN");
  }

  // 3. Gán vai trò qua RPC an toàn set_user_access (thay vì insert trực tiếp)
  const supabase = await createClient();
  const { error: accessErr } = await (supabase.rpc as any)("set_user_access", {
    p_user_id: userId,
    p_roles: [{ role_id: roleId, branch_id: branchId || null }],
    p_overrides: [],
  });

  if (accessErr) {
    await adminClient.auth.admin.deleteUser(userId);
    return fail(accessErr.code, undefined, accessErr.message);
  }

  revalidatePath("/settings/users");
  return ok({ id: userId, fullName });
}

/**
 * Cập nhật thông tin nhân sự và phân bổ lại vai trò / cơ sở (chống leo quyền qua RPC)
 */
export async function updateUserAction(
  formData: FormData,
): Promise<ActionResult<{ success: boolean }>> {
  const hasPerm = await requirePermission("settings.users");
  if (!hasPerm.ok) {
    return hasPerm;
  }
  const callerUserId = hasPerm.data.userId;

  const userId = formData.get("userId") as string;
  const fullName = (formData.get("fullName") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim() || null;
  const roleId = formData.get("roleId") as string;
  const branchId = (formData.get("branchId") as string) || null;
  const isActive = formData.get("isActive") === "true";

  if (!userId || !fullName || !roleId) {
    return fail("VALIDATION");
  }

  // Chặn tự sửa quyền chính mình
  if (userId === callerUserId) {
    return fail(
      "FORBIDDEN",
      undefined,
      "Bạn không thể tự chỉnh sửa quyền hoặc vai trò của chính mình",
    );
  }

  // 1. Cập nhật phân quyền thông qua RPC set_user_access (bảo vệ chống leo quyền & chống xóa owner cuối cùng)
  const supabase = await createClient();
  const { error: accessErr } = await (supabase.rpc as any)("set_user_access", {
    p_user_id: userId,
    p_roles: [{ role_id: roleId, branch_id: branchId || null }],
    p_overrides: [],
  });

  if (accessErr) {
    return fail(accessErr.code, undefined, accessErr.message);
  }

  // 2. Cập nhật thông tin hồ sơ
  const adminClient = supabaseAdmin();
  const { error: pErr } = await adminClient
    .from("profiles")
    .update({
      full_name: fullName,
      phone,
      default_branch_id: branchId || null,
      is_active: isActive,
    })
    .eq("id", userId);

  if (pErr) {
    return fail("UNKNOWN");
  }

  revalidatePath("/settings/users");
  return ok({ success: true });
}

/**
 * Lưu ma trận quyền hạn cho một vai trò hệ thống (chỉ Chủ chuỗi được chỉnh sửa qua RPC set_role_permissions)
 */
export async function updateRolePermissionsAction(
  roleId: string,
  permissionKeys: string[],
): Promise<ActionResult<{ count: number }>> {
  const hasPerm = await requirePermission("settings.roles");
  if (!hasPerm.ok) {
    return hasPerm;
  }

  const supabase = await createClient();
  const { error: rpcErr } = await (supabase.rpc as any)(
    "set_role_permissions",
    {
      p_role_id: roleId,
      p_keys: permissionKeys,
    },
  );

  if (rpcErr) {
    return fail(rpcErr.code, undefined, rpcErr.message);
  }

  revalidatePath("/settings/roles");
  return ok({ count: permissionKeys.length });
}

export interface SaveBranchInput {
  id?: string | null;
  code: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  nightCutoff?: string;
  defaultCheckoutTime?: string;
  isActive?: boolean;
}

/**
 * Thêm mới hoặc cập nhật thông tin cơ sở khách sạn qua RPC an toàn save_branch
 */
export async function saveBranchAction(
  rawInput: FormData | SaveBranchInput,
): Promise<ActionResult<{ id: string }>> {
  const hasPerm = await requirePermission("settings.branches");
  if (!hasPerm.ok) return hasPerm;

  let id: string | null = null;
  let code = "";
  let name = "";
  let phone: string | null = null;
  let address: string | null = null;
  let nightCutoff = "06:00:00";
  let defaultCheckoutTime = "12:00:00";
  let isActive = true;

  if (rawInput instanceof FormData) {
    id = (rawInput.get("id") as string) || null;
    code = (rawInput.get("code") as string)?.trim().toUpperCase() || "";
    name = (rawInput.get("name") as string)?.trim() || "";
    phone = (rawInput.get("phone") as string)?.trim() || null;
    address = (rawInput.get("address") as string)?.trim() || null;
    nightCutoff = (rawInput.get("nightCutoff") as string) || "06:00:00";
    defaultCheckoutTime =
      (rawInput.get("defaultCheckoutTime") as string) || "12:00:00";
    isActive = rawInput.get("isActive") !== "false";
  } else {
    id = rawInput.id || null;
    code = rawInput.code?.trim().toUpperCase() || "";
    name = rawInput.name?.trim() || "";
    phone = rawInput.phone?.trim() || null;
    address = rawInput.address?.trim() || null;
    nightCutoff = rawInput.nightCutoff || "06:00:00";
    defaultCheckoutTime = rawInput.defaultCheckoutTime || "12:00:00";
    isActive = rawInput.isActive !== undefined ? rawInput.isActive : true;
  }

  if (!code || !name) {
    return fail("VALIDATION", {
      name: ["Mã và tên cơ sở không được để trống"],
    });
  }

  const supabase = await createClient();
  const { data: savedId, error: rpcErr } = await (supabase.rpc as any)(
    "save_branch",
    {
      p_id: id || null,
      p_code: code,
      p_name: name,
      p_phone: phone,
      p_address: address,
      p_night_cutoff: nightCutoff,
      p_default_checkout_time: defaultCheckoutTime,
      p_is_active: isActive,
    },
  );

  if (rpcErr) {
    return fail(rpcErr.code, undefined, rpcErr.message);
  }

  revalidatePath("/settings/branches");
  revalidatePath("/", "layout");
  return ok({ id: savedId || id || "" });
}
