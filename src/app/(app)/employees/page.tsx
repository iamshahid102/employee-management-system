import { Download, Plus, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmployeeTable, type EmployeeRow } from "@/components/employees/employee-table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { requireOrganizationSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { EMPLOYEE_COLUMNS, type Employee } from "@/lib/types";
import { pluralize } from "@/lib/utils";

export const metadata: Metadata = { title: "Employees" };

const PAGE_SIZE = 20;

const SORTS = [
  { value: "name", label: "Name (A–Z)" },
  { value: "newest", label: "Recently added" },
  { value: "start_date", label: "Start date (newest)" },
] as const;

const STATUSES = [
  { value: "active", label: "Active" },
  { value: "probation", label: "Probation" },
  { value: "on_leave", label: "On leave" },
  { value: "terminated", label: "Terminated" },
  { value: "inactive", label: "Inactive" },
] as const;

function clean(value: string | undefined, max = 80): string {
  return (value ?? "").trim().slice(0, max);
}

/** Radix selects submit "all" for the unfiltered option; never send that to SQL. */
function filterValue(value: string | undefined, max = 40): string {
  const cleaned = clean(value, max);
  return cleaned === "all" || cleaned === "none" ? "" : cleaned;
}

function buildHref(params: Record<string, string | undefined>, page: number) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value && key !== "page") search.set(key, value);
  }
  search.set("page", String(page));
  return `/employees?${search.toString()}`;
}

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireOrganizationSession();
  const supabase = await createClient();
  const raw = await searchParams;

  const q = clean(typeof raw.q === "string" ? raw.q : undefined);
  const departmentId = filterValue(
    typeof raw.department === "string" ? raw.department : undefined,
  );
  const locationId = filterValue(
    typeof raw.location === "string" ? raw.location : undefined,
  );
  const status = filterValue(
    typeof raw.status === "string" ? raw.status : undefined,
    20,
  );
  const sort = SORTS.some((option) => option.value === raw.sort) ? String(raw.sort) : "name";
  const page = Math.max(1, Number.parseInt(String(raw.page ?? "1"), 10) || 1);

  const [departmentResult, locationResult] = await Promise.all([
    supabase.from("departments").select("id, name").order("name"),
    supabase.from("locations").select("id, name").order("name"),
  ]);

  const departments = (departmentResult.data ?? []) as Array<{ id: string; name: string }>;
  const locations = (locationResult.data ?? []) as Array<{ id: string; name: string }>;

  let query = supabase
    .from("employees")
    .select(EMPLOYEE_COLUMNS, { count: "exact" });

  if (q) {
    const term = q.replace(/[%,()]/g, " ").trim();
    if (term) {
      query = query.or(
        `first_name.ilike.%${term}%,last_name.ilike.%${term}%,work_email.ilike.%${term}%,employee_number.ilike.%${term}%`,
      );
    }
  }
  if (departmentId) query = query.eq("department_id", departmentId);
  if (locationId) query = query.eq("location_id", locationId);
  if (status && STATUSES.some((option) => option.value === status)) {
    query = query.eq("status", status);
  }

  if (sort === "newest") {
    query = query.order("created_at", { ascending: false });
  } else if (sort === "start_date") {
    query = query.order("start_date", { ascending: false });
  } else {
    query = query.order("last_name").order("first_name");
  }

  const from = (page - 1) * PAGE_SIZE;
  const { data, count, error } = await query.range(from, from + PAGE_SIZE - 1);

  const employees = (data ?? []) as unknown as Employee[];
  const departmentNames = new Map(departments.map((row) => [row.id, row.name]));
  const locationNames = new Map(locations.map((row) => [row.id, row.name]));

  const rows: EmployeeRow[] = employees.map((employee) => ({
    ...employee,
    departmentName: employee.department_id
      ? (departmentNames.get(employee.department_id) ?? null)
      : null,
    locationName: employee.location_id
      ? (locationNames.get(employee.location_id) ?? null)
      : null,
  }));

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hrefParams = {
    q,
    department: departmentId,
    location: locationId,
    status,
    sort,
  };
  const hasFilters = Boolean(q || departmentId || locationId || status);

  return (
    <div>
      <PageHeader
        title="Employees"
        description="Search, filter and maintain employee records. Access is limited to the people your role allows you to see."
        actions={
          <>
            {session.permissions.can_export ? (
              <Button asChild variant="outline">
                <a
                  href={`/api/employees/export?${new URLSearchParams({
                    q,
                    department: departmentId,
                    location: locationId,
                    status,
                  }).toString()}`}
                  download
                >
                  <Download aria-hidden />
                  Export CSV
                </a>
              </Button>
            ) : null}
            {session.permissions.can_manage_employees ? (
              <Button asChild>
                <Link href="/employees/new">
                  <Plus aria-hidden />
                  Add employee
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      <form className="mb-4 grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <label htmlFor="q" className="sr-only">
            Search employees
          </label>
          <Input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Name, email or number"
            className="pl-9"
          />
        </div>

        <div>
          <label htmlFor="department" className="sr-only">
            Department
          </label>
          <Select name="department" defaultValue={departmentId || "all"}>
            <SelectTrigger id="department" className="w-full">
              <SelectValue placeholder="All departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {departments.map((department) => (
                <SelectItem key={department.id} value={department.id}>
                  {department.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label htmlFor="location" className="sr-only">
            Location
          </label>
          <Select name="location" defaultValue={locationId || "all"}>
            <SelectTrigger id="location" className="w-full">
              <SelectValue placeholder="All locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All locations</SelectItem>
              {locations.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label htmlFor="status" className="sr-only">
            Status
          </label>
          <Select name="status" defaultValue={status || "all"}>
            <SelectTrigger id="status" className="w-full">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label htmlFor="sort" className="sr-only">
            Sort
          </label>
          <Select name="sort" defaultValue={sort}>
            <SelectTrigger id="sort" className="w-full">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              {SORTS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-5">
          <Button type="submit" size="sm">
            Apply filters
          </Button>
          {hasFilters ? (
            <Button asChild variant="ghost" size="sm">
              <Link href="/employees">Clear</Link>
            </Button>
          ) : null}
          <p className="ml-auto text-xs text-muted-foreground">
            {pluralize(total, "employee")}
          </p>
        </div>
      </form>

      {error ? (
        <EmptyState
          title="The directory could not be loaded"
          description="Please refresh the page. If the problem persists, contact your administrator."
        />
      ) : rows.length === 0 ? (
        <EmptyState
          title={hasFilters ? "No employees match these filters" : "No employees yet"}
          description={
            hasFilters
              ? "Try a different search term or clear the filters."
              : "Add your first employee, or import a CSV from the import page."
          }
          action={
            session.permissions.can_manage_employees ? (
              <Button asChild size="sm">
                <Link href="/employees/new">Add employee</Link>
              </Button>
            ) : null
          }
        />
      ) : (
        <>
          <EmployeeTable rows={rows} />

          {totalPages > 1 ? (
            <nav
              aria-label="Pagination"
              className="mt-4 flex items-center justify-between gap-3"
            >
              <p className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                {page > 1 ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={buildHref(hrefParams, page - 1)}>Previous</Link>
                  </Button>
                ) : null}
                {page < totalPages ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={buildHref(hrefParams, page + 1)}>Next</Link>
                  </Button>
                ) : null}
              </div>
            </nav>
          ) : null}
        </>
      )}
    </div>
  );
}
