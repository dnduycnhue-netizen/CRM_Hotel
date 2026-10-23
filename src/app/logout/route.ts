import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // Ignore signout error if session already expired
  }

  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  const redirectResponse = NextResponse.redirect(
    new URL("/login", request.url),
  );

  // Xóa sạch cookie branch_id và các cookie phiên supabase
  for (const c of allCookies) {
    if (c.name.startsWith("sb-") || c.name === "branch_id") {
      redirectResponse.cookies.set(c.name, "", {
        path: "/",
        maxAge: 0,
        expires: new Date(0),
      });
    }
  }

  return redirectResponse;
}
