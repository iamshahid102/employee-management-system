-- =============================================================================
-- 0002 — Authorization helpers, integrity guards, audit triggers and RPCs
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Identity helpers
--
-- SECURITY DEFINER so that policies on public.profiles can call them without
-- recursing into their own RLS policies.
-- ---------------------------------------------------------------------------
create or replace function public.auth_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.organization_id
  from public.profiles p
  where p.id = auth.uid()
    and p.is_active
    and p.organization_id is not null;
$$;

create or replace function public.auth_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
    and p.is_active
    and p.organization_id is not null;
$$;

create or replace function public.has_role(variadic p_roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active
      and p.organization_id is not null
      and p.role = any (p_roles)
  );
$$;

create or replace function public.my_employee_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select e.id
  from public.employees e
  where e.user_id = auth.uid()
    and e.organization_id = public.auth_org_id();
$$;

-- Managers may only edit this explicit allow-list of columns for direct
-- reports. Keep in sync with the employee edit UI.
create or replace function public.manager_editable_columns()
returns text[]
language sql
immutable
as $$
  select array['job_title', 'department_id', 'location_id']::text[];
$$;

create or replace function public.can_view_employee(p_employee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.employees e
    where e.id = p_employee_id
      and e.organization_id = public.auth_org_id()
      and (
        public.has_role('admin', 'hr')
        or e.user_id = auth.uid()
        or (public.has_role('manager') and e.manager_id = public.my_employee_id())
      )
  );
$$;

