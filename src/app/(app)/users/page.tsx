import type { Metadata } from "next";

import { InviteUserDialog } from "@/components/users/invite-user-dialog";
import { UserRoleControls } from "@/components/users/user-role-controls";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, type Profile } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Users & roles" };

export default async function UsersPage() {
  const session = await requirePermission("can_manage_users");
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select("id, organization_id, email, display_name, role, is_active, created_at")
    .order("display_name");

  const profiles = (data ?? []) as Profile[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users & roles"
        description="Invite colleagues and decide what each person is allowed to do. Roles are enforced by database policies, not just by the interface."
        actions={<InviteUserDialog />}
      />

      <Card>
        <CardHeader>
          <CardTitle>People with access</CardTitle>
          <CardDescription>
            {profiles.length} account{profiles.length === 1 ? "" : "s"} in this organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {profiles.length === 0 ? (
            <EmptyState
              title="No accounts yet"
              description="Invite your first colleague to give them access."
            />
          ) : (
            <ul className="divide-y">
              {profiles.map((profile) => (
                <li
                  key={profile.id}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{profile.display_name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {profile.email} · joined {formatDate(profile.created_at)}
                    </p>
                  </div>
                  <UserRoleControls
                    profile={profile}
                    isSelf={profile.id === session.user.id}
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What each role can do</CardTitle>
          <CardDescription>
            Choose the least privilege that lets someone do their job.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 sm:grid-cols-2">
            {Object.entries(ROLE_DESCRIPTIONS).map(([role, description]) => (
              <div key={role} className="rounded-md border p-3">
                <dt className="text-sm font-medium">
                  {ROLE_LABELS[role as keyof typeof ROLE_LABELS]}
                </dt>
                <dd className="text-xs text-muted-foreground">{description}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
