/**
 * Environment access. The application is intentionally tolerant of missing
 * Supabase configuration so that the build and the "not configured" screen
 * work before a project is connected.
 */
export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "",
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000").replace(
    /\/$/,
    "",
  ),
};

export function isSupabaseConfigured(): boolean {
  return Boolean(
    env.supabaseUrl.startsWith("http") && env.supabaseAnonKey.length > 20,
  );
}

/** Server-only. Never import the result into a client bundle. */
export function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not configured. Invitations require a server-side service role key.",
    );
  }
  return key;
}
