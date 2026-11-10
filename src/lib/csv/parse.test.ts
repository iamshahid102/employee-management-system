import { describe, expect, it } from "vitest";

import {
  CsvImportError,
  normalizeHeader,
  parseCsvRecords,
  validateCsvRows,
  type CsvReferences,
} from "@/lib/csv/parse";

const HEADER =
  "employee_number,first_name,last_name,work_email,job_title,department,location,manager_employee_number,employment_type,status,start_date,end_date";

const DEPARTMENT_ID = "11111111-1111-4111-8111-111111111111";
const LOCATION_ID = "22222222-2222-4222-8222-222222222222";
const MANAGER_ID = "33333333-3333-4333-8333-333333333333";

const references: CsvReferences = {
  departments: [{ id: DEPARTMENT_ID, name: "Engineering" }],
  locations: [{ id: LOCATION_ID, name: "Remote" }],
  managers: [
    { id: MANAGER_ID, name: "Daniel Okoro", employeeNumber: "EMP-003" },
  ],
  existingEmployeeNumbers: new Set(["emp-001"]),
  existingWorkEmails: new Set(["taken@example.com"]),
};

function recordsFor(...lines: string[]) {
  return parseCsvRecords([HEADER, ...lines].join("\n"));
}

describe("normalizeHeader", () => {
  it("maps human readable headers to template columns", () => {
    expect(normalizeHeader("Employee Number")).toBe("employee_number");
    expect(normalizeHeader(" Work Email ")).toBe("work_email");
    expect(normalizeHeader("Manager")).toBe("manager_employee_number");
    expect(normalizeHeader("Start Date")).toBe("start_date");
  });
});

describe("parseCsvRecords", () => {
  it("parses quoted values with commas", () => {
    const records = recordsFor(
      'EMP-010,Mei,Chen,mei@example.com,"Engineer, Senior",Engineering,Remote,,full_time,active,2024-01-08,',
    );
    expect(records[0].job_title).toBe("Engineer, Senior");
  });

  it("rejects files without the required columns", () => {
    expect(() => parseCsvRecords("first_name,last_name\nA,B")).toThrow(
      CsvImportError,
    );
  });

  it("rejects empty files", () => {
    expect(() => parseCsvRecords(HEADER)).toThrow(/no data rows/i);
  });
});

describe("validateCsvRows", () => {
  it("builds a payload with resolved references", () => {
    const result = validateCsvRows(
      recordsFor(
        "EMP-010,Mei,Chen,mei@example.com,Engineer,Engineering,Remote,EMP-003,full_time,active,2024-01-08,",
      ),
      references,
    );

    expect(result.errors).toEqual([]);
    expect(result.validRows).toHaveLength(1);
    expect(result.validRows[0]).toMatchObject({
      employee_number: "EMP-010",
      department_id: DEPARTMENT_ID,
      location_id: LOCATION_ID,
      manager_id: MANAGER_ID,
      employment_type: "full_time",
      status: "active",
      start_date: "2024-01-08",
    });
  });

  it("flags duplicate employee numbers inside the file", () => {
    const result = validateCsvRows(
      recordsFor(
        "EMP-010,Mei,Chen,mei@example.com,,,,,,active,2024-01-08,",
        "EMP-010,Tom,Becker,tom@example.com,,,,,,active,2024-02-01,",
      ),
      references,
    );

    expect(result.validRows).toHaveLength(1);
    expect(result.errors.some((error) => error.row === 3)).toBe(true);
    expect(result.errors[0].message).toMatch(/duplicated in the file/i);
  });

  it("flags existing employees and emails", () => {
    const result = validateCsvRows(
      recordsFor(
        "EMP-001,Mei,Chen,taken@example.com,,,,,,active,2024-01-08,",
      ),
      references,
    );

    expect(result.validRows).toHaveLength(0);
    expect(result.errors.map((error) => error.column)).toEqual(
      expect.arrayContaining(["employee_number", "work_email"]),
    );
  });

  it("flags unknown departments and managers", () => {
    const result = validateCsvRows(
      recordsFor(
        "EMP-011,Mei,Chen,mei@example.com,,Unknown Dept,Remote,EMP-999,full_time,active,2024-01-08,",
      ),
      references,
    );

    const columns = result.errors.map((error) => error.column);
    expect(columns).toContain("department");
    expect(columns).toContain("manager_employee_number");
  });

  it("flags unknown enum values and bad dates", () => {
    const result = validateCsvRows(
      recordsFor(
        "EMP-012,Mei,Chen,mei@example.com,,,,,whenever,active,2024-02-31,",
      ),
      references,
    );

    const columns = result.errors.map((error) => error.column);
    expect(columns).toContain("employment_type");
    expect(columns).toContain("start_date");
  });

  it("flags an end date before the start date", () => {
    const result = validateCsvRows(
      recordsFor(
        "EMP-013,Mei,Chen,mei@example.com,,,,,full_time,active,2024-05-01,2024-04-01",
      ),
      references,
    );

    expect(result.validRows).toHaveLength(0);
    expect(result.errors.some((error) => /end date/i.test(error.message))).toBe(true);
  });
});
