"use client";

import { useActionState } from "react";

import { updateDisplayNameAction } from "@/actions/profile";
import { SubmitButton } from "@/components/submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { ActionState } from "@/lib/errors";

const INITIAL: ActionState = { status: "idle" };

export function DisplayNameForm({ defaultName }: { defaultName: string }) {
  const [state, formAction] = useActionState(updateDisplayNameAction, INITIAL);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.status === "success" ? (
        <Alert variant="success">
          <AlertTitle>Saved</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      {state.status === "error" ? (
        <Alert variant="destructive">
          <AlertTitle>Could not update the name</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <Field
        label="Display name"
        htmlFor="displayName"
        required
        error={state.fieldErrors?.displayName?.[0]}
      >
        <Input
          id="displayName"
          name="displayName"
          defaultValue={defaultName}
          required
          maxLength={120}
          aria-invalid={Boolean(state.fieldErrors?.displayName)}
        />
      </Field>

      <SubmitButton pendingLabel="Saving…">Save display name</SubmitButton>
    </form>
  );
}
