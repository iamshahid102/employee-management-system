"use client";

import { useActionState } from "react";

import { createOrganizationAction } from "@/actions/organization";
import { SubmitButton } from "@/components/submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { ActionState } from "@/lib/errors";

const INITIAL: ActionState = { status: "idle" };

export function SetupForm({ defaultTimezone }: { defaultTimezone: string }) {
  const [state, formAction] = useActionState(createOrganizationAction, INITIAL);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state.status === "error" ? (
        <Alert variant="destructive">
          <AlertTitle>Could not create the organization</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <Field
        label="Organization name"
        htmlFor="name"
        required
        error={state.fieldErrors?.name?.[0]}
      >
        <Input
          id="name"
          name="name"
          required
          maxLength={120}
          autoComplete="organization"
          placeholder="Acme Industries"
          aria-invalid={Boolean(state.fieldErrors?.name)}
        />
      </Field>

      <Field
        label="Primary timezone"
        htmlFor="timezone"
        required
        hint="Used for date and anniversary reporting."
        error={state.fieldErrors?.timezone?.[0]}
      >
        <Input
          id="timezone"
          name="timezone"
          required
          defaultValue={defaultTimezone}
          maxLength={64}
          placeholder="UTC"
          aria-invalid={Boolean(state.fieldErrors?.timezone)}
        />
      </Field>

      <SubmitButton className="w-full" pendingLabel="Creating…">
        Create organization
      </SubmitButton>
    </form>
  );
}
