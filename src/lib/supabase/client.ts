"use client";

import { createBrowserClient } from "@supabase/ssr";

import { env } from "@/lib/env";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

/** Browser Supabase client. Only the public anon key is ever used here. */
export function createClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
  }
  return browserClient;
}
