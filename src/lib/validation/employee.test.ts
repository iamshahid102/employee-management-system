import { describe, expect, it } from "vitest";

import { employeeSchema } from "@/lib/validation/employee";

const valid = {
  employeeNumber: "EMP-001",
  firstName: "Ayesha",
  lastName: "Khan",
  workEmail: "Ayesha.Khan@Example.com",
  personalEmail: "",
  phone: "",
  jobTitle: "",
  departmentId: "",
  locationId: "",
  managerId: "",
  employmentType: "full_time",
  status: "active",
  startDate: "2024-01-08",
  endDate: "",
};

describe("employeeSchema", () => {
  it("accepts a complete, minimal record and normalises optional fields", () => {
    const result = employeeSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.workEmail).toBe("ayesha.khan@example.com");
      expect(result.data.personalEmail).toBeNull();
      expect(result.data.departmentId).toBeNull();
      expect(result.data.endDate).toBeNull();
    }
  });

  it("trims whitespace from text fields", () => {
    const result = employeeSchema.safeParse({
      ...valid,
      firstName: "  Ayesha  ",
      lastName: " Khan ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.firstName).toBe("Ayesha");
      expect(result.data.lastName).toBe("Khan");
    }
  });

  it("rejects an invalid work email", () => {
    const result = employeeSchema.safeParse({ ...valid, workEmail: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects an end date before the start date", () => {
    const result = employeeSchema.safeParse({
      ...valid,
      startDate: "2024-05-01",
      endDate: "2024-04-30",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) => issue.path.includes("endDate")),
      ).toBe(true);
    }
  });

  it("rejects impossible calendar dates", () => {
    const result = employeeSchema.safeParse({ ...valid, startDate: "2024-02-31" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid department identifier", () => {
    const result = employeeSchema.safeParse({ ...valid, departmentId: "dept-1" });
    expect(result.success).toBe(false);
  });

  it("requires a first name", () => {
    const result = employeeSchema.safeParse({ ...valid, firstName: "   " });
    expect(result.success).toBe(false);
  });
});
