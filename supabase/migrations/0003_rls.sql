-- =============================================================================
-- 0003 — Row Level Security
--
-- RLS is the final authorization boundary. Hiding UI controls is never the
-- control itself. Every table exposed to the application has explicit policies.
-- =============================================================================

alter table public.organizations       enable row level security;
alter table public.profiles            enable row level security;
alter table public.departments         enable row level security;
alter table public.locations           enable row level security;
alter table public.employees           enable row level security;
alter table public.employment_history  enable row level security;
alter table public.audit_logs          enable row level security;
alter table public.import_jobs         enable row level security;

-- Safest default: force RLS for table owners too? No — SECURITY DEFINER
-- helpers and triggers legitimately bypass it. Clients use `authenticated`.

revoke all on public.organizations      from anon;
revoke all on public.profiles           from anon;
revoke all on public.departments        from anon;
revoke all on public.locations          from anon;
revoke all on public.employees          from anon;
revoke all on public.employment_history from anon;
revoke all on public.audit_logs         from anon;
revoke all on public.import_jobs        from anon;

grant select, insert, update, delete on public.organizations      to authenticated;
grant select, insert, update, delete on public.profiles           to authenticated;
grant select, insert, update, delete on public.departments        to authenticated;
grant select, insert, update, delete on public.locations          to authenticated;
grant select, insert, update, delete on public.employees          to authenticated;
grant select, insert, update, delete on public.employment_history to authenticated;
grant select on public.audit_logs                                 to authenticated;
grant select, insert, update, delete on public.import_jobs        to authenticated;

-- Personal contact details are deliberately excluded from the readable column
-- set; use public.get_employee_contact() instead.
revoke select on public.employees from authenticated;
grant select (
  id, organization_id, employee_number, first_name, last_name, work_email,
  job_title, department_id, location_id, manager_id, user_id, employment_type,
  status, start_date, end_date, created_by, updated_by, created_at, updated_at
) on public.employees to authenticated;

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------
drop policy if exists organizations_select on public.organizations;
create policy organizations_select on public.organizations
  for select to authenticated
  using (id = public.auth_org_id());

drop policy if exists organizations_update on public.organizations;
create policy organizations_update on public.organizations
  for update to authenticated
  using (id = public.auth_org_id() and public.has_role('admin'))
  with check (id = public.auth_org_id() and public.has_role('admin'));

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or (
      organization_id = public.auth_org_id()
      and public.has_role('admin', 'hr')
    )
    or (
      organization_id = public.auth_org_id()
      and public.has_role('manager')
      and exists (
        select 1
        from public.employees e
        where e.user_id = profiles.id
          and e.manager_id = public.my_employee_id()
      )
    )
  );

-- No client UPDATE/DELETE policy: role, activation and display-name changes go
-- through SECURITY DEFINER functions that verify the caller.

-- ---------------------------------------------------------------------------
-- departments
-- ---------------------------------------------------------------------------
drop policy if exists departments_select on public.departments;
create policy departments_select on public.departments
  for select to authenticated
  using (organization_id = public.auth_org_id());

drop policy if exists departments_write on public.departments;
create policy departments_write on public.departments
  for insert to authenticated
  with check (organization_id = public.auth_org_id() and public.has_role('admin', 'hr'));

drop policy if exists departments_update on public.departments;
create policy departments_update on public.departments
  for update to authenticated
  using (organization_id = public.auth_org_id() and public.has_role('admin', 'hr'))
  with check (organization_id = public.auth_org_id() and public.has_role('admin', 'hr'));

drop policy if exists departments_delete on public.departments;
create policy departments_delete on public.departments
  for delete to authenticated
  using (organization_id = public.auth_org_id() and public.has_role('admin', 'hr'));

-- ---------------------------------------------------------------------------
-- locations
-- ---------------------------------------------------------------------------
drop policy if exists locations_select on public.locations;
create policy locations_select on public.locations
  for select to authenticated
  using (organization_id = public.auth_org_id());

drop policy if exists locations_insert on public.locations;
create policy locations_insert on public.locations
  for insert to authenticated
  with check (organization_id = public.auth_org_id() and public.has_role('admin', 'hr'));

drop policy if exists locations_update on public.locations;
create policy locations_update on public.locations
  for update to authenticated
  using (organization_id = public.auth_org_id() and public.has_role('admin', 'hr'))
  with check (organization_id = public.auth_org_id() and public.has_role('admin', 'hr'));

