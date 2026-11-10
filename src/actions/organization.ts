"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireOrganizationSession, requireSession } from "@/lib/auth/session";
import { toErrorMessage, type ActionState } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import {
  departmentSchema,
  locationSchema,
  organizationSchema,
} from "@/lib/validation/organization";
import {
  fieldErrors,
  firstError,
  formBoolean,
  formString,
} from "@/lib/validation/form";

export async function createOrganizationAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();

  if (session.profile.organization_id) {
    redirect("/dashboard");
  }

  const parsed = organizationSchema.safeParse({
    name: formString(formData, "name"),
    timezone: formString(formData, "timezone") || "UTC",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: firstError(parsed.error),
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_organization", {
    p_name: parsed.data.name,
    p_timezone: parsed.data.timezone,
  });

  if (error) {
    return { status: "error", message: toErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function updateOrganizationAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireOrganizationSession();

  if (session.permissions.role !== "admin") {
    return {
      status: "error",
      message: "Only organization administrators can change these settings.",
    };
  }

  const parsed = organizationSchema.safeParse({
    name: formString(formData, "name"),
    timezone: formString(formData, "timezone") || "UTC",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: firstError(parsed.error),
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({ name: parsed.data.name, timezone: parsed.data.timezone })
    .eq("id", session.profile.organization_id as string);

  if (error) {
    return { status: "error", message: toErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { status: "success", message: "Organization settings saved." };
}

export async function saveDepartmentAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireOrganizationSession();

  if (!session.permissions.can_manage_organization) {
    return { status: "error", message: "You cannot manage departments." };
  }

  const id = formString(formData, "id");
  const parsed = departmentSchema.safeParse({
    name: formString(formData, "name"),
    parentId: formString(formData, "parentId"),
    isActive: formBoolean(formData, "isActive"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: firstError(parsed.error),
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  if (id && parsed.data.parentId === id) {
    return { status: "error", message: "A department cannot be its own parent." };
  }

  const supabase = await createClient();
  const payload = {
    organization_id: session.profile.organization_id as string,
    name: parsed.data.name,
    parent_id: parsed.data.parentId,
    is_active: parsed.data.isActive,
  };

  const { error } = id
    ? await supabase.from("departments").update(payload).eq("id", id)
    : await supabase.from("departments").insert(payload);

  if (error) {
    return { status: "error", message: toErrorMessage(error) };
  }

  revalidatePath("/organization");
  revalidatePath("/employees");
  return {
    status: "success",
    message: id ? "Department updated." : "Department created.",
  };
}

export async function deleteDepartmentAction(formData: FormData): Promise<void> {
  const session = await requireOrganizationSession();
  if (!session.permissions.can_manage_organization) return;

  const id = formString(formData, "id");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("departments").delete().eq("id", id);

  revalidatePath("/organization");
  revalidatePath("/employees");
}

export async function saveLocationAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireOrganizationSession();

  if (!session.permissions.can_manage_organization) {
    return { status: "error", message: "You cannot manage locations." };
  }

  const id = formString(formData, "id");
  const parsed = locationSchema.safeParse({
    name: formString(formData, "name"),
    address: formString(formData, "address"),
    timezone: formString(formData, "timezone"),
    isActive: formBoolean(formData, "isActive"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: firstError(parsed.error),
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();
  const payload = {
    organization_id: session.profile.organization_id as string,
    name: parsed.data.name,
    address: parsed.data.address,
    timezone: parsed.data.timezone,
    is_active: parsed.data.isActive,
  };

  const { error } = id
    ? await supabase.from("locations").update(payload).eq("id", id)
    : await supabase.from("locations").insert(payload);

  if (error) {
    return { status: "error", message: toErrorMessage(error) };
  }

  revalidatePath("/organization");
  revalidatePath("/employees");
  return {
    status: "success",
    message: id ? "Location updated." : "Location created.",
  };
}

export async function deleteLocationAction(formData: FormData): Promise<void> {
  const session = await requireOrganizationSession();
  if (!session.permissions.can_manage_organization) return;

  const id = formString(formData, "id");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("locations").delete().eq("id", id);

  revalidatePath("/organization");
  revalidatePath("/employees");
}
