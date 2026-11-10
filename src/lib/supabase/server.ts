import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { env, isSupabaseConfigured } from "@/lib/env";

/**
 * Request-scoped Supabase client for Server Components, Server Actions and
 * Route Handlers. Cookies are read/written through the Next.js cookie store.
 */
export async function createClient() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  const cookieStore = await cookies();

  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component render: cookies are read-only and
          // the proxy refresh already persisted the session.
        }
      },
    },
  });
}
