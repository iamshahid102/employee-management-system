"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireOrganizationSession } from "@/lib/auth/session";
import { toErrorMessage, type ActionState } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { todayUtc, toIsoDate } from "@/lib/dates";
import {
  employeeSchema,
  managerEmployeeSchema,
} from "@/lib/validation/employee";
import {
  fieldErrors,
  firstError,
  formBoolean,
  formString,
} from "@/lib/validation/form";
import { EMPLOYEE_COLUMNS, type Employee } from "@/lib/types";

function rawEmployee(formData: FormData) {
  return {
    employeeNumber: formString(formData, "employeeNumber"),
    firstName: formString(formData, "firstName"),
    lastName: formString(formData, "lastName"),
    workEmail: formString(formData, "workEmail"),
    personalEmail: formString(formData, "personalEmail"),
    phone: formString(formData, "phone"),
    jobTitle: formString(formData, "jobTitle"),
    departmentId: formString(formData, "departmentId"),
    locationId: formString(formData, "locationId"),
    managerId: formString(formData, "managerId"),
    employmentType: formString(formData, "employmentType"),
    status: formString(formData, "status"),
    startDate: formString(formData, "startDate"),
    endDate: formString(formData, "endDate"),
  };
}

export async function createEmployeeAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireOrganizationSession();

  if (!session.permissions.can_manage_employees) {
    return { status: "error", message: "You cannot add employees." };
  }

  const parsed = employeeSchema.safeParse(rawEmployee(formData));

  if (!parsed.success) {
    return {
      status: "error",
      message: firstError(parsed.error),
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const data = parsed.data;
  const supabase = await createClient();

  const { data: created, error } = await supabase
    .from("employees")
    .insert({
      organization_id: session.profile.organization_id as string,
      employee_number: data.employeeNumber,
      first_name: data.firstName,
      last_name: data.lastName,
      work_email: data.workEmail,
      personal_email: data.personalEmail,
      phone: data.phone,
      job_title: data.jobTitle,
      department_id: data.departmentId,
      location_id: data.locationId,
      manager_id: data.managerId,
      employment_type: data.employmentType,
      status: data.status,
      start_date: data.startDate,
      end_date: data.endDate,
      created_by: session.user.id,
      updated_by: session.user.id,
    })
    .select("id")
    .single();

  if (error || !created) {
    return {
      status: "error",
      message: toErrorMessage(error, "The employee could not be created."),
    };
  }

  revalidatePath("/employees");
  revalidatePath("/dashboard");
  redirect(`/employees/${created.id}`);
}

export async function updateEmployeeAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireOrganizationSession();
  const employeeId = formString(formData, "employeeId");

  if (!employeeId) {
    return { status: "error", message: "Missing employee reference." };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("employees")
    .select(EMPLOYEE_COLUMNS)
    .eq("id", employeeId)
    .maybeSingle<Employee>();

  if (!existing) {
    return { status: "error", message: "Employee not found." };
  }

  const canManageFull = session.permissions.can_manage_employees;
  const isDirectReport =
    session.permissions.role === "manager" &&
    existing.manager_id === session.permissions.employee_id;

  if (!canManageFull && !isDirectReport) {
    return { status: "error", message: "You cannot edit this employee." };
  }

  let payload: Record<string, unknown>;
  let redirectTo: string | null = `/employees/${employeeId}`;

  if (canManageFull) {
    const parsed = employeeSchema.safeParse(rawEmployee(formData));

    if (!parsed.success) {
      return {
        status: "error",
        message: firstError(parsed.error),
        fieldErrors: fieldErrors(parsed.error),
      };
    }

    const data = parsed.data;

    payload = {
      employee_number: data.employeeNumber,
      first_name: data.firstName,
      last_name: data.lastName,
      work_email: data.workEmail,
      personal_email: data.personalEmail,
      phone: data.phone,
      job_title: data.jobTitle,
      department_id: data.departmentId,
      location_id: data.locationId,
      manager_id: data.managerId,
      employment_type: data.employmentType,
      status: data.status,
      start_date: data.startDate,
      end_date: data.endDate,
      updated_by: session.user.id,
    };
  } else {
    const parsed = managerEmployeeSchema.safeParse({
      jobTitle: formString(formData, "jobTitle"),
      departmentId: formString(formData, "departmentId"),
      locationId: formString(formData, "locationId"),
    });

    if (!parsed.success) {
      return {
        status: "error",
        message: firstError(parsed.error),
        fieldErrors: fieldErrors(parsed.error),
      };
    }

    payload = {
      job_title: parsed.data.jobTitle,
      department_id: parsed.data.departmentId,
      location_id: parsed.data.locationId,
      updated_by: session.user.id,
    };
    redirectTo = null;
  }

  const { error } = await supabase
    .from("employees")
    .update(payload)
    .eq("id", employeeId);

  if (error) {
    return {
      status: "error",
      message: toErrorMessage(error, "The employee could not be updated."),
    };
  }

  const trackedFields: Array<[keyof Employee, string]> = [
    ["job_title", "job_title"],
    ["department_id", "department_id"],
    ["location_id", "location_id"],
    ["manager_id", "manager_id"],
    ["employment_type", "employment_type"],
    ["status", "status"],
  ];

  const changed = trackedFields.some(
    ([field]) => existing[field] !== (payload[field as string] ?? null),
  );

  if (changed) {
    await supabase.from("employment_history").insert({
      organization_id: session.profile.organization_id as string,
      employee_id: employeeId,
      effective_date: toIsoDate(todayUtc()),
      job_title: payload.job_title as string | null,
      department_id: payload.department_id as string | null,
      location_id: payload.location_id as string | null,
      manager_id: payload.manager_id as string | null,
      employment_type: (payload.employment_type as Employee["employment_type"]) ?? null,
      status: (payload.status as Employee["status"]) ?? null,
      created_by: session.user.id,
      note: "Updated through the employee record",
    });
  }

  revalidatePath("/employees");
  revalidatePath(`/employees/${employeeId}`);
  revalidatePath("/dashboard");

  if (redirectTo) redirect(redirectTo);
  return { status: "success", message: "Employee updated." };
}

export async function deactivateEmployeeAction(formData: FormData): Promise<void> {
  const session = await requireOrganizationSession();
  const employeeId = formString(formData, "employeeId");

  if (!employeeId || !session.permissions.can_manage_employees) return;

  const supabase = await createClient();

  await supabase
    .from("employees")
    .update({
      status: "inactive",
      end_date: formString(formData, "endDate") || toIsoDate(todayUtc()),
      updated_by: session.user.id,
    })
    .eq("id", employeeId);

  revalidatePath("/employees");
  revalidatePath(`/employees/${employeeId}`);
  revalidatePath("/dashboard");
}

export async function reactivateEmployeeAction(formData: FormData): Promise<void> {
  const session = await requireOrganizationSession();
  const employeeId = formString(formData, "employeeId");

  if (!employeeId || !session.permissions.can_manage_employees) return;

  const supabase = await createClient();

  await supabase
    .from("employees")
    .update({
      status: formBoolean(formData, "keepEndDate") ? "terminated" : "active",
      end_date: null,
      updated_by: session.user.id,
    })
    .eq("id", employeeId);

  revalidatePath("/employees");
  revalidatePath(`/employees/${employeeId}`);
  revalidatePath("/dashboard");
}
