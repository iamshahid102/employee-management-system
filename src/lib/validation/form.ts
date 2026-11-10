import type { z } from "zod";

/** Flatten a Zod error into `{ fieldPath: [messages] }` for form rendering. */
export function fieldErrors(error: z.ZodError): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "form";
    result[key] = [...(result[key] ?? []), issue.message];
  }

  return result;
}

/** First error message, useful for toasts. */
export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Please check the form and try again.";
}

export function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function formBoolean(formData: FormData, key: string): boolean {
  const value = formData.get(key);
  return value === "on" || value === "true" || value === "1";
}
