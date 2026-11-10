import type { Metadata } from "next";

import { DepartmentManager } from "@/components/organization/department-manager";
import { LocationManager } from "@/components/organization/location-manager";
import { OrganizationSettingsForm } from "@/components/organization/organization-settings-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Department, WorkLocation } from "@/lib/types";

export const metadata: Metadata = { title: "Organization" };

export default async function OrganizationPage() {
  const session = await requirePermission("can_manage_organization");
  const supabase = await createClient();
  const organizationId = session.profile.organization_id as string;

  const [organizationResult, departmentResult, locationResult] = await Promise.all([
    supabase
      .from("organizations")
      .select("name, timezone")
      .eq("id", organizationId)
      .maybeSingle(),
    supabase
      .from("departments")
      .select("id, organization_id, name, parent_id, is_active, created_at")
      .order("name"),
    supabase
      .from("locations")
      .select("id, organization_id, name, address, timezone, is_active, created_at")
      .order("name"),
  ]);

  const organization = organizationResult.data as {
    name: string;
    timezone: string;
  } | null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organization"
        description="Manage the settings, departments and locations that structure your employee records."
      />

      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>
            The organization name appears in the navigation and reports.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrganizationSettingsForm
            name={organization?.name ?? ""}
            timezone={organization?.timezone ?? "UTC"}
            canEdit={session.permissions.role === "admin"}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Departments</CardTitle>
          <CardDescription>
            Group employees by function. Departments can be nested and deactivated.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DepartmentManager
            departments={(departmentResult.data ?? []) as Department[]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Locations</CardTitle>
          <CardDescription>
            Offices, sites and remote regions available when assigning employees.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LocationManager locations={(locationResult.data ?? []) as WorkLocation[]} />
        </CardContent>
      </Card>
    </div>
  );
}
