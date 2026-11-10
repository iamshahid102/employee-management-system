import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { AuditLogEntry, Profile } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Audit log" };

function describe(entry: AuditLogEntry): string {
  const summary = entry.summary ?? {};

  if (Array.isArray(summary.fields)) {
    return `Changed: ${(summary.fields as string[]).join(", ")}`;
  }

  if (typeof summary.from === "string" && typeof summary.to === "string") {
    return `${summary.from} → ${summary.to}`;
  }

  if (typeof summary.filename === "string") {
    return `File: ${summary.filename} · ${summary.created_rows ?? 0} created, ${summary.skipped_rows ?? 0} skipped, ${summary.failed_rows ?? 0} rejected`;
  }

  if (typeof summary.name === "string") {
    return String(summary.name);
  }

  if (typeof summary.employee_number === "string") {
    return `Employee ${summary.employee_number}`;
  }

  return "Recorded change";
}

function actionVariant(action: string) {
  if (action.endsWith(".created") || action.endsWith(".activated")) return "success";
  if (action.endsWith(".deactivated") || action.includes("failed")) return "destructive";
  if (action.includes("role")) return "warning";
  return "muted";
}

export default async function AuditPage() {
  await requirePermission("can_view_audit");
  const supabase = await createClient();

  const [{ data: logData }, { data: profileData }] = await Promise.all([
    supabase
      .from("audit_logs")
      .select("id, organization_id, actor_id, action, entity_type, entity_id, summary, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("profiles").select("id, display_name, email"),
  ]);

  const entries = (logData ?? []) as AuditLogEntry[];
  const actors = new Map(
    ((profileData ?? []) as Array<Pick<Profile, "id" | "display_name" | "email">>).map(
      (profile) => [profile.id, profile.display_name || profile.email],
    ),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit log"
        description="The most recent 100 recorded changes to employee records, roles and imports. Summaries never include personal values."
      />

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>
            Entries are written by database triggers, so they cannot be skipped by the
            application.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <EmptyState
              title="No recorded activity yet"
              description="Creating or changing an employee record will appear here."
            />
          ) : (
            <ul className="divide-y">
              {entries.map((entry) => (
                <li key={entry.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={actionVariant(entry.action)}>{entry.action}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {entry.entity_type}
                      </span>
                    </div>
                    <p className="text-sm">{describe(entry)}</p>
                  </div>
                  <div className="text-xs text-muted-foreground sm:text-right">
                    <p>
                      {entry.actor_id
                        ? (actors.get(entry.actor_id) ?? "System")
                        : "System"}
                    </p>
                    <p>{formatDateTime(entry.created_at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
