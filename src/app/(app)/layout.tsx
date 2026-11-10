import { AppShell } from "@/components/layout/app-shell";
import { requireOrganizationSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function ApplicationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireOrganizationSession();
  const supabase = await createClient();

  const { data: organization } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", session.profile.organization_id as string)
    .maybeSingle();

  return (
    <AppShell
      organizationName={organization?.name ?? "Organization"}
      user={{
        displayName: session.profile.display_name,
        email: session.profile.email,
        role: session.profile.role,
      }}
      permissions={session.permissions}
    >
      {children}
    </AppShell>
  );
}