drop policy if exists locations_delete on public.locations;
create policy locations_delete on public.locations
  for delete to authenticated
  using (organization_id = public.auth_org_id() and public.has_role('admin', 'hr'));

-- ---------------------------------------------------------------------------
-- employees
-- ---------------------------------------------------------------------------
drop policy if exists employees_select on public.employees;
create policy employees_select on public.employees
  for select to authenticated
  using (
    organization_id = public.auth_org_id()
    and (
      public.has_role('admin', 'hr')
      or user_id = auth.uid()
      or (public.has_role('manager') and manager_id = public.my_employee_id())
    )
  );

drop policy if exists employees_insert on public.employees;
create policy employees_insert on public.employees
  for insert to authenticated
  with check (organization_id = public.auth_org_id() and public.has_role('admin', 'hr'));

drop policy if exists employees_update on public.employees;
create policy employees_update on public.employees
  for update to authenticated
  using (
    organization_id = public.auth_org_id()
    and (
      public.has_role('admin', 'hr')
      or (public.has_role('manager') and manager_id = public.my_employee_id())
    )
  )
  with check (
    organization_id = public.auth_org_id()
    and (
      public.has_role('admin', 'hr')
      or (public.has_role('manager') and manager_id = public.my_employee_id())
    )
  );

-- No DELETE policy: employee records are soft-deactivated, never deleted.

-- ---------------------------------------------------------------------------
-- employment_history
-- ---------------------------------------------------------------------------
drop policy if exists employment_history_select on public.employment_history;
create policy employment_history_select on public.employment_history
  for select to authenticated
  using (public.can_view_employee(employee_id));

drop policy if exists employment_history_insert on public.employment_history;
create policy employment_history_insert on public.employment_history
  for insert to authenticated
  with check (
    organization_id = public.auth_org_id()
    and public.has_role('admin', 'hr')
    and public.can_view_employee(employee_id)
  );

-- ---------------------------------------------------------------------------
-- audit_logs (read-only for authorized staff, written by triggers only)
-- ---------------------------------------------------------------------------
drop policy if exists audit_logs_select on public.audit_logs;
create policy audit_logs_select on public.audit_logs
  for select to authenticated
  using (organization_id = public.auth_org_id() and public.has_role('admin', 'hr'));

-- ---------------------------------------------------------------------------
-- import_jobs
-- ---------------------------------------------------------------------------
drop policy if exists import_jobs_select on public.import_jobs;
create policy import_jobs_select on public.import_jobs
  for select to authenticated
  using (organization_id = public.auth_org_id() and public.has_role('admin', 'hr'));

drop policy if exists import_jobs_insert on public.import_jobs;
create policy import_jobs_insert on public.import_jobs
  for insert to authenticated
  with check (
    organization_id = public.auth_org_id()
    and public.has_role('admin', 'hr')
    and created_by = auth.uid()
  );

drop policy if exists import_jobs_update on public.import_jobs;
create policy import_jobs_update on public.import_jobs
  for update to authenticated
  using (organization_id = public.auth_org_id() and public.has_role('admin', 'hr'))
  with check (organization_id = public.auth_org_id() and public.has_role('admin', 'hr'));

-- ---------------------------------------------------------------------------
-- Function execution privileges
-- ---------------------------------------------------------------------------
revoke all on function public.create_organization(text, text) from public, anon;
revoke all on function public.admin_set_profile_role(uuid, public.app_role) from public, anon;
revoke all on function public.admin_set_profile_active(uuid, boolean) from public, anon;
revoke all on function public.update_own_display_name(text) from public, anon;
revoke all on function public.get_employee_contact(uuid) from public, anon;
revoke all on function public.current_permissions() from public, anon;

grant execute on function public.create_organization(text, text) to authenticated;
grant execute on function public.admin_set_profile_role(uuid, public.app_role) to authenticated;
grant execute on function public.admin_set_profile_active(uuid, boolean) to authenticated;
grant execute on function public.update_own_display_name(text) to authenticated;
grant execute on function public.get_employee_contact(uuid) to authenticated;
grant execute on function public.current_permissions() to authenticated;
grant execute on function public.auth_org_id() to authenticated;
grant execute on function public.auth_role() to authenticated;
grant execute on function public.has_role(public.app_role[]) to authenticated;
grant execute on function public.my_employee_id() to authenticated;
grant execute on function public.can_view_employee(uuid) to authenticated;
grant execute on function public.can_edit_employee(uuid) to authenticated;
