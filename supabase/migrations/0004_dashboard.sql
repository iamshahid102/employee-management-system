-- =============================================================================
-- 0004 — Dashboard summary
--
-- SECURITY INVOKER: RLS on public.employees applies, so the numbers reflect
-- exactly the rows the caller is allowed to see.
-- =============================================================================
create or replace function public.dashboard_summary(p_window_days integer default 30)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
-- Only the columns granted to `authenticated` may be selected here: 0003
-- revokes table-wide SELECT on public.employees and grants an explicit column
-- list, so `select e.*` would fail with "permission denied for table employees".
with scope as (
  select
    e.id,
    e.first_name,
    e.last_name,
    e.status,
    e.start_date
  from public.employees e
  where e.organization_id = public.auth_org_id()
),
counts as (
  select
    count(*) filter (where e.status in ('active', 'probation', 'on_leave'))::int as headcount,
    count(*) filter (where e.status = 'active')::int as active_count,
    count(*) filter (where e.status = 'probation')::int as probation_count,
    count(*) filter (where e.status = 'on_leave')::int as on_leave_count,
    count(*) filter (where e.status in ('inactive', 'terminated'))::int as inactive_count
  from scope e
),
anniversary_base as (
  select
    e.id,
    e.first_name || ' ' || e.last_name as name,
    (e.start_date
      + (extract(year from age(current_date, e.start_date))::int * interval '1 year')
    )::date as last_anniversary
  from scope e
  where e.status in ('active', 'probation', 'on_leave')
),
anniversaries as (
  select
    a.id,
    a.name,
    case
      when a.last_anniversary >= current_date then a.last_anniversary
      else (a.last_anniversary + interval '1 year')::date
    end as next_date
  from anniversary_base a
),
upcoming_anniversaries as (
  select
    a.id,
    a.name,
    a.next_date as date,
    (a.next_date - current_date)::int as days_away
  from anniversaries a
  where a.next_date between current_date and current_date + p_window_days
  order by a.next_date asc
  limit 5
),
new_starters as (
  select
    e.id,
    e.first_name || ' ' || e.last_name as name,
    e.start_date,
    (current_date - e.start_date)::int as days_ago
  from scope e
  where e.start_date between current_date - p_window_days and current_date
  order by e.start_date desc
  limit 5
)
select jsonb_build_object(
  'headcount', c.headcount,
  'active', c.active_count,
  'probation', c.probation_count,
  'on_leave', c.on_leave_count,
  'inactive', c.inactive_count,
  'departments', (
    select count(*)::int from public.departments d
    where d.organization_id = public.auth_org_id() and d.is_active
  ),
  'locations', (
    select count(*)::int from public.locations l
    where l.organization_id = public.auth_org_id() and l.is_active
  ),
  'anniversaries', coalesce(
    (select jsonb_agg(jsonb_build_object(
      'id', ua.id, 'name', ua.name, 'date', ua.date, 'days_away', ua.days_away
    )) from upcoming_anniversaries ua),
    '[]'::jsonb
  ),
  'new_starters', coalesce(
    (select jsonb_agg(jsonb_build_object(
      'id', ns.id, 'name', ns.name, 'start_date', ns.start_date, 'days_ago', ns.days_ago
    )) from new_starters ns),
    '[]'::jsonb
  )
)
from counts c;
$$;

grant execute on function public.dashboard_summary(integer) to authenticated;
revoke all on function public.dashboard_summary(integer) from anon;
