import { z } from "zod";

import {
  dateString,
  optionalDateString,
  optionalId,
  optionalText,
} from "@/lib/validation/common";

export const EMPLOYMENT_TYPES = [
  "full_time",
  "part_time",
  "contract",
  "intern",
  "temporary",
] as const;

export const EMPLOYMENT_STATUSES = [
  "active",
  "probation",
  "on_leave",
  "terminated",
  "inactive",
] as const;

/** Statuses that still count as part of the workforce. */
export const CURRENT_STATUSES = ["active", "probation", "on_leave"] as const;

export const employeeSchema = z
  .object({
    employeeNumber: z
      .string()
      .trim()
      .min(1, "Employee number is required")
      .max(40, "Employee number is too long"),
    firstName: z
      .string()
      .trim()
      .min(1, "First name is required")
      .max(80, "First name is too long"),
    lastName: z
      .string()
      .trim()
      .min(1, "Last name is required")
      .max(80, "Last name is too long"),
    workEmail: z
      .string()
      .trim()
      .min(1, "Work email is required")
      .pipe(z.email("Enter a valid email address"))
      .transform((value) => value.toLowerCase()),
    personalEmail: z
      .string()
      .trim()
      .optional()
      .transform((value) => (value ? value.toLowerCase() : null))
      .refine(
        (value) => value === null || z.email().safeParse(value).success,
        "Enter a valid personal email address",
      ),
    phone: optionalText(40),
    jobTitle: optionalText(120),
    departmentId: optionalId,
    locationId: optionalId,
    managerId: optionalId,
    userId: optionalId,
    employmentType: z.enum(EMPLOYMENT_TYPES, {
      message: "Select an employment type",
    }),
    status: z.enum(EMPLOYMENT_STATUSES, { message: "Select a status" }),
    startDate: dateString,
    endDate: optionalDateString,
  })
  .refine(
    (value) =>
      !value.endDate || value.endDate >= value.startDate,
    {
      message: "The end date cannot be before the start date",
      path: ["endDate"],
    },
  );

export type EmployeeInput = z.infer<typeof employeeSchema>;

/** Subset a manager is allowed to change for a direct report. */
export const managerEmployeeSchema = z.object({
  jobTitle: optionalText(120),
  departmentId: optionalId,
  locationId: optionalId,
});

export const deactivateEmployeeSchema = z.object({
  employeeId: z.uuid(),
});
