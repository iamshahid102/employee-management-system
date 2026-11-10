import { parse } from "csv-parse/sync";
import { z } from "zod";

import { employeeSchema, type EmployeeInput } from "@/lib/validation/employee";
import { fieldErrors } from "@/lib/validation/form";
import { REQUIRED_COLUMNS, type TemplateColumn } from "@/lib/csv/template";
import type {
  EmploymentStatus,
  EmploymentType,
  ImportRowError,
  ImportRowPayload,
} from "@/lib/types";

export const MAX_CSV_BYTES = 2 * 1024 * 1024;
export const MAX_CSV_ROWS = 1000;

const HEADER_ALIASES: Record<string, TemplateColumn> = {
  "employee number": "employee_number",
  "employee no": "employee_number",
  "employee id": "employee_number",
  "emp no": "employee_number",
  "first name": "first_name",
  "given name": "first_name",
  "last name": "last_name",
  surname: "last_name",
  "work email": "work_email",
  email: "work_email",
  "job title": "job_title",
  title: "job_title",
  department: "department",
  "department name": "department",
  location: "location",
  "location name": "location",
  manager: "manager_employee_number",
  "manager employee number": "manager_employee_number",
  "manager id": "manager_employee_number",
  "employment type": "employment_type",
  type: "employment_type",
  status: "status",
  "start date": "start_date",
  "end date": "end_date",
  "personal email": "personal_email",
  phone: "phone",
  "phone number": "phone",
};

export function normalizeHeader(header: string): string {
  const key = header.trim().toLowerCase().replace(/[_\s-]+/g, " ").trim();
  return HEADER_ALIASES[key] ?? key.replace(/\s+/g, "_");
}

const TYPE_ALIASES: Record<string, EmploymentType> = {
  full_time: "full_time",
  "full time": "full_time",
  "full-time": "full_time",
  ft: "full_time",
  part_time: "part_time",
  "part time": "part_time",
  "part-time": "part_time",
  pt: "part_time",
  contract: "contract",
  contractor: "contract",
  intern: "intern",
  internship: "intern",
  temporary: "temporary",
  temp: "temporary",
};

const STATUS_ALIASES: Record<string, EmploymentStatus> = {
  active: "active",
  probation: "probation",
  "on leave": "on_leave",
  on_leave: "on_leave",
  leave: "on_leave",
  terminated: "terminated",
  inactive: "inactive",
  disabled: "inactive",
};

export function parseEmploymentType(value: string | undefined): EmploymentType {
  if (!value) return "full_time";
  return TYPE_ALIASES[value.trim().toLowerCase()] ?? "full_time";
}

export function parseEmploymentStatus(value: string | undefined): EmploymentStatus {
  if (!value) return "active";
  return STATUS_ALIASES[value.trim().toLowerCase()] ?? "active";
}

function isValidEmploymentType(value: string | undefined): boolean {
  if (!value) return true;
  return Boolean(TYPE_ALIASES[value.trim().toLowerCase()]);
}

function isValidEmploymentStatus(value: string | undefined): boolean {
  if (!value) return true;
  return Boolean(STATUS_ALIASES[value.trim().toLowerCase()]);
}

const FIELD_TO_COLUMN: Record<string, TemplateColumn> = {
  employeeNumber: "employee_number",
  firstName: "first_name",
  lastName: "last_name",
  workEmail: "work_email",
  personalEmail: "personal_email",
  phone: "phone",
  jobTitle: "job_title",
  departmentId: "department",
  locationId: "location",
  managerId: "manager_employee_number",
  employmentType: "employment_type",
  status: "status",
  startDate: "start_date",
  endDate: "end_date",
};

export type ReferenceOption = { id: string; name: string };

export interface CsvReferences {
  departments: ReferenceOption[];
  locations: ReferenceOption[];
  managers: Array<{ id: string; name: string; employeeNumber: string }>;
  existingEmployeeNumbers: Set<string>;
  existingWorkEmails: Set<string>;
}

export interface CsvValidationResult {
  totalRows: number;
  validRows: ImportRowPayload[];
  errors: ImportRowError[];
}

export class CsvImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CsvImportError";
  }
}

