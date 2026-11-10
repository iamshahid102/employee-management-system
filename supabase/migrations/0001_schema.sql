-- =============================================================================
-- 0001 — Core schema
-- Employee Management System
--
-- Conventions:
--   * UUID primary keys
--   * timestamptz audit timestamps (UTC)
--   * every tenant-scoped table carries organization_id and cross-organization
--     references are blocked by composite foreign keys
--   * soft deactivation instead of hard deletion for employee records
-- =============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enumerated types
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.app_role as enum ('admin', 'hr', 'manager', 'employee');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.employment_type as enum (
    'full_time', 'part_time', 'contract', 'intern', 'temporary'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.employment_status as enum (
    'active', 'probation', 'on_leave', 'terminated', 'inactive'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.import_status as enum (
    'pending_review', 'processing', 'completed', 'failed', 'cancelled'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------
create table if not exists public.organizations (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(trim(name)) between 2 and 120),
  timezone      text not null default 'UTC',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.organizations is
  'Single organization per deployment in the MVP; organization_id is carried everywhere for future multi-organization support.';

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- profiles — one row per auth user
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  organization_id  uuid references public.organizations (id) on delete restrict,
  email            text not null check (email = lower(email)),
  display_name     text not null check (char_length(trim(display_name)) between 1 and 120),
  role             public.app_role not null default 'employee',
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on column public.profiles.role is
  'AUTHORITATIVE role. Never read from client-submitted data; changed only through public.admin_set_profile_role().';

create index if not exists profiles_organization_idx
  on public.profiles (organization_id);
create unique index if not exists profiles_org_email_key
  on public.profiles (organization_id, lower(email))
  where organization_id is not null;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- departments (self-referencing hierarchy)
-- ---------------------------------------------------------------------------
create table if not exists public.departments (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  name             text not null check (char_length(trim(name)) between 1 and 120),
  parent_id        uuid,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  -- Declared before the self-referencing FK so the referenced key exists.
  constraint departments_org_id_key unique (organization_id, id),
  constraint departments_parent_fk
    foreign key (organization_id, parent_id)
    references public.departments (organization_id, id)
    on delete set null,
  constraint departments_parent_not_self
    check (parent_id is null or parent_id <> id)
);

create unique index if not exists departments_org_name_key
  on public.departments (organization_id, lower(name));

drop trigger if exists departments_set_updated_at on public.departments;
create trigger departments_set_updated_at
  before update on public.departments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- locations
-- ---------------------------------------------------------------------------
create table if not exists public.locations (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  name             text not null check (char_length(trim(name)) between 1 and 120),
  address          text,
  timezone         text,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint locations_org_id_key unique (organization_id, id)
);

create unique index if not exists locations_org_name_key
  on public.locations (organization_id, lower(name));

drop trigger if exists locations_set_updated_at on public.locations;
create trigger locations_set_updated_at
  before update on public.locations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- employees
-- ---------------------------------------------------------------------------
create table if not exists public.employees (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations (id) on delete cascade,
  employee_number   text not null check (char_length(trim(employee_number)) between 1 and 40),
  first_name        text not null check (char_length(trim(first_name)) between 1 and 80),
  last_name         text not null check (char_length(trim(last_name)) between 1 and 80),
  work_email        text not null check (work_email = lower(work_email)),
  personal_email    text,
  phone             text,
  job_title         text,
  department_id     uuid,
  location_id       uuid,
  manager_id        uuid,
  user_id           uuid references auth.users (id) on delete set null,
  employment_type   public.employment_type not null default 'full_time',
  status            public.employment_status not null default 'active',
  start_date        date not null,
  end_date          date,
  created_by        uuid references auth.users (id) on delete set null,
  updated_by        uuid references auth.users (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- Declared first: the self-referencing manager FK below depends on it.
  constraint employees_org_id_key unique (organization_id, id),
  constraint employees_department_fk
    foreign key (organization_id, department_id)
    references public.departments (organization_id, id)
    on delete restrict,
  constraint employees_location_fk
    foreign key (organization_id, location_id)
    references public.locations (organization_id, id)
    on delete restrict,
  constraint employees_manager_fk
    foreign key (organization_id, manager_id)
    references public.employees (organization_id, id)
    on delete set null,
  constraint employees_manager_not_self
    check (manager_id is null or manager_id <> id),
  constraint employees_dates_valid
    check (end_date is null or end_date >= start_date),
  constraint employees_user_id_key unique (user_id)
);

create unique index if not exists employees_org_number_key
  on public.employees (organization_id, lower(employee_number));
create unique index if not exists employees_org_work_email_key
  on public.employees (organization_id, lower(work_email));
create index if not exists employees_org_status_idx
  on public.employees (organization_id, status);
create index if not exists employees_org_department_idx
  on public.employees (organization_id, department_id);
create index if not exists employees_manager_idx
  on public.employees (manager_id);
create index if not exists employees_name_idx
  on public.employees (organization_id, lower(last_name), lower(first_name));

comment on column public.employees.status is
  'Use "inactive" for soft deactivation so historical references remain valid; never hard-delete employee rows.';

drop trigger if exists employees_set_updated_at on public.employees;
create trigger employees_set_updated_at
  before update on public.employees
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- employment_history — effective-dated changes
-- ---------------------------------------------------------------------------
create table if not exists public.employment_history (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  employee_id      uuid not null references public.employees (id) on delete cascade,
  effective_date   date not null default current_date,
  job_title        text,
  department_id    uuid,
  location_id      uuid,
  manager_id       uuid,
  employment_type  public.employment_type,
  status           public.employment_status,
  note             text,
  created_by       uuid references auth.users (id) on delete set null,
  created_at       timestamptz not null default now()
);

create index if not exists employment_history_employee_idx
  on public.employment_history (employee_id, effective_date desc);

-- ---------------------------------------------------------------------------
-- audit_logs — minimized change summaries, never raw personal data
-- ---------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  actor_id         uuid references auth.users (id) on delete set null,
  action           text not null,
  entity_type      text not null,
  entity_id        text,
  summary          jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now()
);

create index if not exists audit_logs_org_created_idx
  on public.audit_logs (organization_id, created_at desc);
create index if not exists audit_logs_entity_idx
  on public.audit_logs (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- import_jobs — preview state, counts and non-sensitive error summary
-- ---------------------------------------------------------------------------
create table if not exists public.import_jobs (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  created_by       uuid not null references auth.users (id) on delete cascade,
  filename         text not null,
  status           public.import_status not null default 'pending_review',
  total_rows       integer not null default 0 check (total_rows >= 0),
  valid_rows       integer not null default 0 check (valid_rows >= 0),
  created_rows     integer not null default 0 check (created_rows >= 0),
  skipped_rows     integer not null default 0 check (skipped_rows >= 0),
  failed_rows      integer not null default 0 check (failed_rows >= 0),
  error_summary    jsonb not null default '[]'::jsonb,
  payload          jsonb,
  created_at       timestamptz not null default now(),
  completed_at     timestamptz
);

create index if not exists import_jobs_org_created_idx
  on public.import_jobs (organization_id, created_at desc);

comment on column public.import_jobs.payload is
  'Validated rows awaiting confirmation. Cleared as soon as the import completes to minimise retention of uploaded data.';
