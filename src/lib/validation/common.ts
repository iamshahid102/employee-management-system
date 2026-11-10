import { z } from "zod";

/** YYYY-MM-DD with a real calendar date. */
export const dateString = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD")
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, "Enter a real calendar date");

export const optionalDateString = z
  .union([dateString, z.literal("")])
  .optional()
  .transform((value) => (value ? value : null));

/** Trimmed optional text collapsed to null. */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer`)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null));

/** Optional identifier from a select element; "" and "none" mean unset. */
export const optionalId = z
  .string()
  .optional()
  .transform((value) =>
    value && value !== "" && value !== "none" ? value : null,
  )
  .refine(
    (value) => value === null || z.uuid().safeParse(value).success,
    "Invalid selection",
  );

export const requiredId = z.uuid("Invalid identifier");
