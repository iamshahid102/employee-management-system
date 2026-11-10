import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { EmployeeForm } from "@/components/employees/employee-form";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireOrganizationSession } from "@/lib/auth/session";
import { loadDirectoryOptions } from "@/lib/queries/options";
import { createClient } from "@/lib/supabase/server";
import type { Employee, EmployeeContact } from "@/lib/types";

export const metadata: Metadata = { title: "Edit employee" };

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireOrganizationSession();
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("employees")
    .select(
      "id, organization_id, employee_number, first_name, last_name, work_email, job_title, department_id, location_id, manager_id, user_id, employment_type, status, start_date, end_date, created_at, updated_at",
    )
    .eq("id", id)
    .maybeSingle<Employee>();

  if (!data) notFound();

  const fullAccess = session.permissions.can_manage_employees;
  const isDirectReport =
    session.permissions.role === "manager" &&
    data.manager_id === session.permissions.employee_id;

  if (!fullAccess && !isDirectReport) {
    redirect(`/employees/${id}`);
  }

  const options = await loadDirectoryOptions(supabase);

  let contact: EmployeeContact | null = null;
  if (fullAccess) {
    const { data: contactData } = await supabase.rpc("get_employee_contact", {
      p_employee_id: id,
    });
    const row = Array.isArray(contactData) ? contactData[0] : contactData;
    contact = (row as EmployeeContact | undefined) ?? null;
  }

  return (
    <div>
      <PageHeader
        title={`Edit ${data.first_name} ${data.last_name}`}
        description="Server-side validation and database rules apply to every change."
      />
      <Card>
        <CardContent>
          <EmployeeForm
            mode="edit"
            employee={data}
            contact={contact}
            departments={options.departments}
            locations={options.locations}
            managers={options.managers.filter((manager) => manager.id !== data.id)}
            fullAccess={fullAccess}
          />
        </CardContent>
      </Card>
    </div>
  );
}
