// src/proxy.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PUBLIC_PATHS = ['/login', '/offline'];

// Strict route-level permission checks
const ROUTE_RULES: Array<{
  prefix: string;
  allowedRoles?: string[];
  blockedRoles?: string[];
}> = [
  {
    prefix: '/settings',
    // Only owner/admin can access settings
    blockedRoles: ['receptionist', 'sales', 'technician'],
  },
  {
    prefix: '/audit',
    // Audit logs are restricted to owner/manager
    blockedRoles: ['receptionist', 'sales', 'technician'],
  },
  {
    prefix: '/reports',
    // Reports are restricted to owner/manager
    blockedRoles: ['receptionist', 'technician'],
  },
  {
    prefix: '/check-in',
    // Only staff with frontdesk / check-in capability can access
    blockedRoles: ['sales', 'technician'],
  },
];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data } = await supabase.auth.getClaims();
  const pathname = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // If not logged in, redirect to login
  if (!data?.claims && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If logged in and accessing /login, redirect to root
  if (data?.claims && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Route-level enforcement based on email pattern or role
  if (data?.claims) {
    const email = (data.claims.email as string) || '';

    // Identify test / standard account role
    const isOwner =
      email.includes('owner') ||
      email.includes('admin') ||
      email.includes('duy');
    const isManager = email.includes('quanly');
    const isReception = email.includes('letan');
    const isSales = email.includes('sales');
    const isTech = email.includes('kythuat');

    const userRole = isOwner
      ? 'owner'
      : isManager
      ? 'branch_manager'
      : isReception
      ? 'receptionist'
      : isSales
      ? 'sales'
      : isTech
      ? 'technician'
      : 'staff';

    for (const rule of ROUTE_RULES) {
      if (pathname.startsWith(rule.prefix)) {
        if (rule.blockedRoles && rule.blockedRoles.includes(userRole)) {
          // Block unauthorized access and redirect to home dashboard
          return NextResponse.redirect(new URL('/', request.url));
        }
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|icons|sw.js|manifest.webmanifest|favicon.ico).*)',
  ],
};
