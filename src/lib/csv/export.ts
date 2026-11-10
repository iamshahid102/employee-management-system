import { toCsv } from "@/lib/csv/escape";
import type { Employee, EmploymentStatus, EmploymentType } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export const EXPORT_COLUMNS = [
  { key: "employee_number", label: "Employee number" },
  { key: "first_name", label: "First name" },
  { key: "last_name", label: "Last name" },
  { key: "work_email", label: "Work email" },
  { key: "job_title", label: "Job title" },
  { key: "department", label: "Department" },
  { key: "location", label: "Location" },
  { key: "manager", label: "Manager" },
  { key: "employment_type", label: "Employment type" },
  { key: "status", label: "Status" },
  { key: "start_date", label: "Start date" },
  { key: "end_date", label: "End date" },
] as const;

export type ExportColumnKey = (typeof EXPORT_COLUMNS)[number]["key"];

export function parseExportColumns(value: string | null): ExportColumnKey[] {
  if (!value) return EXPORT_COLUMNS.map((column) => column.key);

  const requested = new Set(value.split(",").map((entry) => entry.trim()));
  const selected = EXPORT_COLUMNS.filter((column) =>
    requested.has(column.key),
  ).map((column) => column.key);

  return selected.length > 0
    ? selected
    : EXPORT_COLUMNS.map((column) => column.key);
}

type ExportRow = Employee & {
  departmentName?: string | null;
  locationName?: string | null;
  managerName?: string | null;
};

const VALUE_GETTERS: Record<ExportColumnKey, (row: ExportRow) => string> = {
  employee_number: (row) => row.employee_number,
  first_name: (row) => row.first_name,
  last_name: (row) => row.last_name,
  work_email: (row) => row.work_email,
  job_title: (row) => row.job_title ?? "",
  department: (row) => row.departmentName ?? "",
  location: (row) => row.locationName ?? "",
  manager: (row) => row.managerName ?? "",
  employment_type: (row) => row.employment_type,
  status: (row) => row.status,
  start_date: (row) => row.start_date,
  end_date: (row) => row.end_date ?? "",
};

export function buildEmployeeCsv(
  rows: ExportRow[],
  columns: ExportColumnKey[],
): string {
  const selected = EXPORT_COLUMNS.filter((column) =>
    columns.includes(column.key),
  );

  const body = rows.map((row) =>
    selected.map((column) => VALUE_GETTERS[column.key](row)),
  );

  return toCsv(
    selected.map((column) => column.label),
    body,
  );
}

export function exportFilename(): string {
  return `employees-${new Date().toISOString().slice(0, 10)}.csv`;
}

export function readableEnum(value: EmploymentType | EmploymentStatus): string {
  return value.replace(/_/g, " ");
}

export const EXPORT_DATE_LABEL = formatDate;
