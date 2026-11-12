-- =============================================================================
-- 0005 — Attendance
--
-- Model
--   One row per employee per working day (unique organization + employee + date).
--   Employees record their own attendance for "today" in the organization's
--   timezone; HR and administrators can create or correct any record, including
--   past dates, for anyone in the organization.
--
-- Authorization (RLS is the boundary; the UI only mirrors it)
--   select  : public.can_view_employee()  -> admin, hr, the employee, and their
--             direct manager
--   insert  : the caller's own record, or admin/hr
--   update  : same as insert, and an employee may only change today's entry
--   delete  : none — attendance is a historical record, correct it instead
-- =============================================================================

do $$ begin
  create type public.attendance_status as enum ('present', 'remote', 'on_leave', 'absent');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- "Today" in the organization's timezone (the database is the single clock)
-- ---------------------------------------------------------------------------
create or replace function public.org_today()
returns date
language sql
stable
security definer
set search_path = public
as $$
  select (now() at time zone coalesce(
    (select o.timezone from public.organizations o where o.id = public.auth_org_id()),
    'UTC'
  ))::date;
$$;

comment on function public.org_today() is
  'Current date in the organization timezone. Used so attendance never depends on the browser clock.';

-- ---------------------------------------------------------------------------
-- attendance_records
-- ---------------------------------------------------------------------------
create table if not exists public.attendance_records (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  employee_id      uuid not null,
  work_date        date not null,
  status           public.attendance_status not null default 'present',
  note             text check (note is null or char_length(note) <= 500),
  source           text not null default 'self' check (source in ('self', 'hr')),
  created_by       uuid references auth.users (id) on delete set null,
  updated_by       uuid references auth.users (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint attendance_records_employee_fk
    foreign key (organization_id, employee_id)
    references public.employees (organization_id, id)
    on delete cascade,
  constraint attendance_records_unique
    unique (organization_id, employee_id, work_date)
);

comment on table public.attendance_records is
  'Daily attendance. One row per employee per work date; self-marked rows can only be changed on the same day.';
comment on column public.attendance_records.source is
  '"self" when the employee marked it, "hr" when a member of staff recorded or corrected it.';

create index if not exists attendance_records_org_date_idx
  on public.attendance_records (organization_id, work_date desc);
create index if not exists attendance_records_employee_date_idx
  on public.attendance_records (employee_id, work_date desc);

drop trigger if exists attendance_records_set_updated_at on public.attendance_records;
create trigger attendance_records_set_updated_at
  before update on public.attendance_records
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Scope guard: employees may only record today for themselves
-- ---------------------------------------------------------------------------
create or replace function public.enforce_attendance_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Service-role maintenance and seeding has no end-user identity.
  if auth.uid() is null then
    return new;
  end if;

  if new.work_date > public.org_today() then
    raise exception 'Attendance cannot be recorded for a future date' using errcode = '22007';
  end if;

  if public.has_role('admin', 'hr') then
    return new;
  end if;

  if new.employee_id is distinct from public.my_employee_id() then
    raise exception 'You can only record your own attendance' using errcode = '42501';
  end if;

  if tg_op = 'INSERT' and new.work_date is distinct from public.org_today() then
    raise exception 'You can only record attendance for today' using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' then
    if new.employee_id is distinct from old.employee_id
       or new.work_date is distinct from old.work_date then
      raise exception 'The employee and date of an attendance record cannot be changed'
        using errcode = '42501';
    end if;

    if old.work_date is distinct from public.org_today() then
      raise exception 'Only today''s attendance can be changed' using errcode = '42501';
    end if;
  end if;

  new.source := 'self';
  return new;
end;
$$;

drop trigger if exists attendance_records_scope on public.attendance_records;
create trigger attendance_records_scope
  before insert or update on public.attendance_records
  for each row execute function public.enforce_attendance_scope();

-- ---------------------------------------------------------------------------
-- Audit: attendance is personal data, so only the date and status are logged
-- ---------------------------------------------------------------------------
create or replace function public.audit_attendance_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, summary)
  values (
    new.organization_id,
    auth.uid(),
    case when tg_op = 'INSERT' then 'attendance.marked' else 'attendance.updated' end,
    'attendance',
    new.id::text,
    jsonb_build_object(
      'employee_id', new.employee_id::text,
      'work_date', new.work_date,
      'status', new.status
    )
  );

  return new;
end;
$$;

drop trigger if exists attendance_records_audit on public.attendance_records;
create trigger attendance_records_audit
  after insert or update on public.attendance_records
  for each row execute function public.audit_attendance_change();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.attendance_records enable row level security;

