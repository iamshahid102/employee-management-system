import { ArrowLeft, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DeactivateDialog } from "@/components/employees/deactivate-dialog";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireOrganizationSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  EMPLOYEE_COLUMNS,
  EMPLOYMENT_TYPE_LABELS,
  ROLE_LABELS,
  type Employee,
  type EmployeeContact,
} from "@/lib/types";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Employee" };

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="text-sm">{value ?? "—"}</dd>
    </div>
  );
}

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireOrganizationSession();
  const { id } = await params;
  const supabase = await createClient();

  const { data: employeeData } = await supabase
    .from("employees")
    .select(EMPLOYEE_COLUMNS)
    .eq("id", id)
    .maybeSingle<Employee>();

  if (!employeeData) {
    notFound();
  }

  const employee = employeeData;

  const [departmentResult, locationResult, managerResult, historyResult] =
    await Promise.all([
      employee.department_id
        ? supabase.from("departments").select("name").eq("id", employee.department_id).maybeSingle()
        : Promise.resolve({ data: null }),
      employee.location_id
        ? supabase.from("locations").select("name").eq("id", employee.location_id).maybeSingle()
        : Promise.resolve({ data: null }),
      employee.manager_id
        ? supabase
            .from("employees")
            .select("id, first_name, last_name")
            .eq("id", employee.manager_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("employment_history")
        .select("id, effective_date, job_title, status, note, created_at")
        .eq("employee_id", id)
        .order("effective_date", { ascending: false })
        .limit(10),
    ]);

  const canReadContact =
    session.permissions.can_manage_employees || employee.user_id === session.user.id;

  let contact: EmployeeContact | null = null;
  if (canReadContact) {
    const { data } = await supabase.rpc("get_employee_contact", {
      p_employee_id: id,
    });
    const row = Array.isArray(data) ? data[0] : data;
    contact = (row as EmployeeContact | undefined) ?? null;
  }

  const canEdit =
    session.permissions.can_manage_employees ||
    (session.permissions.role === "manager" &&
      employee.manager_id === session.permissions.employee_id);

  const isInactive = employee.status === "inactive" || employee.status === "terminated";
  const manager = managerResult.data as {
    id: string;
    first_name: string;
    last_name: string;
  } | null;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Link
            href="/employees"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft aria-hidden className="size-4" />
            Back to employees
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {employee.first_name} {employee.last_name}
            </h1>
            <StatusBadge status={employee.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {employee.employee_number} · {employee.work_email}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canEdit ? (
            <Button asChild variant="outline">
              <Link href={`/employees/${employee.id}/edit`}>
                <Pencil aria-hidden />
                Edit
              </Link>
            </Button>
          ) : null}
          {session.permissions.can_manage_employees && !isInactive ? (
            <DeactivateDialog
              employeeId={employee.id}
              employeeName={`${employee.first_name} ${employee.last_name}`}
            />
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Employment</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Detail label="Job title" value={employee.job_title} />
              <Detail
                label="Department"
                value={(departmentResult.data as { name: string } | null)?.name}
              />
              <Detail
                label="Location"
                value={(locationResult.data as { name: string } | null)?.name}
              />
              <Detail
                label="Manager"
                value={
                  manager ? (
                    <Link
                      href={`/employees/${manager.id}`}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {manager.first_name} {manager.last_name}
                    </Link>
                  ) : null
                }
              />
              <Detail
                label="Employment type"
                value={EMPLOYMENT_TYPE_LABELS[employee.employment_type]}
              />
              <Detail label="Start date" value={formatDate(employee.start_date)} />
              <Detail label="End date" value={formatDate(employee.end_date)} />
              <Detail
                label="Portal access"
                value={employee.user_id ? <Badge variant="success">Linked</Badge> : "Not linked"}
              />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Personal contact</CardTitle>
          </CardHeader>
          <CardContent>
            {canReadContact ? (
              <dl className="space-y-4">
                <Detail label="Personal email" value={contact?.personal_email} />
                <Detail label="Phone" value={contact?.phone} />
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">
                Contact details are restricted to administrators, HR and the employee.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Employment history</CardTitle>
          </CardHeader>
          <CardContent>
            {(historyResult.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No recorded changes yet. Job, department, location, manager and status
                changes appear here.
              </p>
            ) : (
              <ul className="divide-y">
                {(historyResult.data ?? []).map((entry) => (
                  <li key={entry.id} className="flex items-start justify-between gap-4 py-3">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{entry.job_title ?? "Update"}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.note ?? "Recorded change"}
                        {entry.status ? ` · ${entry.status}` : ""}
                      </p>
                    </div>
                    <span className="text-xs whitespace-nowrap text-muted-foreground">
                      {formatDate(entry.effective_date)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Signed in as {ROLE_LABELS[session.profile.role]}. Every change to this record is
        written to the audit log.
      </p>
    </div>
  );
}
