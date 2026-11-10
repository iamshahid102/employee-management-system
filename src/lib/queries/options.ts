import type { SupabaseClient } from "@supabase/supabase-js";

export type Option = { id: string; name: string };

export type DirectoryOptions = {
  departments: Option[];
  locations: Option[];
  managers: Option[];
};

/** Active portal accounts that can be linked to an employee record. */
export async function loadAccountOptions(
  supabase: SupabaseClient,
): Promise<Option[]> {
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, email")
    .eq("is_active", true)
    .order("display_name");

  return ((data ?? []) as Array<{
    id: string;
    display_name: string;
    email: string;
  }>).map((profile) => ({
    id: profile.id,
    name: `${profile.display_name} (${profile.email})`,
  }));
}

/** Departments, locations and eligible managers for the current organization. */
export async function loadDirectoryOptions(
  supabase: SupabaseClient,
): Promise<DirectoryOptions> {
  const [departmentResult, locationResult, managerResult] = await Promise.all([
    supabase
      .from("departments")
      .select("id, name")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("locations")
      .select("id, name")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("employees")
      .select("id, first_name, last_name")
      .in("status", ["active", "probation", "on_leave"])
      .order("last_name")
      .order("first_name")
      .limit(500),
  ]);

  return {
    departments: (departmentResult.data ?? []) as Option[],
    locations: (locationResult.data ?? []) as Option[],
    managers: ((managerResult.data ?? []) as Array<{
      id: string;
      first_name: string;
      last_name: string;
    }>).map((row) => ({
      id: row.id,
      name: `${row.first_name} ${row.last_name}`,
    })),
  };
}
