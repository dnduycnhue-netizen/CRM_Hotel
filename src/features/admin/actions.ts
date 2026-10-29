"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getSession, requirePermission } from "@/shared/auth/server";
import { type ActionResult, fail, ok } from "@/shared/errors";

export async function selectBranchAction(
  branchId: string,
): Promise<ActionResult<void>> {
  try {
    const session = await getSession();
    if (!session) {
      return fail("UNAUTHENTICATED");
    }

    const isAllowed =
      session.can("report.view_chain") ||
      session.can("settings.branches") ||
      session.branchIds.includes(branchId);

    if (!isAllowed) {
      return fail(
        "FORBIDDEN",
        undefined,
        "Bạn không có quyền truy cập cơ sở này",
      );
    }

    const cookieStore = await cookies();
    cookieStore.set("branch_id", branchId, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: "lax",
    });
    revalidatePath("/", "layout");
    return ok(undefined);
  } catch (err: any) {
    return fail("UNKNOWN", undefined, err?.message || "Không thể lưu cơ sở");
  }
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

import {
  type CreateRoomInput,
  createRoomSchema,
  type PartnerInput,
  partnerSchema,
  type SourceChannelInput,
  sourceChannelSchema,
  type UpdateRoomInput,
  updateRoomSchema,
} from "./schemas";

/**
 * Thêm mới hoặc cập nhật kênh nguồn khách (direct, ota, partner, corporate)
 */
export async function saveSourceChannelAction(
  rawInput: SourceChannelInput,
): Promise<ActionResult<{ id: string }>> {
  const hasPerm = await requirePermission("settings.sources");
  if (!hasPerm.ok) return hasPerm;

  const parsed = sourceChannelSchema.safeParse(rawInput);
  if (!parsed.success) {
    return fail("VALIDATION", parsed.error.flatten().fieldErrors);
  }

  const { id, code, name, kind, requires_partner, is_active, sort } =
    parsed.data;
  const supabase = await createClient();

  if (id) {
    const { error } = await (supabase.from("source_channels") as any)
      .update({
        code,
        name,
        kind,
        requires_partner,
        is_active,
        sort,
      })
      .eq("id", id);
    if (error) {
      return fail(error.code, undefined, error.message);
    }
    revalidatePath("/settings/sources");
    return ok({ id });
  }

  const { data, error } = await (supabase.from("source_channels") as any)
    .insert({
      code,
      name,
      kind,
      requires_partner,
      is_active,
      sort,
    })
    .select("id")
    .single();

  if (error || !data) {
    return fail(error?.code || "UNKNOWN", undefined, error?.message);
  }

  revalidatePath("/settings/sources");
  return ok({ id: data.id });
}

/**
 * Thêm mới hoặc cập nhật đối tác lữ hành / doanh nghiệp
 */
export async function savePartnerAction(
  rawInput: PartnerInput,
): Promise<ActionResult<{ id: string }>> {
  const hasPerm = await requirePermission("settings.sources");
  if (!hasPerm.ok) return hasPerm;

  const parsed = partnerSchema.safeParse(rawInput);
  if (!parsed.success) {
    return fail("VALIDATION", parsed.error.flatten().fieldErrors);
  }

  const {
    id,
    name,
    kind,
    contact_name,
    phone,
    email,
    tax_code,
    note,
    is_active,
  } = parsed.data;
  const supabase = await createClient();

  if (id) {
    const { error } = await (supabase.from("partners") as any)
      .update({
        name,
        kind,
        contact_name: contact_name || null,
        phone: phone || null,
        email: email || null,
        tax_code: tax_code || null,
        note: note || null,
        is_active,
      })
      .eq("id", id);
    if (error) {
      return fail(error.code, undefined, error.message);
    }
    revalidatePath("/settings/sources");
    return ok({ id });
  }

  const { data, error } = await (supabase.from("partners") as any)
    .insert({
      name,
      kind,
      contact_name: contact_name || null,
      phone: phone || null,
      email: email || null,
      tax_code: tax_code || null,
      note: note || null,
      is_active,
    })
    .select("id")
    .single();

  if (error || !data) {
    return fail(error?.code || "UNKNOWN", undefined, error?.message);
  }

  revalidatePath("/settings/sources");
  return ok({ id: data.id });
}

