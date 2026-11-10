"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireOrganizationSession } from "@/lib/auth/session";
import {
  CsvImportError,
  MAX_CSV_BYTES,
  parseCsvRecords,
  validateCsvRows,
} from "@/lib/csv/parse";
import { toErrorMessage, type ActionState } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { formString } from "@/lib/validation/form";
import type {
  Employee,
  ImportJob,
  ImportRowError,
  ImportRowPayload,
} from "@/lib/types";

const BATCH_SIZE = 50;

export async function previewImportAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireOrganizationSession();

  if (!session.permissions.can_import) {
    return { status: "error", message: "You cannot import employees." };
  }

  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Choose a CSV file to import." };
  }

  if (!file.name.toLowerCase().endsWith(".csv")) {
    return { status: "error", message: "Only .csv files can be imported." };
  }

  if (file.size > MAX_CSV_BYTES) {
    return {
      status: "error",
      message: `The file is larger than ${Math.round(MAX_CSV_BYTES / 1024)} KB. Split it into smaller files.`,
    };
  }

  let records: Array<Record<string, string>>;
  try {
    records = parseCsvRecords(await file.text());
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof CsvImportError
          ? error.message
          : "The file could not be read.",
    };
  }

  const supabase = await createClient();
  const organizationId = session.profile.organization_id as string;

  const [departmentResult, locationResult, employeeResult] = await Promise.all([
    supabase.from("departments").select("id, name"),
    supabase.from("locations").select("id, name"),
    supabase.from("employees").select("id, employee_number, work_email, first_name, last_name"),
  ]);

  const existing = (employeeResult.data ?? []) as Array<
    Pick<Employee, "id" | "employee_number" | "work_email" | "first_name" | "last_name">
  >;

  const result = validateCsvRows(records, {
    departments: (departmentResult.data ?? []) as Array<{ id: string; name: string }>,
    locations: (locationResult.data ?? []) as Array<{ id: string; name: string }>,
    managers: existing.map((employee) => ({
      id: employee.id,
      name: `${employee.first_name} ${employee.last_name}`,
      employeeNumber: employee.employee_number,
    })),
    existingEmployeeNumbers: new Set(
      existing.map((employee) => employee.employee_number.toLowerCase()),
    ),
    existingWorkEmails: new Set(
      existing.map((employee) => employee.work_email.toLowerCase()),
    ),
  });

  const { data: job, error } = await supabase
    .from("import_jobs")
    .insert({
      organization_id: organizationId,
      created_by: session.user.id,
      filename: file.name,
      status: "pending_review",
      total_rows: result.totalRows,
      valid_rows: result.validRows.length,
      failed_rows: result.errors.length,
      error_summary: result.errors.slice(0, 500),
      payload: result.validRows,
    })
    .select("id")
    .single();

  if (error || !job) {
    return {
      status: "error",
      message: toErrorMessage(error, "The import could not be prepared."),
    };
  }

  redirect(`/imports/${job.id}`);
}

export async function commitImportAction(formData: FormData): Promise<void> {
  const session = await requireOrganizationSession();
  const jobId = formString(formData, "jobId");

  if (!jobId || !session.permissions.can_import) return;

  const supabase = await createClient();

  const { data: jobData } = await supabase
    .from("import_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle<ImportJob>();

  if (!jobData || jobData.status !== "pending_review" || !jobData.payload) {
    redirect(`/imports/${jobId}`);
  }

  const job = jobData as ImportJob;
  const rows = job.payload ?? [];

  await supabase
    .from("import_jobs")
    .update({ status: "processing" })
    .eq("id", jobId);

  // Re-check duplicates at commit time: another user may have imported the
  // same rows since the preview was generated.
  const [numbersResult, emailsResult] = await Promise.all([
    supabase
      .from("employees")
      .select("employee_number")
      .in("employee_number", rows.map((row) => row.employee_number)),
    supabase
      .from("employees")
      .select("work_email")
      .in("work_email", rows.map((row) => row.work_email)),
  ]);

  const takenNumbers = new Set(
    (numbersResult.data ?? []).map((row) => String(row.employee_number).toLowerCase()),
  );
  const takenEmails = new Set(
    (emailsResult.data ?? []).map((row) => String(row.work_email).toLowerCase()),
  );

  const insertable: ImportRowPayload[] = [];
  const skippedErrors: ImportRowError[] = [];

  for (const row of rows) {
    if (
      takenNumbers.has(row.employee_number.toLowerCase()) ||
      takenEmails.has(row.work_email.toLowerCase())
    ) {
      skippedErrors.push({
        row: row.row,
        message: "Skipped: this employee number or work email already exists.",
      });
      continue;
    }
    insertable.push(row);
  }

  const failedErrors: ImportRowError[] = [];
  let created = 0;

  const toRecord = (row: ImportRowPayload) => ({
    organization_id: job.organization_id,
    employee_number: row.employee_number,
    first_name: row.first_name,
    last_name: row.last_name,
    work_email: row.work_email,
    personal_email: row.personal_email,
    phone: row.phone,
    job_title: row.job_title,
    department_id: row.department_id,
    location_id: row.location_id,
    manager_id: row.manager_id,
    employment_type: row.employment_type,
    status: row.status,
    start_date: row.start_date,
    end_date: row.end_date,
    created_by: session.user.id,
    updated_by: session.user.id,
  });

  for (let index = 0; index < insertable.length; index += BATCH_SIZE) {
    const batch = insertable.slice(index, index + BATCH_SIZE);
    const { error } = await supabase
      .from("employees")
      .insert(batch.map(toRecord));

    if (!error) {
      created += batch.length;
      continue;
    }

    // Identify the individual failures so the report stays actionable.
    for (const row of batch) {
      const { error: rowError } = await supabase
        .from("employees")
        .insert(toRecord(row));

      if (rowError) {
        failedErrors.push({
          row: row.row,
          message: toErrorMessage(rowError, "This row could not be imported."),
        });
      } else {
        created += 1;
      }
    }
  }

  const allErrors = [...job.error_summary, ...skippedErrors, ...failedErrors];

  await supabase
    .from("import_jobs")
    .update({
      status: created > 0 ? "completed" : "failed",
      created_rows: created,
      skipped_rows: skippedErrors.length,
      failed_rows: job.error_summary.length + failedErrors.length,
      error_summary: allErrors.slice(0, 500),
      payload: null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  revalidatePath("/imports");
  revalidatePath(`/imports/${jobId}`);
  revalidatePath("/employees");
  revalidatePath("/dashboard");
  redirect(`/imports/${jobId}`);
}

export async function cancelImportAction(formData: FormData): Promise<void> {
  const session = await requireOrganizationSession();
  const jobId = formString(formData, "jobId");

  if (!jobId || !session.permissions.can_import) return;

  const supabase = await createClient();
  await supabase
    .from("import_jobs")
    .update({ status: "cancelled", payload: null })
    .eq("id", jobId)
    .eq("status", "pending_review");

  revalidatePath("/imports");
  redirect(`/imports/${jobId}`);
}
