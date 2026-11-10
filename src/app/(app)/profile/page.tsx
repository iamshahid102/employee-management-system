import type { Metadata } from "next";
import Link from "next/link";

import { DisplayNameForm } from "@/components/profile/display-name-form";
import { StatusBadge } from "@/components/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireOrganizationSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, type Employee } from "@/lib/types";

export const metadata: Metadata = { title: "My profile" };

export default async function ProfilePage() {
  const session = await requireOrganizationSession();
  const supabase = await createClient();

  const { data: employee } = await supabase
    .from("employees")
    .select(
      "id, first_name, last_name, employee_number, job_title, status, work_email, start_date",
    )
    .eq("user_id", session.user.id)
    .maybeSingle<Employee>();

  return (
    <div>
      <PageHeader
        title="My profile"
        description="Your account details and the employee record linked to you."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>
              {ROLE_LABELS[session.profile.role]} —{" "}
              {ROLE_DESCRIPTIONS[session.profile.role]}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid gap-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Email</dt>
                <dd>{session.profile.email}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Role</dt>
                <dd>{ROLE_LABELS[session.profile.role]}</dd>
              </div>
            </dl>
            <DisplayNameForm defaultName={session.profile.display_name} />
            <p className="text-xs text-muted-foreground">
              Roles and account activation are managed by an organization administrator.
              Use the password reset flow to change your password.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Employee record</CardTitle>
            <CardDescription>
              Records are linked by an administrator to your sign-in account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {employee ? (
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {employee.first_name} {employee.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {employee.employee_number} · {employee.job_title ?? "No job title"}
                    </p>
                  </div>
                  <StatusBadge status={employee.status} />
                </div>
                <Link
                  href={`/employees/${employee.id}`}
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  Open my record
                </Link>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No employee record is linked to your account yet. Ask an administrator to
                link one.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
