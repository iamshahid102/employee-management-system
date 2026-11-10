import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { env, isSupabaseConfigured } from "@/lib/env";

/**
 * Next.js 16 proxy (formerly middleware).
 *
 * Responsibilities are deliberately narrow:
 *   * refresh the Supabase session cookie,
 *   * fast, optimistic routing decisions.
 * Authoritative authorization always happens in the database (RLS) and in
 * server-side page/action guards.
 */

const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password"];

function isPublicAsset(pathname: string) {
  return (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/icons/") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/sw.js"
  );
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isPublicAsset(pathname) || !isSupabaseConfigured()) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthPath =
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/auth/") ||
    pathname === "/setup";

  const redirectWithCookies = (target: string) => {
    const url = request.nextUrl.clone();
    url.pathname = target;
    url.search = "";
    const redirectResponse = NextResponse.redirect(url);
    // Preserve refreshed auth cookies on the redirect.
    for (const cookie of response.cookies.getAll()) {
      redirectResponse.cookies.set(cookie);
    }
    return redirectResponse;
  };

  if (!user) {
    if (isAuthPath) return response;

    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !profile.is_active) {
    // Authenticated but not provisioned or deactivated: clear the session and
    // send the user back to the sign-in screen with an explanation.
    await supabase.auth.signOut();
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Account is not active" }, { status: 403 });
    }
    if (pathname === "/login") return response;
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "?error=account_inactive";
    const redirectResponse = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll()) {
      redirectResponse.cookies.set(cookie);
    }
    return redirectResponse;
  }

  const hasOrganization = Boolean(profile.organization_id);

  if (!hasOrganization && pathname !== "/setup") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Organization setup is required" },
        { status: 409 },
      );
    }
    return redirectWithCookies("/setup");
  }

  if (hasOrganization && pathname === "/setup") {
    return redirectWithCookies("/dashboard");
  }

  if (hasOrganization && PUBLIC_PATHS.includes(pathname)) {
    return redirectWithCookies("/dashboard");
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|manifest.webmanifest|sw.js).*)"],
};
