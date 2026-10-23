"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { type ActionResult, fail } from "@/shared/errors";
import { changePasswordSchema } from "./schemas";

export async function loginAction(
  formData: FormData,
): Promise<ActionResult<{ success: boolean }>> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return fail("VALIDATION");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      ok: false,
      error: {
        code: "UNAUTHENTICATED",
        message: "Email hoặc mật khẩu không chính xác, vui lòng kiểm tra lại.",
      },
    };
  }

  const cookieStore = await cookies();
  cookieStore.delete("branch_id");

  redirect("/");
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const cookieStore = await cookies();
  cookieStore.delete("branch_id");
  redirect("/login");
}

export async function changePasswordAction(
  formData: FormData,
): Promise<ActionResult<{ success: boolean }>> {
  const rawData = {
    currentPassword: (formData.get("currentPassword") as string) || "",
    newPassword: (formData.get("newPassword") as string) || "",
    confirmPassword: (formData.get("confirmPassword") as string) || "",
  };

  const validation = changePasswordSchema.safeParse(rawData);
  if (!validation.success) {
    const firstError =
      validation.error.issues[0]?.message || "Dữ liệu mật khẩu không hợp lệ";
    return fail("VALIDATION", undefined, firstError);
  }

  const { currentPassword, newPassword } = validation.data;
  const supabase = await createClient();

  // 1. Kiểm tra phiên người dùng
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user || !user.email) {
    return fail(
      "UNAUTHENTICATED",
      undefined,
      "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
    );
  }

  // 2. Xác thực mật khẩu cũ để chống đổi trộm
  const { error: verifyErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (verifyErr) {
    return fail(
      "UNAUTHENTICATED",
      undefined,
      "Mật khẩu hiện tại không chính xác. Vui lòng kiểm tra lại.",
    );
  }

  // 3. Cập nhật mật khẩu mới cho tài khoản
  const { error: updateErr } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateErr) {
    return fail(
      "SERVER",
      undefined,
      updateErr.message ||
        "Không thể cập nhật mật khẩu lúc này. Vui lòng thử lại sau.",
    );
  }

  return {
    ok: true,
    data: { success: true },
  };
}
