// src/proxy.ts

import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/offline"];

// Strict route-level permission checks (Deny by default)
const ROUTE_PERMISSION_RULES: Array<{
  prefix: string;
  requiredAnyPerms: string[];
}> = [
  {
    prefix: "/settings",
    // Only users with settings management capabilities
    requiredAnyPerms: [
      "settings.branches",
      "settings.users",
      "settings.roles",
      "settings.sources",
      "settings.rooms",
      "settings.modules",
    ],
  },
  {
    prefix: "/audit",
    // Only users with audit review capability
    requiredAnyPerms: ["audit.view_all", "audit.view_branch"],
  },
  {
    prefix: "/reports",
    // Operational or revenue reporting
    requiredAnyPerms: [
      "report.view_chain",
      "report.view_branch",
      "revenue.view",
      "facility.view",
    ],
  },
  {
    prefix: "/check-in",
    // Frontdesk check-in capability
    requiredAnyPerms: ["stay.create"],
  },
];

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

  // If not logged in, redirect to login
  if (!data?.claims && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // If logged in and accessing /login, redirect to root
  if (data?.claims && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Strict route-level permission enforcement based on user's actual permissions from my_access()
  if (data?.claims) {
    const matchedRule = ROUTE_PERMISSION_RULES.find((rule) =>
      pathname.startsWith(rule.prefix),
    );

    if (matchedRule) {
      try {
        const { data: access } = await supabase.rpc("my_access");
        const userPerms = new Set<string>();

        if (access?.permissions && typeof access.permissions === "object") {
          Object.values(access.permissions).forEach((perms: any) => {
            if (Array.isArray(perms)) {
              perms.forEach((p) => {
                userPerms.add(p);
              });
            }
          });
        }

        const hasAccess = matchedRule.requiredAnyPerms.some((perm) =>
          userPerms.has(perm),
        );

        // Deny by default if user does not hold the required permission
        if (!hasAccess) {
          return NextResponse.redirect(new URL("/", request.url));
        }
      } catch {
        // If access verification fails, fail-safe redirect to home
        return NextResponse.redirect(new URL("/", request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|icons|sw.js|manifest.webmanifest|favicon.ico).*)",
  ],
};
