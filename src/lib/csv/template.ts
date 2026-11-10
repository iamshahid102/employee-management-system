import { toCsv } from "@/lib/csv/escape";

export const TEMPLATE_COLUMNS = [
  "employee_number",
  "first_name",
  "last_name",
  "work_email",
  "job_title",
  "department",
  "location",
  "manager_employee_number",
  "employment_type",
  "status",
  "start_date",
  "end_date",
  "personal_email",
  "phone",
] as const;

export type TemplateColumn = (typeof TEMPLATE_COLUMNS)[number];

export const REQUIRED_COLUMNS: TemplateColumn[] = [
  "employee_number",
  "first_name",
  "last_name",
  "work_email",
  "start_date",
];

export const COLUMN_HELP: Record<TemplateColumn, string> = {
  employee_number: "Required. Unique within the organization, e.g. EMP-007.",
  first_name: "Required.",
  last_name: "Required.",
  work_email: "Required. Unique work email address.",
  job_title: "Optional free text.",
  department: "Optional. Must match an existing department name.",
  location: "Optional. Must match an existing location name.",
  manager_employee_number:
    "Optional. Employee number of an existing employee in this organization.",
  employment_type:
    "Optional. full_time | part_time | contract | intern | temporary (default full_time).",
  status: "Optional. active | probation | on_leave | terminated | inactive (default active).",
  start_date: "Required. YYYY-MM-DD.",
  end_date: "Optional. YYYY-MM-DD, must not be before the start date.",
  personal_email: "Optional. Restricted to administrators, HR and the employee.",
  phone: "Optional. Restricted to administrators, HR and the employee.",
};

const EXAMPLE_ROWS = [
  [
    "EMP-101",
    "Jordan",
    "Lee",
    "jordan.lee@example.com",
    "Product Designer",
    "Engineering",
    "Remote",
    "EMP-003",
    "full_time",
    "active",
    "2026-01-12",
    "",
    "",
    "+44 20 0000 0000",
  ],
];

export function buildTemplateCsv(): string {
  return toCsv([...TEMPLATE_COLUMNS], EXAMPLE_ROWS);
}

export function buildTemplateReadme(): string {
  return TEMPLATE_COLUMNS.map(
    (column) => `${column}: ${COLUMN_HELP[column]}`,
  ).join("\r\n");
}
