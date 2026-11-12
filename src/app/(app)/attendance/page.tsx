import { CalendarCheck, CalendarDays } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AttendanceStaffForm } from "@/components/attendance/attendance-staff-form";
import { AttendanceStatusBadge } from "@/components/attendance/attendance-status-badge";
import { AttendanceTable, type AttendanceRow } from "@/components/attendance/attendance-table";
import { MarkAttendanceForm } from "@/components/attendance/mark-attendance-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { requireOrganizationSession } from "@/lib/auth/session";
import { addDays, parseIsoDate, toIsoDate } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import {
  ATTENDANCE_COLUMNS,
  ATTENDANCE_STATUS_LABELS,
  type AttendanceRecord,
  type AttendanceStatus,
  type Employee,
} from "@/lib/types";
import { formatDate, pluralize } from "@/lib/utils";

export const metadata: Metadata = { title: "Attendance" };

const WINDOWS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
] as const;

const STATUSES: AttendanceStatus[] = ["present", "remote", "on_leave", "absent"];

type PersonSummary = Pick<
  Employee,
  "id" | "first_name" | "last_name" | "employee_number"
>;

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireOrganizationSession();
  const permissions = session.permissions;

  if (!permissions.can_mark_attendance && !permissions.can_view_team_attendance) {
    redirect("/dashboard?denied=1");
  }

  const supabase = await createClient();
  const raw = await searchParams;

  const { data: todayData } = await supabase.rpc("org_today");
  const today =
    typeof todayData === "string" && /^\d{4}-\d{2}-\d{2}$/.test(todayData)
      ? todayData.slice(0, 10)
      : toIsoDate(new Date());

  const requestedDays = String(raw.days ?? "");
  const windowDays = WINDOWS.some((option) => option.value === requestedDays)
    ? Number(requestedDays)
    : 30;
  const requestedStatus = String(raw.status ?? "");
  const status = STATUSES.includes(requestedStatus as AttendanceStatus)
    ? (requestedStatus as AttendanceStatus)
    : null;
  const fromDate = toIsoDate(addDays(parseIsoDate(today), -(windowDays - 1)));

  let recordsQuery = supabase
    .from("attendance_records")
    .select(ATTENDANCE_COLUMNS)
    .gte("work_date", fromDate)
    .lte("work_date", today)
    .order("work_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(300);

  if (status) recordsQuery = recordsQuery.eq("status", status);

  const ownRecordQuery =
    permissions.can_mark_attendance && permissions.employee_id
      ? supabase
          .from("attendance_records")
          .select(ATTENDANCE_COLUMNS)
          .eq("employee_id", permissions.employee_id)
          .eq("work_date", today)
          .maybeSingle()
      : Promise.resolve({ data: null });

  const staffOptionsQuery = permissions.can_manage_attendance
    ? supabase
        .from("employees")
        .select("id, first_name, last_name, employee_number")
        .in("status", ["active", "probation", "on_leave"])
        .order("first_name")
        .order("last_name")
        .limit(500)
    : Promise.resolve({ data: [] as PersonSummary[] });

  const [ownResult, todayResult, recordsResult, staffResult] = await Promise.all([
    ownRecordQuery,
    supabase.from("attendance_records").select("status").eq("work_date", today),
    recordsQuery,
    staffOptionsQuery,
  ]);

  const ownRecord = (ownResult.data as AttendanceRecord | null) ?? null;
  const records = (recordsResult.data ?? []) as unknown as AttendanceRecord[];

  const todayCounts: Record<AttendanceStatus, number> = {
    present: 0,
    remote: 0,
    on_leave: 0,
    absent: 0,
  };
  for (const row of (todayResult.data ?? []) as Array<{ status: AttendanceStatus }>) {
    todayCounts[row.status] += 1;
  }
  const markedToday = Object.values(todayCounts).reduce((sum, value) => sum + value, 0);

  const employeeIds = Array.from(new Set(records.map((row) => row.employee_id)));
  const peopleResult =
    employeeIds.length > 0
      ? await supabase
          .from("employees")
          .select("id, first_name, last_name, employee_number")
          .in("id", employeeIds)
      : { data: [] as PersonSummary[] };

  const people = new Map(
    ((peopleResult.data ?? []) as PersonSummary[]).map((person) => [person.id, person]),
  );

  const rows: AttendanceRow[] = records.map((record) => {
    const person = people.get(record.employee_id);
    return {
      ...record,
      employeeName: person
        ? `${person.first_name} ${person.last_name}`
        : "Unknown employee",
      employeeNumber: person?.employee_number ?? "—",
    };
  });

  const staffOptions = ((staffResult.data ?? []) as PersonSummary[]).map((person) => ({
    id: person.id,
    name: `${person.first_name} ${person.last_name} (${person.employee_number})`,
  }));

  const hasFilters = Boolean(status) || windowDays !== 30;

  return (
    <div>
      <PageHeader
        title="Attendance"
        description={
          permissions.can_manage_attendance
            ? "Record and review daily attendance for everyone in the organization. Employees can also mark their own attendance."
            : permissions.role === "manager"
              ? "Mark your own attendance and review the records of the people you manage."
              : "Mark your own attendance and see your recent records."
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarCheck aria-hidden className="size-4 text-primary" />
              Today
            </CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-2">
              <span>{formatDate(today)}</span>
              {ownRecord ? (
                <AttendanceStatusBadge status={ownRecord.status} />
              ) : (
                <span className="text-xs text-muted-foreground">
                  Not marked yet
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {permissions.can_mark_attendance ? (
              <>
                <MarkAttendanceForm current={ownRecord} />
                <p className="mt-3 text-xs text-muted-foreground">
                  You can change today’s entry until midnight in the organization’s
                  timezone. Earlier days are locked — ask HR to correct them.
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Your sign-in account is not linked to an employee record, so there is
                nothing to mark. Ask an administrator to link your account from the
                employee profile.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays aria-hidden className="size-4 text-primary" />
              Today at a glance
            </CardTitle>
            <CardDescription>
              {pluralize(markedToday, "record")} visible to your role.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {STATUSES.map((value) => (
                <li
                  key={value}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <AttendanceStatusBadge status={value} />
                  <span className="text-sm font-semibold tabular-nums">
                    {todayCounts[value]}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              {permissions.can_manage_attendance
                ? "Counts cover the whole organization."
                : "Counts cover only the people your role can see."}
            </p>
          </CardContent>
        </Card>
      </div>

      {permissions.can_manage_attendance ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Record or correct attendance</CardTitle>
            <CardDescription>
              Use this to backfill a missed day or fix a status on someone’s behalf.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AttendanceStaffForm employees={staffOptions} today={today} />
          </CardContent>
        </Card>
      ) : null}

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Attendance records</CardTitle>
          <CardDescription>
            {recordsSummary(windowDays, rows.length)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="status" className="sr-only">
                Status
              </label>
              <Select name="status" defaultValue={status ?? "all"}>
                <SelectTrigger id="status" className="w-full">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {STATUSES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {ATTENDANCE_STATUS_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label htmlFor="days" className="sr-only">
                Period
              </label>
              <Select name="days" defaultValue={String(windowDays)}>
                <SelectTrigger id="days" className="w-full">
                  <SelectValue placeholder="Period" />
                </SelectTrigger>
                <SelectContent>
                  {WINDOWS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 sm:col-span-2">
              <Button type="submit" size="sm">
                Apply filters
              </Button>
              {hasFilters ? (
                <Button asChild variant="ghost" size="sm">
                  <Link href="/attendance">Clear</Link>
                </Button>
              ) : null}
              <p className="ml-auto text-xs text-muted-foreground">
                {pluralize(rows.length, "record")}
              </p>
            </div>
          </form>

          {rows.length === 0 ? (
            <EmptyState
              title={
                hasFilters
                  ? "No records match these filters"
                  : "No attendance recorded yet"
              }
              description={
                hasFilters
                  ? "Try a different status or a longer period."
                  : "Once attendance is marked, entries appear here."
              }
            />
          ) : (
            <AttendanceTable rows={rows} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function recordsSummary(days: number, count: number) {
  const window = WINDOWS.find((option) => Number(option.value) === days);
  return `${count === 0 ? "No entries" : pluralize(count, "entry", "entries")} in the ${
    window ? window.label.toLowerCase() : `last ${days} days`
  }.`;
}
