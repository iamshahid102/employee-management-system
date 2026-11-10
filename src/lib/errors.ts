/**
 * Maps database and transport errors to user-facing messages.
 * Database internals (SQL, constraint names beyond the mapped ones) are never
 * returned to the client verbatim.
 */
const KNOWN_ERRORS: Array<[RegExp, string]> = [
  [
    /employees_org_number_key|duplicate key value.*employee_number/i,
    "That employee number is already used in this organization.",
  ],
  [
    /employees_org_work_email_key|duplicate key value.*work_email/i,
    "That work email is already used by another employee.",
  ],
  [
    /departments_org_name_key/i,
    "A department with that name already exists.",
  ],
  [
    /locations_org_name_key/i,
    "A location with that name already exists.",
  ],
  [/profiles_org_email_key/i, "A user with that email already exists."],
  [
    /employees_user_id_key|duplicate key value.*user_id/i,
    "That sign-in account is already linked to another employee.",
  ],
  [
    /Manager assignment would create a cycle|manager hierarchy is too deep/i,
    "That manager assignment would create a reporting cycle.",
  ],
  [
    /employees_dates_valid/i,
    "The end date cannot be before the start date.",
  ],
  [
    /At least one active administrator must remain/i,
    "At least one active administrator must remain.",
  ],
  [/You cannot change your own role/i, "You cannot change your own role."],
  [
    /You cannot deactivate your own account/i,
    "You cannot deactivate your own account.",
  ],
  [
    /Managers may only update/i,
    "Managers may only update the job title, department or location of direct reports.",
  ],
  [
    /row-level security|permission denied for table/i,
    "You do not have permission to perform this action.",
  ],
  [
    /JWT expired|invalid claim/i,
    "Your session has expired. Please sign in again.",
  ],
];

const FALLBACK = "Something went wrong. Please try again.";

export function toErrorMessage(
  error: unknown,
  fallback: string = FALLBACK,
): string {
  if (!error) return fallback;

  const raw =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null && "message" in error
          ? String((error as { message: unknown }).message)
          : "";

  if (!raw) return fallback;

  for (const [pattern, message] of KNOWN_ERRORS) {
    if (pattern.test(raw)) return message;
  }

  // Short, non-technical errors (raised deliberately by RPCs) are safe to show.
  if (raw.length <= 160 && !/relation|column|syntax|pg_|SQLSTATE/i.test(raw)) {
    return raw;
  }

  return fallback;
}

export type ActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};
