import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { EmployeeForm } from "@/components/employees/employee-form";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireOrganizationSession } from "@/lib/auth/session";
import { loadAccountOptions, loadDirectoryOptions } from "@/lib/queries/options";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Add employee" };

export default async function NewEmployeePage() {
  const session = await requireOrganizationSession();

  if (!session.permissions.can_manage_employees) {
    redirect("/employees");
  }

  const supabase = await createClient();
  const [{ departments, locations, managers }, accounts] = await Promise.all([
    loadDirectoryOptions(supabase),
    loadAccountOptions(supabase),
  ]);

  return (
    <div>
      <PageHeader
        title="Add employee"
        description="Create a complete employee record. Validation runs on the server as well as in the browser."
      />
      <Card>
        <CardContent>
          <EmployeeForm
            mode="create"
            departments={departments}
            locations={locations}
            managers={managers}
            accounts={accounts}
            fullAccess
          />
        </CardContent>
      </Card>
    </div>
  );
}
