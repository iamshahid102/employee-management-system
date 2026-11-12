"use client";

import { useActionState } from "react";

import { markAttendanceAction } from "@/actions/attendance";
import { SubmitButton } from "@/components/submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Field } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/lib/errors";
import {
  ATTENDANCE_STATUS_LABELS,
  SELF_ATTENDANCE_STATUSES,
  type AttendanceRecord,
} from "@/lib/types";

const INITIAL: ActionState = { status: "idle" };

/** Employees record or change their own attendance for today. */
export function MarkAttendanceForm({
  current,
}: {
  current: AttendanceRecord | null;
}) {
  const [state, formAction] = useActionState(markAttendanceAction, INITIAL);

  return (
    <form action={formAction} className="space-y-4">
      {state.status === "success" ? (
        <Alert variant="success">
          <AlertTitle>Saved</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      {state.status === "error" ? (
        <Alert variant="destructive">
          <AlertTitle>Attendance not saved</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <Field
        label="Status"
        htmlFor="status"
        required
        error={state.fieldErrors?.status?.[0]}
      >
        <Select name="status" defaultValue={current?.status ?? "present"}>
          <SelectTrigger id="status" className="w-full">
            <SelectValue placeholder="Choose status" />
          </SelectTrigger>
          <SelectContent>
            {SELF_ATTENDANCE_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {ATTENDANCE_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field
        label="Note"
        htmlFor="note"
        hint="Optional — for example “client site” or “sick leave”."
        error={state.fieldErrors?.note?.[0]}
      >
        <Textarea
          id="note"
          name="note"
          rows={2}
          maxLength={500}
          defaultValue={current?.note ?? ""}
        />
      </Field>

      <SubmitButton className="w-full" pendingLabel="Saving…">
        {current ? "Update today’s attendance" : "Mark attendance"}
      </SubmitButton>
    </form>
  );
}
