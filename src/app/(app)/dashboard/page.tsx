import { Building2, CalendarClock, MapPin, UserCheck, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

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
import { ROLE_LABELS, type DashboardSummary } from "@/lib/types";
import { formatDate, pluralize } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

const EMPTY: DashboardSummary = {
  headcount: 0,
  active: 0,
  probation: 0,
  on_leave: 0,
  inactive: 0,
  departments: 0,
  locations: 0,
  anniversaries: [],
  new_starters: [],
};

function Stat({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: number;
  hint?: string;
  icon: typeof Users;
}) {
  return (
    <Card className="gap-2 py-4">
      <CardContent className="flex items-start justify-between gap-3 px-4">
        <div className="space-y-1">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {label}
          </p>
          <p className="text-2xl font-semibold tabular-nums">{value}</p>
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon aria-hidden className="size-4" />
        </span>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const session = await requireOrganizationSession();
  const supabase = await createClient();

  const { data } = await supabase.rpc("dashboard_summary", {
    p_window_days: 30,
  });

  const summary: DashboardSummary = {
    ...EMPTY,
    ...((data as Partial<DashboardSummary> | null) ?? {}),
  };

  const firstName = session.profile.display_name.split(" ")[0] || "there";

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description={`You are signed in as ${ROLE_LABELS[session.profile.role]}. Figures below reflect only the records you are allowed to see.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Headcount"
          value={summary.headcount}
          hint={`${summary.active} active · ${summary.probation} probation · ${summary.on_leave} on leave`}
          icon={Users}
        />
        <Stat label="Active employees" value={summary.active} icon={UserCheck} />
        <Stat label="Departments" value={summary.departments} icon={Building2} />
        <Stat label="Locations" value={summary.locations} icon={MapPin} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock aria-hidden className="size-4 text-primary" />
              Upcoming work anniversaries
            </CardTitle>
            <CardDescription>Next 30 days.</CardDescription>
          </CardHeader>
          <CardContent>
            {summary.anniversaries.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No anniversaries in the next 30 days.
              </p>
            ) : (
              <ul className="divide-y">
                {summary.anniversaries.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/employees/${entry.id}`}
                        className="truncate text-sm font-medium hover:text-primary"
                      >
                        {entry.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {entry.days_away === 0
                          ? "Today"
                          : `In ${pluralize(entry.days_away, "day")}`}
                      </p>
                    </div>
                    <span className="text-xs whitespace-nowrap text-muted-foreground">
                      {formatDate(entry.date)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>New starters</CardTitle>
            <CardDescription>Joined in the last 30 days.</CardDescription>
          </CardHeader>
          <CardContent>
            {summary.new_starters.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nobody has started in the last 30 days.
              </p>
            ) : (
              <ul className="divide-y">
                {summary.new_starters.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/employees/${entry.id}`}
                        className="truncate text-sm font-medium hover:text-primary"
                      >
                        {entry.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {entry.days_ago === 0
                          ? "Started today"
                          : `${pluralize(entry.days_ago, "day")} ago`}
                      </p>
                    </div>
                    <span className="text-xs whitespace-nowrap text-muted-foreground">
                      {formatDate(entry.start_date)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {summary.inactive > 0 ? (
        <p className="mt-6 text-xs text-muted-foreground">
          {pluralize(summary.inactive, "record")} inactive or terminated, retained for
          historical reference.
        </p>
      ) : null}
    </div>
  );
}
