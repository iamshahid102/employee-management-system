import { z } from "zod";

import { optionalId, optionalText } from "@/lib/validation/common";

export const organizationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(120, "Name is too long"),
  timezone: z.string().trim().min(1).max(64).default("UTC"),
});

export const departmentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Department name is required")
    .max(120, "Department name is too long"),
  parentId: optionalId,
  isActive: z.boolean().default(true),
});

export const locationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Location name is required")
    .max(120, "Location name is too long"),
  address: optionalText(240),
  timezone: optionalText(64),
  isActive: z.boolean().default(true),
});
