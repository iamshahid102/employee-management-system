"use server";

import { revalidatePath } from "next/cache";

import { requireOrganizationSession } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { toErrorMessage, type ActionState } from "@/lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  inviteUserSchema,
  profileActiveSchema,
  roleChangeSchema,
} from "@/lib/validation/auth";
import { fieldErrors, firstError, formString } from "@/lib/validation/form";

export async function inviteUserAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireOrganizationSession();

  if (!session.permissions.can_manage_users) {
    return { status: "error", message: "Only administrators can invite users." };
  }

  const parsed = inviteUserSchema.safeParse({
    email: formString(formData, "email"),
    displayName: formString(formData, "displayName"),
    role: formString(formData, "role") || "employee",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: firstError(parsed.error),
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const organizationId = session.profile.organization_id as string;
  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.inviteUserByEmail(
    parsed.data.email,
    {
      data: { full_name: parsed.data.displayName },
      redirectTo: `${env.siteUrl}/auth/callback?next=/reset-password`,
    },
  );

  if (error) {
    const duplicate = /already|exists|registered/i.test(error.message);
    return {
      status: "error",
      message: duplicate
        ? "A user with that email address already exists."
        : toErrorMessage(error, "The invitation could not be sent."),
    };
  }

  const userId = data?.user?.id;

  if (userId) {
    // Deterministic provisioning: the auth trigger already created a profile,
    // so set the tenant and role explicitly with the service role.
    await admin.auth.admin.updateUserById(userId, {
      app_metadata: { organization_id: organizationId, role: parsed.data.role },
    });

    await admin
      .from("profiles")
      .update({
        organization_id: organizationId,
        role: parsed.data.role,
        display_name: parsed.data.displayName,
      })
      .eq("id", userId);
  }

  revalidatePath("/users");
  return {
    status: "success",
    message: `Invitation sent to ${parsed.data.email}. They will be able to sign in after accepting it.`,
  };
}

export async function updateUserRoleAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireOrganizationSession();

  if (!session.permissions.can_manage_users) {
    return { status: "error", message: "Only administrators can change roles." };
  }

  const parsed = roleChangeSchema.safeParse({
    profileId: formString(formData, "profileId"),
    role: formString(formData, "role"),
  });

  if (!parsed.success) {
    return { status: "error", message: firstError(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_profile_role", {
    p_profile_id: parsed.data.profileId,
    p_role: parsed.data.role,
  });

  if (error) {
    return { status: "error", message: toErrorMessage(error) };
  }

  revalidatePath("/users");
  return { status: "success", message: "Role updated." };
}

export async function updateUserActiveAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireOrganizationSession();

  if (!session.permissions.can_manage_users) {
    return { status: "error", message: "Only administrators can manage accounts." };
  }

  const parsed = profileActiveSchema.safeParse({
    profileId: formString(formData, "profileId"),
    isActive: formString(formData, "isActive") === "true",
  });

  if (!parsed.success) {
    return { status: "error", message: firstError(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_profile_active", {
    p_profile_id: parsed.data.profileId,
    p_active: parsed.data.isActive,
  });

  if (error) {
    return { status: "error", message: toErrorMessage(error) };
  }

  revalidatePath("/users");
  return {
    status: "success",
    message: parsed.data.isActive ? "Account activated." : "Account deactivated.",
  };
}
