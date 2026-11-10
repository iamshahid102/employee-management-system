import { getSession } from "@/lib/auth/session";
import {
  buildEmployeeCsv,
  exportFilename,
  parseExportColumns,
} from "@/lib/csv/export";
import { createClient } from "@/lib/supabase/server";
import { EMPLOYEE_COLUMNS, type Employee } from "@/lib/types";

const MAX_EXPORT_ROWS = 5000;

export async function GET(request: Request) {
  const session = await getSession();

  if (!session?.permissions.can_export || !session.profile.organization_id) {
    return new Response("Forbidden", { status: 403 });
  }

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  const filter = (name: string) => {
    const value = (url.searchParams.get(name) ?? "").trim();
    return value === "all" || value === "none" ? "" : value;
  };
  const departmentId = filter("department");
  const locationId = filter("location");
  const status = filter("status");
  const columns = parseExportColumns(url.searchParams.get("columns"));

  const supabase = await createClient();

  let query = supabase
    .from("employees")
    .select(EMPLOYEE_COLUMNS, { count: "exact" })
    .order("last_name")
    .order("first_name")
    .limit(MAX_EXPORT_ROWS + 1);

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
  if (status) query = query.eq("status", status);

  const { data, error } = await query;

  if (error) {
    return new Response("The export could not be generated.", { status: 500 });
  }

  const employees = (data ?? []) as unknown as Employee[];

  if (employees.length > MAX_EXPORT_ROWS) {
    return new Response(
      `This export would exceed ${MAX_EXPORT_ROWS} rows. Narrow the filters and try again.`,
      { status: 400 },
    );
  }

  const [departmentResult, locationResult] = await Promise.all([
    supabase.from("departments").select("id, name"),
    supabase.from("locations").select("id, name"),
  ]);

  const departmentNames = new Map(
    (departmentResult.data ?? []).map((row) => [row.id, row.name]),
  );
  const locationNames = new Map(
    (locationResult.data ?? []).map((row) => [row.id, row.name]),
  );
  const employeeNames = new Map(
    employees.map((employee) => [
      employee.id,
      `${employee.first_name} ${employee.last_name}`,
    ]),
  );

  const csv = buildEmployeeCsv(
    employees.map((employee) => ({
      ...employee,
      departmentName: employee.department_id
        ? (departmentNames.get(employee.department_id) ?? null)
        : null,
      locationName: employee.location_id
        ? (locationNames.get(employee.location_id) ?? null)
        : null,
      managerName: employee.manager_id
        ? (employeeNames.get(employee.manager_id) ?? null)
        : null,
    })),
    columns,
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFilename()}"`,
      "Cache-Control": "no-store",
    },
  });
}