/** Parse the file into normalized, lower-cased header keyed records. */
export function parseCsvRecords(text: string): Array<Record<string, string>> {
  let records: Array<Record<string, string>>;

  try {
    records = parse(text, {
      bom: true,
      cast: false,
      columns: (header: string[]) => header.map(normalizeHeader),
      relax_column_count: true,
      skip_empty_lines: true,
      trim: true,
    }) as Array<Record<string, string>>;
  } catch (error) {
    throw new CsvImportError(
      `The file could not be parsed as CSV: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }

  if (records.length === 0) {
    throw new CsvImportError("The file contains no data rows.");
  }

  if (records.length > MAX_CSV_ROWS) {
    throw new CsvImportError(
      `The file has ${records.length} rows; the limit is ${MAX_CSV_ROWS}. Split it into smaller files.`,
    );
  }

  const headers = Object.keys(records[0] ?? {});
  const missing = REQUIRED_COLUMNS.filter(
    (column) => !headers.includes(column),
  );

  if (missing.length > 0) {
    throw new CsvImportError(
      `Missing required column${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}. Download the template to see the expected format.`,
    );
  }

  return records;
}

function findByName<T extends { name: string }>(
  options: T[],
  value: string,
): T | undefined {
  const needle = value.trim().toLowerCase();
  return options.find((option) => option.name.trim().toLowerCase() === needle);
}

/** Validate every row, resolve references and build the import payload. */
export function validateCsvRows(
  records: Array<Record<string, string>>,
  references: CsvReferences,
): CsvValidationResult {
  const validRows: ImportRowPayload[] = [];
  const errors: ImportRowError[] = [];
  const seenNumbers = new Map<string, number>();
  const seenEmails = new Map<string, number>();

  records.forEach((record, index) => {
    // +2 accounts for the header row and 1-based numbering.
    const rowNumber = index + 2;
    const rowErrors: ImportRowError[] = [];
    const pick = (key: TemplateColumn) => (record[key] ?? "").trim();

    const employeeNumber = pick("employee_number");
    const workEmail = pick("work_email").toLowerCase();
    const departmentName = pick("department");
    const locationName = pick("location");
    const managerNumber = pick("manager_employee_number");

    if (!isValidEmploymentType(record.employment_type)) {
      rowErrors.push({
        row: rowNumber,
        column: "employment_type",
        message: `Unknown employment type "${record.employment_type}".`,
      });
    }

    if (!isValidEmploymentStatus(record.status)) {
      rowErrors.push({
        row: rowNumber,
        column: "status",
        message: `Unknown status "${record.status}".`,
      });
    }

    let departmentId: string | null = null;
    if (departmentName) {
      const department = findByName(references.departments, departmentName);
      if (!department) {
        rowErrors.push({
          row: rowNumber,
          column: "department",
          message: `Department "${departmentName}" does not exist.`,
        });
      } else {
        departmentId = department.id;
      }
    }

    let locationId: string | null = null;
    if (locationName) {
      const location = findByName(references.locations, locationName);
      if (!location) {
        rowErrors.push({
          row: rowNumber,
          column: "location",
          message: `Location "${locationName}" does not exist.`,
        });
      } else {
        locationId = location.id;
      }
    }

    let managerId: string | null = null;
    if (managerNumber) {
      const manager = references.managers.find(
        (candidate) =>
          candidate.employeeNumber.trim().toLowerCase() ===
          managerNumber.trim().toLowerCase(),
      );
      if (!manager) {
        rowErrors.push({
          row: rowNumber,
          column: "manager_employee_number",
          message: `Manager "${managerNumber}" was not found among existing employees.`,
        });
      } else {
        managerId = manager.id;
      }
    }

    if (employeeNumber) {
      const key = employeeNumber.toLowerCase();
      if (seenNumbers.has(key)) {
        rowErrors.push({
          row: rowNumber,
          column: "employee_number",
          message: `Employee number "${employeeNumber}" is duplicated in the file (row ${seenNumbers.get(key)}).`,
        });
      } else {
        seenNumbers.set(key, rowNumber);
      }

      if (references.existingEmployeeNumbers.has(key)) {
        rowErrors.push({
          row: rowNumber,
          column: "employee_number",
          message: `Employee number "${employeeNumber}" already exists in this organization.`,
        });
      }
    }

    if (workEmail) {
      if (seenEmails.has(workEmail)) {
        rowErrors.push({
          row: rowNumber,
          column: "work_email",
          message: `Work email "${workEmail}" is duplicated in the file (row ${seenEmails.get(workEmail)}).`,
        });
      } else {
        seenEmails.set(workEmail, rowNumber);
      }

      if (references.existingWorkEmails.has(workEmail)) {
        rowErrors.push({
          row: rowNumber,
          column: "work_email",
          message: `Work email "${workEmail}" is already used by another employee.`,
        });
      }
    }

    const candidate = {
      employeeNumber,
      firstName: pick("first_name"),
      lastName: pick("last_name"),
      workEmail,
      personalEmail: pick("personal_email"),
      phone: pick("phone"),
      jobTitle: pick("job_title"),
      departmentId: departmentId ?? "",
      locationId: locationId ?? "",
      managerId: managerId ?? "",
      employmentType: parseEmploymentType(record.employment_type),
      status: parseEmploymentStatus(record.status),
      startDate: pick("start_date"),
      endDate: pick("end_date"),
    };

    const parsed = employeeSchema.safeParse(candidate);
    if (!parsed.success) {
      for (const [field, messages] of Object.entries(
        fieldErrors(parsed.error as z.ZodError),
      )) {
        for (const message of messages) {
          rowErrors.push({
            row: rowNumber,
            column:
              field === "form" ? undefined : (FIELD_TO_COLUMN[field] ?? field),
            message,
          });
        }
      }
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
      return;
    }

    const data = parsed.data as EmployeeInput;

    validRows.push({
      row: rowNumber,
      employee_number: data.employeeNumber,
      first_name: data.firstName,
      last_name: data.lastName,
      work_email: data.workEmail,
      personal_email: data.personalEmail,
      phone: data.phone,
      job_title: data.jobTitle,
      department_id: data.departmentId,
      department_name: departmentName || null,
      location_id: data.locationId,
      location_name: locationName || null,
      manager_id: data.managerId,
      manager_employee_number: managerNumber || null,
      employment_type: data.employmentType,
      status: data.status,
      start_date: data.startDate,
      end_date: data.endDate,
    });
  });

  return { totalRows: records.length, validRows, errors };
}


