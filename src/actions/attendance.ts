"use server";

import { revalidatePath } from "next/cache";

import { requireOrganizationSession } from "@/lib/auth/session";
import { toErrorMessage, type ActionState } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import {
  markAttendanceSchema,
  setAttendanceSchema,
} from "@/lib/validation/attendance";
import { fieldErrors, firstError, formString } from "@/lib/validation/form";

/** An employee records or changes their own attendance for today. */
export async function markAttendanceAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireOrganizationSession();

  if (!session.permissions.can_mark_attendance) {
    return {
      status: "error",
      message:
        "Your account is not linked to an employee record, so attendance cannot be recorded.",
    };
  }

  const parsed = markAttendanceSchema.safeParse({
    status: formString(formData, "status"),
    note: formString(formData, "note"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: firstError(parsed.error),
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_own_attendance", {
    p_status: parsed.data.status,
    p_note: parsed.data.note,
  });

  if (error) {
    return {
      status: "error",
      message: toErrorMessage(error, "Your attendance could not be recorded."),
    };
  }

  revalidatePath("/attendance");
  revalidatePath("/dashboard");

  return { status: "success", message: "Attendance recorded for today." };
}

/** Administrators and HR record or correct attendance for any employee. */
export async function setAttendanceAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireOrganizationSession();

  if (!session.permissions.can_manage_attendance) {
    return {
      status: "error",
      message: "Only administrators and HR can record attendance for others.",
    };
  }

  const parsed = setAttendanceSchema.safeParse({
    employeeId: formString(formData, "employeeId"),
    workDate: formString(formData, "workDate"),
    status: formString(formData, "status"),
    note: formString(formData, "note"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: firstError(parsed.error),
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_employee_attendance", {
    p_employee_id: parsed.data.employeeId,
    p_work_date: parsed.data.workDate,
    p_status: parsed.data.status,
    p_note: parsed.data.note,
  });

  if (error) {
    return {
      status: "error",
      message: toErrorMessage(error, "The attendance record could not be saved."),
    };
  }

  revalidatePath("/attendance");

  return { status: "success", message: "Attendance record saved." };
}