export interface SetBranchModuleChange {
  branchId: string | null;
  moduleKey: string;
  state: "off" | "readonly" | "on";
}

/**
 * Cập nhật cấu hình bật/tắt module theo cơ sở hoặc toàn chuỗi
 */
export async function setBranchModulesAction(
  changes: SetBranchModuleChange[],
): Promise<ActionResult<{ applied: number; cascaded: string[] }>> {
  const perm = await requirePermission("settings.modules");
  if (!perm.ok) return perm;

  if (!Array.isArray(changes) || changes.length === 0) {
    return ok({ applied: 0, cascaded: [] });
  }

  const supabase = await createClient();
  const allCascaded = new Set<string>();
  let appliedCount = 0;

  for (const change of changes) {
    const { branchId, moduleKey, state } = change;
    const { data: cascaded, error: rpcErr } = await (supabase.rpc as any)(
      "set_branch_module",
      {
        p_branch_id: branchId || null,
        p_module_key: moduleKey,
        p_state: state,
        p_config: null,
      },
    );

    if (rpcErr) {
      let friendlyMessage = rpcErr.message;
      if (rpcErr.message?.includes("enable dependencies first")) {
        const matches = rpcErr.message.match(/enable dependencies first: (.*)/);
        const depKeys = matches ? matches[1] : "";
        friendlyMessage = `Cần bật các module phụ thuộc trước (${depKeys}) trước khi kích hoạt module này`;
      } else if (rpcErr.message?.includes("core module cannot be changed")) {
        friendlyMessage =
          "Không thể thay đổi trạng thái của module lõi hệ thống";
      } else if (rpcErr.message?.includes("module not available yet")) {
        friendlyMessage =
          "Tính năng này hiện chưa khả dụng trong hệ thống (Sắp có)";
      } else if (rpcErr.code === "P0403" || rpcErr.code === "42501") {
        friendlyMessage = "Bạn không có quyền quản trị cài đặt module";
      }
      return fail(rpcErr.code || "UNKNOWN", undefined, friendlyMessage);
    }

    if (Array.isArray(cascaded)) {
      for (const c of cascaded) {
        allCascaded.add(c);
      }
    }
    appliedCount++;
  }

  revalidatePath("/", "layout");
  revalidatePath("/settings/modules");

  return ok({
    applied: appliedCount,
    cascaded: Array.from(allCascaded),
  });
}

/**
 * Thêm phòng mới cho cơ sở
 */
export async function createRoomAction(
  rawInput: CreateRoomInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createRoomSchema.safeParse(rawInput);
  if (!parsed.success) {
    return fail("VALIDATION", parsed.error.flatten().fieldErrors);
  }

  const { branch_id, number, floor, room_type, opened_on } = parsed.data;
  const hasPerm = await requirePermission("settings.rooms", branch_id);
  if (!hasPerm.ok) return hasPerm;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("create_room", {
      p_branch_id: branch_id,
      p_number: number,
      p_floor: floor || null,
      p_room_type: room_type || null,
      p_opened_on: opened_on || null,
    });

    if (error) {
      if (error.message?.includes("room number already exists in branch")) {
        return fail(
          "CONFLICT",
          undefined,
          "Số phòng này đã tồn tại ở chi nhánh này",
        );
      }
      return fail(error.code || "UNKNOWN", undefined, error.message);
    }

    revalidatePath("/settings/rooms");
    revalidatePath("/check-in");
    return ok({ id: data as string });
  } catch {
    return fail("UNKNOWN");
  }
}

/**
 * Cập nhật thông tin phòng
 */
