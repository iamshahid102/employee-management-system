"use client";

import { useActionState } from "react";

import { updateOrganizationAction } from "@/actions/organization";
import { SubmitButton } from "@/components/submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { ActionState } from "@/lib/errors";

const INITIAL: ActionState = { status: "idle" };

export function OrganizationSettingsForm({
  name,
  timezone,
  canEdit,
}: {
  name: string;
  timezone: string;
  canEdit: boolean;
}) {
  const [state, formAction] = useActionState(updateOrganizationAction, INITIAL);

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
          <AlertTitle>Could not save</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Organization name" htmlFor="org-name" required error={state.fieldErrors?.name?.[0]}>
          <Input
            id="org-name"
            name="name"
            defaultValue={name}
            required
            maxLength={120}
            disabled={!canEdit}
            aria-invalid={Boolean(state.fieldErrors?.name)}
          />
        </Field>

        <Field label="Primary timezone" htmlFor="org-timezone" required>
          <Input
            id="org-timezone"
            name="timezone"
            defaultValue={timezone}
            required
            maxLength={64}
            disabled={!canEdit}
          />
        </Field>
      </div>

      {canEdit ? (
        <SubmitButton pendingLabel="Saving…">Save settings</SubmitButton>
      ) : (
        <p className="text-xs text-muted-foreground">
          Only an organization administrator can change these settings.
        </p>
      )}
    </form>
  );
}
