"use client";

import { useActionState } from "react";

import { requestPasswordResetAction } from "@/actions/auth";
import { SubmitButton } from "@/components/submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { ActionState } from "@/lib/errors";

const INITIAL: ActionState = { status: "idle" };

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(
    requestPasswordResetAction,
    INITIAL,
  );

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state.status === "success" ? (
        <Alert variant="success">
          <AlertTitle>Check your inbox</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      {state.status === "error" ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to send the link</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <Field
        label="Work email"
        htmlFor="email"
        required
        error={state.fieldErrors?.email?.[0]}
      >
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={Boolean(state.fieldErrors?.email)}
          placeholder="you@company.com"
        />
      </Field>

      <SubmitButton className="w-full" pendingLabel="Sending…">
        Send reset link
      </SubmitButton>
    </form>
  );
}
