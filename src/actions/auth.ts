"use server";

import { redirect } from "next/navigation";

import { env } from "@/lib/env";
import { toErrorMessage, type ActionState } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
} from "@/lib/validation/auth";
import { fieldErrors, firstError, formString } from "@/lib/validation/form";

const INITIAL: ActionState = { status: "idle" };

export async function signInAction(
  _previous: ActionState = INITIAL,
  formData: FormData,
): Promise<ActionState> {
  const parsed = signInSchema.safeParse({
    email: formString(formData, "email"),
    password: formString(formData, "password"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: firstError(parsed.error),
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return {
      status: "error",
      message:
        error.message.toLowerCase().includes("invalid")
          ? "Incorrect email or password."
          : toErrorMessage(error, "Unable to sign in right now."),
    };
  }

  const next = formString(formData, "next");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
}

export async function requestPasswordResetAction(
  _previous: ActionState = INITIAL,
  formData: FormData,
): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formString(formData, "email"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: firstError(parsed.error),
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${env.siteUrl}/auth/callback?next=/reset-password`,
  });

  // Always the same response to avoid account enumeration.
  return {
    status: "success",
    message:
      "If an account exists for that email, a password reset link is on its way.",
  };
}

export async function updatePasswordAction(
  _previous: ActionState = INITIAL,
  formData: FormData,
): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formString(formData, "password"),
    confirmPassword: formString(formData, "confirmPassword"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: firstError(parsed.error),
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return {
      status: "error",
      message: toErrorMessage(error, "Unable to update the password."),
    };
  }

  redirect("/dashboard?password_updated=1");
}
