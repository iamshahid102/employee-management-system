"use client";

import { useActionState } from "react";

import { previewImportAction } from "@/actions/imports";
import { SubmitButton } from "@/components/submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/lib/errors";

const INITIAL: ActionState = { status: "idle" };

export function ImportUploadForm() {
  const [state, formAction] = useActionState(previewImportAction, INITIAL);

  return (
    <form action={formAction} className="space-y-4">
      {state.status === "error" ? (
        <Alert variant="destructive">
          <AlertTitle>The file could not be checked</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="file">CSV file</Label>
        <Input
          id="file"
          name="file"
          type="file"
          accept=".csv,text/csv"
          required
          aria-describedby="file-help"
        />
        <p id="file-help" className="text-xs text-muted-foreground">
          UTF-8, up to 1,000 rows and 2 MB. Nothing is written until you confirm
          the preview.
        </p>
      </div>

      <SubmitButton pendingLabel="Checking file…">Preview import</SubmitButton>
    </form>
  );
}