export async function updateRoomAction(
  roomId: string,
  branchId: string,
  rawInput: UpdateRoomInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = updateRoomSchema.safeParse(rawInput);
  if (!parsed.success) {
    return fail("VALIDATION", parsed.error.flatten().fieldErrors);
  }

  const hasPerm = await requirePermission("settings.rooms", branchId);
  if (!hasPerm.ok) return hasPerm;

  const { number, floor, room_type, opened_on } = parsed.data;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("update_room", {
      p_room_id: roomId,
      p_number: number,
      p_floor: floor || null,
      p_room_type: room_type || null,
      p_opened_on: opened_on || null,
    });

    if (error) {
      if (error.message?.includes("room number already exists in branch")) {
        return fail(
          "CONFLICT",
          undefined,
          "Số phòng này đã tồn tại ở chi nhánh này",
        );
      }
      return fail(error.code || "UNKNOWN", undefined, error.message);
    }

    revalidatePath("/settings/rooms");
    revalidatePath("/check-in");
    return ok({ id: data as string });
  } catch {
    return fail("UNKNOWN");
  }
}

/**
 * Ngừng kinh doanh phòng
 */
export async function deactivateRoomAction(
  roomId: string,
  branchId: string,
): Promise<ActionResult<{ success: boolean }>> {
  const hasPerm = await requirePermission("settings.rooms", branchId);
  if (!hasPerm.ok) return hasPerm;

  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("deactivate_room", {
      p_room_id: roomId,
    });

    if (error) {
      return fail(error.code || "UNKNOWN", undefined, error.message);
    }

    revalidatePath("/settings/rooms");
    revalidatePath("/check-in");
    return ok({ success: true });
  } catch {
    return fail("UNKNOWN");
  }
}

/**
 * Mở bán lại phòng đã ngừng kinh doanh
 */
export async function reactivateRoomAction(
  roomId: string,
  branchId: string,
): Promise<ActionResult<{ success: boolean }>> {
  const hasPerm = await requirePermission("settings.rooms", branchId);
  if (!hasPerm.ok) return hasPerm;

  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("reactivate_room", {
      p_room_id: roomId,
    });

    if (error) {
      return fail(error.code || "UNKNOWN", undefined, error.message);
    }

    revalidatePath("/settings/rooms");
    revalidatePath("/check-in");
    return ok({ success: true });
  } catch {
    return fail("UNKNOWN");
  }
}

/**
 * Xóa vĩnh viễn phòng (Chỉ Chủ chuỗi, khi chưa phát sinh lưu trú / block)
 */
export async function deleteRoomPermanentAction(
  roomId: string,
  branchId: string,
): Promise<ActionResult<{ success: boolean }>> {
  const hasPerm = await requirePermission("settings.rooms", branchId);
  if (!hasPerm.ok) return hasPerm;

  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("delete_room_permanent", {
      p_room_id: roomId,
    });

    if (error) {
      if (error.message?.includes("cannot delete room with stay history")) {
        return fail(
          "CONFLICT",
          undefined,
          "Không thể xóa vĩnh viễn phòng đã có lịch sử lưu trú. Hãy chọn Ngừng kinh doanh.",
        );
      }
      if (error.message?.includes("cannot delete room with block history")) {
        return fail(
          "CONFLICT",
          undefined,
          "Không thể xóa vĩnh viễn phòng đã có lịch sử khóa phòng (OOO). Hãy chọn Ngừng kinh doanh.",
        );
      }
      if (error.message?.includes("only owner can permanently delete room")) {
        return fail(
          "FORBIDDEN",
          undefined,
          "Chỉ Chủ chuỗi mới có quyền xóa vĩnh viễn phòng.",
        );
      }
      return fail(error.code || "UNKNOWN", undefined, error.message);
    }

    revalidatePath("/settings/rooms");
    revalidatePath("/check-in");
    return ok({ success: true });
  } catch {
    return fail("UNKNOWN");
  }
}
