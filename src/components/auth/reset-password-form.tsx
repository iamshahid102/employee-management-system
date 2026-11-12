"use client";

import { useActionState } from "react";

import { updatePasswordAction } from "@/actions/auth";
import { SubmitButton } from "@/components/submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Field } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import type { ActionState } from "@/lib/errors";

const INITIAL: ActionState = { status: "idle" };

export function ResetPasswordForm() {
  const [state, formAction] = useActionState(updatePasswordAction, INITIAL);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state.status === "error" ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to update the password</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <Field
        label="New password"
        htmlFor="password"
        required
        hint="At least 8 characters."
        error={state.fieldErrors?.password?.[0]}
      >
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          minLength={8}
          required
          aria-invalid={Boolean(state.fieldErrors?.password)}
        />
      </Field>

      <Field
        label="Confirm new password"
        htmlFor="confirmPassword"
        required
        error={state.fieldErrors?.confirmPassword?.[0]}
      >
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          autoComplete="new-password"
          minLength={8}
          required
          aria-invalid={Boolean(state.fieldErrors?.confirmPassword)}
        />
      </Field>

      <SubmitButton className="w-full" pendingLabel="Saving…">
        Update password
      </SubmitButton>
    </form>
  );
}
