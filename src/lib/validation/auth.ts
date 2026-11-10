import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().trim().pipe(z.email("Enter a valid email address")),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().pipe(z.email("Enter a valid email address")),
});

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Use at least 8 characters")
      .max(72, "Password is too long"),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const inviteUserSchema = z.object({
  email: z.string().trim().pipe(z.email("Enter a valid email address")),
  displayName: z
    .string()
    .trim()
    .min(1, "Full name is required")
    .max(120, "Name is too long"),
  role: z.enum(["admin", "hr", "manager", "employee"]),
});

export const roleChangeSchema = z.object({
  profileId: z.uuid(),
  role: z.enum(["admin", "hr", "manager", "employee"]),
});

export const profileActiveSchema = z.object({
  profileId: z.uuid(),
  isActive: z.boolean(),
});

export const displayNameSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Display name is required")
    .max(120, "Display name is too long"),
});