revoke all on public.attendance_records from anon;
grant select, insert, update on public.attendance_records to authenticated;

drop policy if exists attendance_records_select on public.attendance_records;
create policy attendance_records_select on public.attendance_records
  for select to authenticated
  using (public.can_view_employee(employee_id));

drop policy if exists attendance_records_insert on public.attendance_records;
create policy attendance_records_insert on public.attendance_records
  for insert to authenticated
  with check (
    organization_id = public.auth_org_id()
    and public.can_view_employee(employee_id)
    and (
      employee_id = public.my_employee_id()
      or public.has_role('admin', 'hr')
    )
  );

drop policy if exists attendance_records_update on public.attendance_records;
create policy attendance_records_update on public.attendance_records
  for update to authenticated
  using (
    organization_id = public.auth_org_id()
    and public.can_view_employee(employee_id)
    and (
      employee_id = public.my_employee_id()
      or public.has_role('admin', 'hr')
    )
  )
  with check (
    organization_id = public.auth_org_id()
    and public.can_view_employee(employee_id)
    and (
      employee_id = public.my_employee_id()
      or public.has_role('admin', 'hr')
    )
  );

-- ---------------------------------------------------------------------------
-- RPC: mark or change your own attendance for today
-- ---------------------------------------------------------------------------
create or replace function public.mark_own_attendance(
  p_status public.attendance_status,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_employee uuid := public.my_employee_id();
  v_org uuid := public.auth_org_id();
begin
  if v_employee is null or v_org is null then
    raise exception 'Your account is not linked to an employee record' using errcode = '42501';
  end if;

  if p_status is null then
    raise exception 'Choose an attendance status' using errcode = '22023';
  end if;

  insert into public.attendance_records as a (
    organization_id, employee_id, work_date, status, note, source, created_by, updated_by
  )
  values (
    v_org,
    v_employee,
    public.org_today(),
    p_status,
    nullif(trim(coalesce(p_note, '')), ''),
    'self',
    auth.uid(),
    auth.uid()
  )
  on conflict (organization_id, employee_id, work_date) do update
     set status     = excluded.status,
         note       = excluded.note,
         source     = 'self',
         updated_by = auth.uid();
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: staff create or correct a record for any employee
-- ---------------------------------------------------------------------------
create or replace function public.set_employee_attendance(
  p_employee_id uuid,
  p_work_date date,
  p_status public.attendance_status,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid := public.auth_org_id();
begin
  if not public.has_role('admin', 'hr') then
    raise exception 'Only administrators and HR can record attendance for other employees'
      using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.employees e
    where e.id = p_employee_id
      and e.organization_id = v_org
  ) then
    raise exception 'Employee not found' using errcode = 'P0002';
  end if;

  if p_work_date is null or p_work_date > public.org_today() then
    raise exception 'Attendance cannot be recorded for a future date' using errcode = '22007';
  end if;

  insert into public.attendance_records as a (
    organization_id, employee_id, work_date, status, note, source, created_by, updated_by
  )
  values (
    v_org,
    p_employee_id,
    p_work_date,
    p_status,
    nullif(trim(coalesce(p_note, '')), ''),
    'hr',
    auth.uid(),
    auth.uid()
  )
  on conflict (organization_id, employee_id, work_date) do update
     set status     = excluded.status,
         note       = excluded.note,
         source     = 'hr',
         updated_by = auth.uid();
end;
$$;

-- ---------------------------------------------------------------------------
-- Permission summary: attendance capabilities for the app shell
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
    'can_view_audit', public.has_role('admin', 'hr'),
    'can_mark_attendance', public.my_employee_id() is not null,
    'can_view_team_attendance', public.has_role('admin', 'hr', 'manager'),
    'can_manage_attendance', public.has_role('admin', 'hr')
  );
$$;

-- ---------------------------------------------------------------------------
-- Function execution privileges
-- ---------------------------------------------------------------------------
revoke all on function public.org_today() from public, anon;
revoke all on function public.mark_own_attendance(public.attendance_status, text) from public, anon;
revoke all on function public.set_employee_attendance(uuid, date, public.attendance_status, text) from public, anon;
revoke all on function public.current_permissions() from public, anon;

grant execute on function public.org_today() to authenticated;
grant execute on function public.mark_own_attendance(public.attendance_status, text) to authenticated;
grant execute on function public.set_employee_attendance(uuid, date, public.attendance_status, text) to authenticated;
grant execute on function public.current_permissions() to authenticated;
