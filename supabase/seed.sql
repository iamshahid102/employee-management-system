-- =============================================================================
-- Optional development seed
--
-- Run AFTER the app has created its first organization (create_organization).
-- It does not create an organization, so the first-run onboarding still works.
-- Safe to re-run: inserts use ON CONFLICT DO NOTHING.
-- =============================================================================
do $$
declare
  v_org uuid;
  v_engineering uuid;
  v_people uuid;
  v_sales uuid;
  v_hq uuid;
  v_remote uuid;
  v_ceo uuid;
begin
  select id into v_org from public.organizations order by created_at limit 1;

  if v_org is null then
    raise notice 'No organization found — create one through /setup first. Skipping seed.';
    return;
  end if;

  insert into public.departments (organization_id, name)
  values (v_org, 'Engineering')
  on conflict (organization_id, lower(name)) do nothing;

  insert into public.departments (organization_id, name)
  values (v_org, 'People & Culture')
  on conflict (organization_id, lower(name)) do nothing;

  insert into public.departments (organization_id, name)
  values (v_org, 'Sales')
  on conflict (organization_id, lower(name)) do nothing;

  insert into public.locations (organization_id, name, address, timezone)
  values (v_org, 'Headquarters', '1 Example Avenue', 'UTC')
  on conflict (organization_id, lower(name)) do nothing;

  insert into public.locations (organization_id, name, timezone)
  values (v_org, 'Remote', null, 'UTC')
  on conflict (organization_id, lower(name)) do nothing;

  select id into v_engineering from public.departments
   where organization_id = v_org and lower(name) = 'engineering';
  select id into v_people from public.departments
   where organization_id = v_org and lower(name) = 'people & culture';
  select id into v_sales from public.departments
   where organization_id = v_org and lower(name) = 'sales';
  select id into v_hq from public.locations
   where organization_id = v_org and lower(name) = 'headquarters';
  select id into v_remote from public.locations
   where organization_id = v_org and lower(name) = 'remote';

  insert into public.employees
    (organization_id, employee_number, first_name, last_name, work_email,
     job_title, department_id, location_id, employment_type, status, start_date)
  values
    (v_org, 'EMP-001', 'Alex', 'Morgan', 'alex.morgan@example.com',
     'Chief Executive Officer', null, v_hq, 'full_time', 'active', '2019-01-15'),
    (v_org, 'EMP-002', 'Priya', 'Nair', 'priya.nair@example.com',
     'Head of People', v_people, v_hq, 'full_time', 'active', '2020-03-02'),
    (v_org, 'EMP-003', 'Daniel', 'Okoro', 'daniel.okoro@example.com',
     'Engineering Manager', v_engineering, v_remote, 'full_time', 'active', '2020-08-10'),
    (v_org, 'EMP-004', 'Mei', 'Chen', 'mei.chen@example.com',
     'Senior Software Engineer', v_engineering, v_remote, 'full_time', 'active', '2021-06-01'),
    (v_org, 'EMP-005', 'Sofia', 'Alvarez', 'sofia.alvarez@example.com',
     'Account Executive', v_sales, v_hq, 'full_time', 'probation', '2026-09-01'),
    (v_org, 'EMP-006', 'Tom', 'Becker', 'tom.becker@example.com',
     'Software Engineer', v_engineering, v_remote, 'contract', 'active', '2024-02-19')
  on conflict (organization_id, lower(employee_number)) do nothing;

  select id into v_ceo from public.employees
   where organization_id = v_org and employee_number = 'EMP-001';

  update public.employees
     set manager_id = v_ceo
   where organization_id = v_org
     and employee_number in ('EMP-002', 'EMP-003')
     and manager_id is null;

  update public.employees e
     set manager_id = (select id from public.employees m
                        where m.organization_id = v_org and m.employee_number = 'EMP-003')
   where e.organization_id = v_org
     and e.employee_number in ('EMP-004', 'EMP-006')
     and e.manager_id is null;
end $$;
