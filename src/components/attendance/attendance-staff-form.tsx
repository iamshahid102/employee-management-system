"use client";

import { useActionState } from "react";

import { setAttendanceAction } from "@/actions/attendance";
import { SubmitButton } from "@/components/submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
  type AttendanceStatus,
} from "@/lib/types";

const INITIAL: ActionState = { status: "idle" };

const STATUSES: AttendanceStatus[] = ["present", "remote", "on_leave", "absent"];

/** Administrators and HR record or correct attendance for any employee. */
export function AttendanceStaffForm({
  employees,
  today,
}: {
  employees: Array<{ id: string; name: string }>;
  today: string;
}) {
  const [state, formAction] = useActionState(setAttendanceAction, INITIAL);

  if (employees.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        There are no employees in this organization yet.
      </p>
    );
  }

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      {state.status === "success" ? (
        <Alert variant="success" className="sm:col-span-2">
          <AlertTitle>Saved</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      {state.status === "error" ? (
        <Alert variant="destructive" className="sm:col-span-2">
          <AlertTitle>Attendance not saved</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <Field
        label="Employee"
        htmlFor="employeeId"
        required
        className="sm:col-span-2"
        error={state.fieldErrors?.employeeId?.[0]}
      >
        <Select name="employeeId" defaultValue={employees[0]?.id}>
          <SelectTrigger id="employeeId" className="w-full">
            <SelectValue placeholder="Choose an employee" />
          </SelectTrigger>
          <SelectContent>
            {employees.map((employee) => (
              <SelectItem key={employee.id} value={employee.id}>
                {employee.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field
        label="Date"
        htmlFor="workDate"
        required
        error={state.fieldErrors?.workDate?.[0]}
      >
        <Input
          id="workDate"
          name="workDate"
          type="date"
          defaultValue={today}
          max={today}
          required
          aria-invalid={Boolean(state.fieldErrors?.workDate)}
        />
      </Field>

      <Field
        label="Status"
        htmlFor="status"
        required
        error={state.fieldErrors?.status?.[0]}
      >
        <Select name="status" defaultValue="present">
          <SelectTrigger id="status" className="w-full">
            <SelectValue placeholder="Choose status" />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {ATTENDANCE_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Note" htmlFor="note" className="sm:col-span-2" hint="Optional.">
        <Textarea id="note" name="note" rows={2} maxLength={500} />
      </Field>

      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <SubmitButton pendingLabel="Saving…">Save record</SubmitButton>
        <p className="text-xs text-muted-foreground">
          Saving the same employee and date again replaces the existing entry.
        </p>
      </div>
    </form>
  );
}
