# Employee Management System

A secure, responsive employee-management web application for HR teams, built with
**Next.js 16 (App Router) + TypeScript**, **Tailwind CSS**, **shadcn/ui-style components**,
and **Supabase** (PostgreSQL, Auth, Row Level Security). It installs as a **Progressive Web App**
and deliberately never caches employee data for offline use.

This repository implements the scope defined in
[`EMPLOYEE-MANAGEMENT-SYSTEM-PLAN.md`](./EMPLOYEE-MANAGEMENT-SYSTEM-PLAN.md).

---

## Feature scope (MVP)

| Area | What is implemented |
| --- | --- |
| **Authentication** | Supabase Auth email/password sign-in, sign-out, password recovery, invitation-based provisioning, protected routes. |
| **Authorization** | Four roles — `admin`, `hr`, `manager`, `employee`. Enforced by PostgreSQL RLS plus explicit server-side permission checks. |
| **Dashboard** | Headcount, active employees, departments, locations, new starters and work anniversaries for the last/next 30 days — filtered by the caller's permissions. |
| **Employee directory** | Search, filter (department, location, status, employment type), sort, pagination, detail view, create/edit with validation, soft deactivate. |
| **Organization setup** | Departments (with nesting), work locations, user roles, manager/report assignment. |
| **CSV** | Downloadable template, import with preview + per-row validation, explicit confirm, batched writes, sanitized error report, safe authorized export with formula-injection protection. |
| **Auditability** | Database triggers write `audit_logs` for employee, role and import changes. |
| **PWA** | Web app manifest, generated icons, service worker caching only the app shell and static assets, install prompt support. |
| **Quality** | Vitest unit tests for validation, CSV parsing/mapping/escaping, duplicate detection and date/status rules. |

Out of scope by design: payroll, benefits, legal compliance, leave management, document storage,
multi-organization administration and localization — see the plan's follow-on releases.

---

## Architecture at a glance

```
Browser → Next.js (App Router, RSC + Server Actions/Route Handlers)
        → Supabase client (user session, anon key)
        → PostgreSQL with RLS as the final authorization boundary
```

- Reads happen in **Server Components**; mutations are **Server Actions** that re-validate every input
  with Zod and re-check permissions server-side.
- The **service-role key is used in exactly one place** — invitation provisioning — inside a
  server-only module.
- Database migrations live in [`supabase/migrations`](./supabase/migrations) and are the only way to
  change schema. RLS policies are versioned with the schema.
- PWA caching is restricted to the application shell; `/api/*` and authenticated pages are never cached.

---

## Local setup

### 1. Prerequisites

- Node.js **20.9+** (developed on Node 24)
- npm
- A Supabase project (free tier is fine) or a local Supabase stack via the Supabase CLI

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

| Variable | Where to find it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → service_role key (**server only**) |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` locally; your deployed origin in production |

The application starts without these values and shows a configuration notice instead of
crashing, but no data features work until they are set.

### 4. Apply the database schema

Either use the Supabase CLI:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

or paste the files from `supabase/migrations` into the Supabase SQL editor **in filename order**.

### 5. Create the first administrator

1. Sign up / sign in with the email that should own the organization.
2. The app detects that you have no organization and sends you to `/setup`.
3. Create the organization there. You become its `admin`.

Every additional user is **invited** from **Users & roles** by an admin (invitation email),
which provisions the account and its profile with the correct organization and role.
For production, disable public sign-ups in Supabase Auth settings so access is invitation-only.

### 6. Optional sample data

For local development, `supabase/seed.sql` adds a few departments, locations and employees
to the first organization. It is safe to re-run and never creates an organization itself.

```bash
psql "$DATABASE_URL" -f supabase/seed.sql
```

### 7. Run

```bash
npm run dev
```

Open http://localhost:3000.

---

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm test` | Vitest unit tests |
| `npm run icons` | Regenerate PWA PNG icons |

---

## Roles and permissions (summary)

| Capability | admin | hr | manager | employee |
| --- | :-: | :-: | :-: | :-: |
| Organization settings, departments, locations | ✅ | ✅ | — | — |
| Invite users, change roles, deactivate accounts | ✅ | — | — | — |
| View all employee records | ✅ | ✅ | — | — |
| View own record | ✅ | ✅ | ✅ | ✅ |
| View direct reports | ✅ | ✅ | ✅ | — |
| Create / edit / deactivate employees | ✅ | ✅ | limited fields, direct reports | — |
| CSV import / export | ✅ | ✅ | export by permission | — |
| View audit log | ✅ | ✅ | — | — |

Authoritative rules live in `supabase/migrations/*_rls.sql`; UI affordances are only a reflection of
those rules. Cross-organization access is denied by policy, not by route guards.

---

## Security notes

- RLS is enabled on **every** user-accessible table, with explicit per-role policies.
- Roles are never read from submitted form data; admin role changes go through a
  `SECURITY DEFINER` function that verifies the caller.
- Manager edits are restricted to an explicit allow-list of employee columns by a database trigger.
- CSV export escapes values and prefixes spreadsheet formula starters (`=`, `+`, `-`, `@`) so exported
  files cannot execute formulas.
- Imported files are parsed with `csv-parse`, size-limited, and validated row by row before any write;
  raw rows are discarded after the import completes.
- The service worker never caches employee records, API responses or authenticated documents.
- Errors returned to the UI never contain database internals.

Operational requirements (backups, retention, incident response, account offboarding) are listed in
the plan, section 7, and must be agreed with the organization before production launch.

---

## Project structure

```
src/
├─ app/                    # App Router routes (auth, dashboard, employees, org, imports, audit)
├─ components/
│  ├─ ui/                  # shadcn/ui-style primitives
│  └─ ...                  # Feature components (tables, forms, import wizard, shell)
├─ lib/
│  ├─ supabase/            # Browser, server, admin and proxy clients
│  ├─ auth/                # Session, permission and role helpers
│  ├─ csv/                 # Parsing, mapping, escaping, template, export
│  └─ validation/          # Shared Zod schemas
├─ actions/                # Server Actions (mutations)
├─ tests/                  # Vitest suites
└─ proxy.ts                # Session refresh + optimistic route protection (Next 16 proxy)
supabase/
├─ migrations/             # Schema + RLS, applied in order
└─ seed.sql                # Optional sample organization data
```

---

## Verification before release

- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`
- The service worker registers only in production builds. Installability and offline
  behaviour must therefore be checked against `npm run build && npm start` on `localhost`
  (a secure context), not against `npm run dev`.
- Walk the acceptance criteria in plan section 9: employee CRUD, cross-organization denial,
  import preview with per-row errors, non-destructive duplicate handling, authorized export,
  installability and offline privacy.

Database policy tests (pgTAP) and end-to-end tests (Playwright) are the next layer of coverage and
need a running Supabase instance; the unit-test suite runs without any external services.
