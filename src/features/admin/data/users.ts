import { createClient } from "@/lib/supabase/server";

export interface AdminUserItem {
  id: string;
  full_name: string;
  phone: string | null;
  default_branch_id: string | null;
  default_branch_name: string | null;
  is_active: boolean;
  created_at: string;
  roles: Array<{
    role_id: string;
    role_name: string;
    role_key: string;
    branch_id: string | null;
    branch_name: string | null;
  }>;
}

export async function getUsersList(): Promise<AdminUserItem[]> {
  const supabase = await createClient();

  const { data: profiles, error: pError } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      phone,
      default_branch_id,
      is_active,
      created_at,
      default_branch:branches!profiles_default_branch_id_fkey(name)
    `)
    .order("created_at", { ascending: true });

  if (pError || !profiles) {
    return [];
  }

  const { data: userRoles } = await supabase.from("user_roles").select(`
      user_id,
      role_id,
      branch_id,
      role:roles(key, name),
      branch:branches(name)
    `);

  const rolesByUser = new Map<string, AdminUserItem["roles"]>();
  (userRoles || []).forEach((ur: any) => {
    if (!rolesByUser.has(ur.user_id)) {
      rolesByUser.set(ur.user_id, []);
    }
    rolesByUser.get(ur.user_id)!.push({
      role_id: ur.role_id,
      role_name: ur.role?.name || "Chưa đặt tên",
      role_key: ur.role?.key || "",
      branch_id: ur.branch_id,
      branch_name: ur.branch?.name || "Toàn chuỗi",
    });
  });

  return profiles.map((p: any) => ({
    id: p.id,
    full_name: p.full_name,
    phone: p.phone,
    default_branch_id: p.default_branch_id,
    default_branch_name: p.default_branch?.name || null,
    is_active: p.is_active,
    created_at: p.created_at,
    roles: rolesByUser.get(p.id) || [],
  }));
}
