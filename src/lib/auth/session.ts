import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { cache } from "react";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { NO_PERMISSIONS, type Permissions, type Profile } from "@/lib/types";

export type CurrentSession = {
  user: User;
  profile: Profile;
  permissions: Permissions;
};

const PROFILE_COLUMNS =
  "id, organization_id, email, display_name, role, is_active, created_at";

/**
 * Resolve the signed-in user, their profile and their permission summary.
 * Returns null when there is no valid, active session.
 *
 * Cached per request so a layout and its page do not repeat the same auth and
 * permission round trips during one navigation.
 */
export const getSession = cache(async (): Promise<CurrentSession | null> => {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: profileData }, { data: permissionData }] = await Promise.all([
    supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", user.id).maybeSingle(),
    supabase.rpc("current_permissions"),
  ]);

  const profile = profileData as Profile | null;
  if (!profile || !profile.is_active) return null;

  const permissions = {
    ...NO_PERMISSIONS,
    ...((permissionData as Permissions | null) ?? {}),
    role: profile.organization_id ? (permissionData as Permissions | null)?.role ?? profile.role : "none",
    organization_id: profile.organization_id,
  } satisfies Permissions;

  return { user, profile, permissions };
});

/** Session for pages/actions that must be signed in. */
export async function requireSession(): Promise<CurrentSession> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/** Session for pages that additionally require an onboarded organization. */
export async function requireOrganizationSession(): Promise<CurrentSession> {
  const session = await requireSession();
  if (!session.profile.organization_id) redirect("/setup");
  return session;
}

/** Route guard for privileged pages. */
export async function requirePermission(
  permission: keyof Pick<
    Permissions,
    | "can_manage_organization"
    | "can_manage_users"
    | "can_manage_employees"
    | "can_import"
    | "can_export"
    | "can_view_audit"
  >,
): Promise<CurrentSession> {
  const session = await requireOrganizationSession();
  if (!session.permissions[permission]) redirect("/dashboard?denied=1");
  return session;
}

export function isAdmin(permissions: Permissions): boolean {
  return permissions.role === "admin";
}

export function canManageEmployees(permissions: Permissions): boolean {
  return permissions.can_manage_employees;
}
