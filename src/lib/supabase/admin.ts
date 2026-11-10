import { createClient } from "@supabase/supabase-js";

import { env, getServiceRoleKey } from "@/lib/env";

/**
 * Service-role client. Bypasses RLS and must only be used in trusted server
 * code (user invitations). Importing this module into a client component is a
 * build-time error in practice because the key is not exposed to the browser.
 */
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("The service-role client must never run in the browser.");
  }

  return createClient(env.supabaseUrl, getServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
