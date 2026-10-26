"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { type ActionResult, fail } from "@/shared/errors";
import { messages } from "@/shared/i18n/vi";
import { changePasswordSchema } from "./schemas";

export async function loginAction(
  formData: FormData,
): Promise<ActionResult<{ success: boolean }>> {
  const email = ((formData.get("email") as string) || "").trim().toLowerCase();
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
    // Chỉ log mã lỗi + status (không log email/mật khẩu) để phân biệt được
    // sai mật khẩu với rate limit / tài khoản bị khóa / lỗi hệ thống.
    console.error("[login] signInWithPassword failed", {
      code: error.code,
      status: error.status,
    });
    const reason = error.code ?? "";
    let message: string = messages.auth.INVALID_CREDENTIALS;
    if (error.status === 429 || reason.includes("rate_limit")) {
      message = messages.auth.RATE_LIMITED;
    } else if (reason === "user_banned") {
      message = messages.auth.USER_BANNED;
    } else if (reason === "email_not_confirmed") {
      message = messages.auth.EMAIL_NOT_CONFIRMED;
    } else if (!error.status || error.status >= 500) {
      message = messages.auth.SERVICE_UNAVAILABLE;
    }
    return {
      ok: false,
      error: { code: "UNAUTHENTICATED", message },
    };
  }

  const cookieStore = await cookies();
  cookieStore.delete("branch_id");

  redirect("/");
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
