"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth/session";
import { toErrorMessage, type ActionState } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { displayNameSchema } from "@/lib/validation/auth";
import { fieldErrors, firstError, formString } from "@/lib/validation/form";

const INITIAL: ActionState = { status: "idle" };

export async function updateDisplayNameAction(
  _previous: ActionState = INITIAL,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();

  const parsed = displayNameSchema.safeParse({
    displayName: formString(formData, "displayName"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: firstError(parsed.error),
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_own_display_name", {
    p_display_name: parsed.data.displayName,
  });

  if (error) {
    return { status: "error", message: toErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { status: "success", message: "Display name updated." };
}

export async function currentDisplayName(): Promise<string> {
  const session = await requireSession();
  return session.profile.display_name;
}