create or replace function public.can_edit_employee(p_employee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.employees e
    where e.id = p_employee_id
      and e.organization_id = public.auth_org_id()
      and (
        public.has_role('admin', 'hr')
        or (public.has_role('manager') and e.manager_id = public.my_employee_id())
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- Provisioning: create a profile for every new auth user.
--
-- Role and organization are read from raw_app_meta_data, which only the
-- service role can set. raw_user_meta_data is user-controlled and is used
-- solely for the display name.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meta jsonb := coalesce(new.raw_app_meta_data, '{}'::jsonb);
  v_org uuid;
  v_role public.app_role := 'employee';
  v_display_name text;
begin
  if (v_meta ->> 'organization_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    v_org := (v_meta ->> 'organization_id')::uuid;
    if not exists (select 1 from public.organizations o where o.id = v_org) then
      v_org := null;
    end if;
  end if;

  if v_meta ->> 'role' in ('admin', 'hr', 'manager', 'employee') then
    v_role := (v_meta ->> 'role')::public.app_role;
  end if;

  v_display_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    split_part(coalesce(new.email, 'user'), '@', 1)
  );

  insert into public.profiles (id, organization_id, email, display_name, role)
  values (
    new.id,
    v_org,
    lower(coalesce(new.email, 'user-' || new.id::text || '@invalid.local')),
    v_display_name,
    v_role
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Integrity: manager hierarchy cannot contain cycles
-- ---------------------------------------------------------------------------
create or replace function public.enforce_manager_no_cycle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ancestor uuid := new.manager_id;
  v_depth integer := 0;
begin
  if new.manager_id is null then
    return new;
  end if;

  if new.manager_id = new.id then
    raise exception 'An employee cannot be their own manager' using errcode = '23514';
  end if;

  while v_ancestor is not null loop
    if v_ancestor = new.id then
      raise exception 'Manager assignment would create a cycle' using errcode = '23514';
    end if;

    select e.manager_id into v_ancestor
    from public.employees e
    where e.id = v_ancestor;

    v_depth := v_depth + 1;
    if v_depth > 64 then
      raise exception 'Manager hierarchy is too deep' using errcode = '23514';
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists employees_no_manager_cycle on public.employees;
create trigger employees_no_manager_cycle
  before insert or update of manager_id on public.employees
  for each row execute function public.enforce_manager_no_cycle();

-- ---------------------------------------------------------------------------
-- Integrity: managers may only change an explicit allow-list of columns
-- ---------------------------------------------------------------------------
create or replace function public.enforce_employee_update_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Administrators and HR manage the full record.
  if public.has_role('admin', 'hr') then
    return new;
  end if;

  if public.has_role('manager') then
    if (new.job_title, new.department_id, new.location_id)
       is distinct from
       (old.job_title, old.department_id, old.location_id) then
      return new;
    end if;

    raise exception 'Managers may only update job title, department or location for direct reports'
      using errcode = '42501';
  end if;

  raise exception 'You do not have permission to update this employee record'
    using errcode = '42501';
end;
$$;

drop trigger if exists employees_update_scope on public.employees;
create trigger employees_update_scope
  before update on public.employees
  for each row execute function public.enforce_employee_update_scope();

-- ---------------------------------------------------------------------------
-- Audit trail
--
-- Only field names and identifiers are stored — never personal values.
-- ---------------------------------------------------------------------------
create or replace function public.audit_employee_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fields text[] := array[]::text[];
begin
  if tg_op = 'INSERT' then
    insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, summary)
    values (
      new.organization_id,
      auth.uid(),
      'employee.created',
      'employee',
      new.id::text,
      jsonb_build_object('employee_number', new.employee_number)
    );
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.employee_number is distinct from old.employee_number then v_fields := array_append(v_fields, 'employee_number'); end if;
    if new.first_name is distinct from old.first_name then v_fields := array_append(v_fields, 'first_name'); end if;
    if new.last_name is distinct from old.last_name then v_fields := array_append(v_fields, 'last_name'); end if;
    if new.work_email is distinct from old.work_email then v_fields := array_append(v_fields, 'work_email'); end if;
    if new.job_title is distinct from old.job_title then v_fields := array_append(v_fields, 'job_title'); end if;
    if new.department_id is distinct from old.department_id then v_fields := array_append(v_fields, 'department_id'); end if;
    if new.location_id is distinct from old.location_id then v_fields := array_append(v_fields, 'location_id'); end if;
    if new.manager_id is distinct from old.manager_id then v_fields := array_append(v_fields, 'manager_id'); end if;
    if new.employment_type is distinct from old.employment_type then v_fields := array_append(v_fields, 'employment_type'); end if;
    if new.status is distinct from old.status then v_fields := array_append(v_fields, 'status'); end if;
    if new.start_date is distinct from old.start_date then v_fields := array_append(v_fields, 'start_date'); end if;
    if new.end_date is distinct from old.end_date then v_fields := array_append(v_fields, 'end_date'); end if;
    if new.personal_email is distinct from old.personal_email then v_fields := array_append(v_fields, 'personal_email'); end if;
    if new.phone is distinct from old.phone then v_fields := array_append(v_fields, 'phone'); end if;

    if coalesce(array_length(v_fields, 1), 0) = 0 then
      return new;
    end if;

    insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, summary)
    values (
      new.organization_id,
      auth.uid(),
      'employee.updated',
      'employee',
      new.id::text,
      jsonb_build_object('fields', to_jsonb(v_fields))
    );
  end if;

  return new;
end;
$$;

drop trigger if exists employees_audit on public.employees;
create trigger employees_audit
  after insert or update on public.employees
  for each row execute function public.audit_employee_change();

create or replace function public.audit_profile_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, summary)
    values (
      coalesce(new.organization_id, old.organization_id),
      auth.uid(),
      'profile.role_changed',
      'profile',
      new.id::text,
      jsonb_build_object('from', old.role, 'to', new.role)
    );
  end if;

  if new.is_active is distinct from old.is_active then
    insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, summary)
    values (
      coalesce(new.organization_id, old.organization_id),
      auth.uid(),
      case when new.is_active then 'profile.activated' else 'profile.deactivated' end,
      'profile',
      new.id::text,
      '{}'::jsonb
    );
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_audit on public.profiles;
create trigger profiles_audit
  after update on public.profiles
  for each row execute function public.audit_profile_change();

create or replace function public.audit_import_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, summary)
  values (
    new.organization_id,
    auth.uid(),
    'import.' || new.status::text,
    'import_job',
    new.id::text,
    jsonb_build_object(
      'filename', new.filename,
      'total_rows', new.total_rows,
      'created_rows', new.created_rows,
      'skipped_rows', new.skipped_rows,
      'failed_rows', new.failed_rows
    )
  );

  return new;
end;
$$;

drop trigger if exists import_jobs_audit on public.import_jobs;
create trigger import_jobs_audit
  after update on public.import_jobs
  for each row execute function public.audit_import_change();

-- ---------------------------------------------------------------------------
-- RPC: bootstrap the first organization
-- ---------------------------------------------------------------------------
create or replace function public.create_organization(p_name text, p_timezone text default 'UTC')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
  v_org uuid;
  v_name text := trim(coalesce(p_name, ''));
