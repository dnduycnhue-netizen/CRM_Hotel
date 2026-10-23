// src/proxy.ts

import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/offline"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "",
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const pathname = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // If not logged in, redirect to login while preserving refreshed cookies
  if (!data?.claims && !isPublic) {
    const redirectResponse = NextResponse.redirect(
      new URL("/login", request.url),
    );
    response.cookies.getAll().forEach((c) => {
      redirectResponse.cookies.set(c);
    });
    return redirectResponse;
  }

  // If logged in and accessing /login, redirect to root while preserving refreshed cookies
  if (data?.claims && pathname === "/login") {
    const redirectResponse = NextResponse.redirect(new URL("/", request.url));
    response.cookies.getAll().forEach((c) => {
      redirectResponse.cookies.set(c);
    });
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|icons|sw.js|manifest.webmanifest|favicon.ico).*)",
  ],
};