begin
  select * into v_profile from public.profiles where id = auth.uid() for update;

  if v_profile.id is null then
    raise exception 'No profile is associated with the current session' using errcode = '42501';
  end if;

  if v_profile.organization_id is not null then
    raise exception 'You already belong to an organization' using errcode = '23505';
  end if;

  if exists (select 1 from public.organizations) then
    raise exception 'An organization already exists. Ask an administrator for an invitation.'
      using errcode = '42501';
  end if;

  if char_length(v_name) < 2 then
    raise exception 'Organization name must be at least 2 characters' using errcode = '22023';
  end if;

  insert into public.organizations (name, timezone)
  values (v_name, coalesce(nullif(trim(p_timezone), ''), 'UTC'))
  returning id into v_org;

  update public.profiles
     set organization_id = v_org,
         role = 'admin',
         is_active = true
   where id = auth.uid();

  insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, summary)
  values (v_org, auth.uid(), 'organization.created', 'organization', v_org::text,
          jsonb_build_object('name', v_name));

  return v_org;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: role and account management (administrators only)
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_profile_role(p_profile_id uuid, p_role public.app_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target public.profiles;
  v_org uuid;
begin
  if not public.has_role('admin') then
    raise exception 'Only administrators can change roles' using errcode = '42501';
  end if;

  v_org := public.auth_org_id();

  select * into v_target from public.profiles where id = p_profile_id for update;

  if v_target.id is null or v_target.organization_id is distinct from v_org then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  if v_target.id = auth.uid() then
    raise exception 'You cannot change your own role' using errcode = '42501';
  end if;

  if v_target.role = 'admin' and p_role <> 'admin' then
    if (select count(*) from public.profiles
        where organization_id = v_org and role = 'admin' and is_active) <= 1 then
      raise exception 'At least one active administrator must remain' using errcode = '42501';
    end if;
  end if;

  update public.profiles set role = p_role where id = p_profile_id;
end;
$$;

create or replace function public.admin_set_profile_active(p_profile_id uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target public.profiles;
  v_org uuid;
begin
  if not public.has_role('admin') then
    raise exception 'Only administrators can activate or deactivate accounts' using errcode = '42501';
  end if;

  v_org := public.auth_org_id();

  select * into v_target from public.profiles where id = p_profile_id for update;

  if v_target.id is null or v_target.organization_id is distinct from v_org then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  if v_target.id = auth.uid() and not p_active then
    raise exception 'You cannot deactivate your own account' using errcode = '42501';
  end if;

  if v_target.role = 'admin' and not p_active then
    if (select count(*) from public.profiles
        where organization_id = v_org and role = 'admin' and is_active) <= 1 then
      raise exception 'At least one active administrator must remain' using errcode = '42501';
    end if;
  end if;

  update public.profiles set is_active = p_active where id = p_profile_id;
end;
$$;

create or replace function public.update_own_display_name(p_display_name text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
     set display_name = trim(p_display_name)
   where id = auth.uid()
     and char_length(trim(p_display_name)) between 1 and 120;
$$;

-- ---------------------------------------------------------------------------
-- RPC: read sensitive contact fields (admin, hr, or the employee themselves)
-- ---------------------------------------------------------------------------
create or replace function public.get_employee_contact(p_employee_id uuid)
returns table (personal_email text, phone text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_employee public.employees;
begin
  select * into v_employee from public.employees where id = p_employee_id;

  if v_employee.id is null or v_employee.organization_id is distinct from public.auth_org_id() then
    raise exception 'Employee not found' using errcode = 'P0002';
  end if;

  if not (public.has_role('admin', 'hr') or v_employee.user_id = auth.uid()) then
    raise exception 'You are not allowed to view these contact details' using errcode = '42501';
  end if;

  return query select v_employee.personal_email, v_employee.phone;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: permission summary used by the app shell
-- ---------------------------------------------------------------------------
create or replace function public.current_permissions()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'role', coalesce(public.auth_role()::text, 'none'),
    'organization_id', public.auth_org_id(),
    'employee_id', public.my_employee_id(),
    'can_manage_organization', public.has_role('admin', 'hr'),
    'can_manage_users', public.has_role('admin'),
    'can_manage_employees', public.has_role('admin', 'hr'),
    'can_import', public.has_role('admin', 'hr'),
    'can_export', public.has_role('admin', 'hr', 'manager'),
    'can_view_audit', public.has_role('admin', 'hr')
  );
$$;
