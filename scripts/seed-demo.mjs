/**
 * Seeds demo data into the linked Supabase project.
 *
 * Usage: npm run seed:demo   (reads .env.local)
 *
 * Creates (or reuses) a demo organization, four login accounts covering every
 * role, departments, locations, managers and a set of employees so the
 * dashboard, directory, filters and permissions can be exercised.
 *
 * Idempotent: re-running updates the demo users' password and fills in any
 * missing departments, locations or employees.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ORG_NAME = "Acme Demo Pvt Ltd";
const ORG_TIMEZONE = "Asia/Kolkata";
const PASSWORD = "Demo@Pass123";
const DEMO_DOMAIN = "demo.example.com";

const USERS = [
  {
    email: `admin@${DEMO_DOMAIN}`,
    role: "admin",
    fullName: "Aarav Sharma",
    employeeNumber: "EMP-001",
    jobTitle: "Founder & CEO",
    department: null,
    location: "Headquarters",
    employmentType: "full_time",
    status: "active",
    startDate: "2019-01-15",
    managerEmployeeNumber: null,
  },
  {
    email: `hr@${DEMO_DOMAIN}`,
    role: "hr",
    fullName: "Priya Nair",
    employeeNumber: "EMP-002",
    jobTitle: "Head of People",
    department: "People & Culture",
    location: "Headquarters",
    employmentType: "full_time",
    status: "active",
    startDate: "2020-03-02",
    managerEmployeeNumber: "EMP-001",
  },
  {
    email: `manager@${DEMO_DOMAIN}`,
    role: "manager",
    fullName: "Daniel Okoro",
    employeeNumber: "EMP-003",
    jobTitle: "Engineering Manager",
    department: "Engineering",
    location: "Remote",
    employmentType: "full_time",
    status: "active",
    startDate: "2020-08-10",
    managerEmployeeNumber: "EMP-001",
  },
  {
    email: `employee@${DEMO_DOMAIN}`,
    role: "employee",
    fullName: "Mei Chen",
    employeeNumber: "EMP-004",
    jobTitle: "Senior Software Engineer",
    department: "Engineering",
    location: "Remote",
    employmentType: "full_time",
    status: "active",
    startDate: "2021-06-01",
    managerEmployeeNumber: "EMP-003",
  },
];

const DEPARTMENTS = ["Engineering", "People & Culture", "Sales", "Finance"];

const LOCATIONS = [
  { name: "Headquarters", address: "12 MG Road, Bengaluru", timezone: "Asia/Kolkata" },
  { name: "Remote", address: null, timezone: "Asia/Kolkata" },
];

/** Employees without a login account, used to make the directory realistic. */
const EXTRA_EMPLOYEES = [
  {
    employeeNumber: "EMP-005",
    firstName: "Sofia",
    lastName: "Alvarez",
    workEmail: `sofia.alvarez@${DEMO_DOMAIN}`,
    jobTitle: "Account Executive",
    department: "Sales",
    location: "Headquarters",
    employmentType: "full_time",
    status: "probation",
    startDate: "2026-10-01",
    managerEmployeeNumber: "EMP-001",
  },
  {
    employeeNumber: "EMP-006",
    firstName: "Tom",
    lastName: "Becker",
    workEmail: `tom.becker@${DEMO_DOMAIN}`,
    jobTitle: "Software Engineer",
    department: "Engineering",
    location: "Remote",
    employmentType: "contract",
    status: "active",
    startDate: "2024-02-19",
    managerEmployeeNumber: "EMP-003",
  },
  {
    employeeNumber: "EMP-007",
    firstName: "Ishita",
    lastName: "Rao",
    workEmail: `ishita.rao@${DEMO_DOMAIN}`,
    jobTitle: "HR Coordinator",
    department: "People & Culture",
    location: "Headquarters",
    employmentType: "full_time",
    status: "active",
    startDate: "2026-11-02",
    managerEmployeeNumber: "EMP-002",
  },
  {
    employeeNumber: "EMP-008",
    firstName: "Rahul",
    lastName: "Verma",
    workEmail: `rahul.verma@${DEMO_DOMAIN}`,
    jobTitle: "Finance Analyst",
    department: "Finance",
    location: "Headquarters",
    employmentType: "part_time",
    status: "active",
    startDate: "2023-11-20",
    managerEmployeeNumber: "EMP-001",
  },
  {
    employeeNumber: "EMP-009",
    firstName: "Grace",
    lastName: "Kim",
    workEmail: `grace.kim@${DEMO_DOMAIN}`,
    jobTitle: "Product Designer",
    department: "Engineering",
    location: "Remote",
    employmentType: "full_time",
    status: "on_leave",
    startDate: "2022-04-11",
    managerEmployeeNumber: "EMP-003",
  },
  {
    employeeNumber: "EMP-010",
    firstName: "Omar",
    lastName: "Haddad",
    workEmail: `omar.haddad@${DEMO_DOMAIN}`,
    jobTitle: "Sales Intern",
    department: "Sales",
    location: "Headquarters",
    employmentType: "intern",
    status: "active",
    startDate: "2026-11-09",
    managerEmployeeNumber: "EMP-005",
  },
];

function log(...args) {
  console.log(...args);
}

async function findOrganization() {
  const { data, error } = await admin
    .from("organizations")
    .select("id, name")
    .order("created_at", { ascending: true })
    .limit(1);
  if (error) throw error;
  return data?.[0] ?? null;
}

async function createOrganization() {
  const { data, error } = await admin
    .from("organizations")
    .insert({ name: ORG_NAME, timezone: ORG_TIMEZONE })
    .select("id, name")
    .single();
  if (error) throw error;
  log(`Organization created: ${data.name}`);
  return data;
}

async function ensureUser(user, organizationId) {
  const { data: list, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (error) throw error;

  const existing = list.users.find(
    (candidate) => candidate.email?.toLowerCase() === user.email.toLowerCase(),
  );

  if (existing) {
    const { error: updateError } = await admin.auth.admin.updateUserById(existing.id, {
      password: PASSWORD,
      email_confirm: true,
      app_metadata: { organization_id: organizationId, role: user.role },
      user_metadata: { full_name: user.fullName },
    });
    if (updateError) throw updateError;
    log(`User reused:  ${user.email} (${user.role})`);
    return existing.id;
  }

  const { data, error: createError } = await admin.auth.admin.createUser({
    email: user.email,
    password: PASSWORD,
    email_confirm: true,
    app_metadata: { organization_id: organizationId, role: user.role },
    user_metadata: { full_name: user.fullName },
  });
  if (createError) throw createError;
  log(`User created: ${user.email} (${user.role})`);
  return data.user.id;
}

async function ensureProfile(user, userId, organizationId) {
  const { error } = await admin.from("profiles").upsert(
    {
      id: userId,
      organization_id: organizationId,
      email: user.email.toLowerCase(),
      display_name: user.fullName,
      role: user.role,
      is_active: true,
    },
    { onConflict: "id" },
  );
  if (error) throw error;
}

async function ensureDepartments(organizationId) {
  const { data: existing, error } = await admin
    .from("departments")
    .select("id, name")
    .eq("organization_id", organizationId);
  if (error) throw error;

  const byName = new Map(existing.map((row) => [row.name.toLowerCase(), row.id]));
  for (const name of DEPARTMENTS) {
    if (byName.has(name.toLowerCase())) continue;
    const { data, error: insertError } = await admin
      .from("departments")
      .insert({ organization_id: organizationId, name })
      .select("id")
      .single();
    if (insertError) throw insertError;
    byName.set(name.toLowerCase(), data.id);
    log(`Department:   ${name}`);
  }
  return byName;
}

async function ensureLocations(organizationId) {
  const { data: existing, error } = await admin
    .from("locations")
    .select("id, name")
    .eq("organization_id", organizationId);
  if (error) throw error;

  const byName = new Map(existing.map((row) => [row.name.toLowerCase(), row.id]));
  for (const location of LOCATIONS) {
    if (byName.has(location.name.toLowerCase())) continue;
    const { data, error: insertError } = await admin
      .from("locations")
      .insert({ organization_id: organizationId, ...location })
      .select("id")
      .single();
    if (insertError) throw insertError;
    byName.set(location.name.toLowerCase(), data.id);
    log(`Location:     ${location.name}`);
  }
  return byName;
}

/**
 * Employees are inserted (never updated) because a database trigger restricts
 * updates to authenticated admins/HR. Demo rows are therefore replaced on every
 * run so manager and login links can be written in a single insert.
 */
async function resetDemoEmployees(rows, organizationId) {
  const numbers = rows.map((row) => row.employeeNumber);
  const { error } = await admin
    .from("employees")
    .delete()
    .eq("organization_id", organizationId)
    .in("employee_number", numbers);
  if (error) throw error;
}

async function insertEmployees(rows, organizationId, departments, locations, createdBy) {
  const idByNumber = new Map();

  for (const row of rows) {
    const managerId = row.managerEmployeeNumber
      ? (idByNumber.get(row.managerEmployeeNumber) ?? null)
      : null;

    const { data, error } = await admin
      .from("employees")
      .insert({
        organization_id: organizationId,
        employee_number: row.employeeNumber,
        first_name: row.firstName,
        last_name: row.lastName,
        work_email: row.workEmail.toLowerCase(),
        job_title: row.jobTitle,
        department_id: row.department ? departments.get(row.department.toLowerCase()) : null,
        location_id: row.location ? locations.get(row.location.toLowerCase()) : null,
        employment_type: row.employmentType,
        status: row.status,
        start_date: row.startDate,
        manager_id: managerId,
        user_id: row.userId ?? null,
        created_by: createdBy,
      })
      .select("id")
      .single();
    if (error) throw error;

    idByNumber.set(row.employeeNumber, data.id);
    log(`Employee:     ${row.employeeNumber} ${row.firstName} ${row.lastName}`);
  }

  log("Reporting lines linked.");
  return idByNumber;
}

/**
 * Demo attendance for the last few working days, so the attendance page has
 * something to show. Skipped quietly when migration 0005 has not been applied.
 */
async function seedAttendance(organizationId, idByNumber) {
  const isoFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: ORG_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const rows = [];
  for (let daysBack = 0; daysBack < 6; daysBack += 1) {
    const day = new Date(Date.now() - daysBack * 86_400_000);
    const iso = isoFormatter.format(day);
    const weekday = new Date(`${iso}T00:00:00Z`).getUTCDay();
    if (weekday === 0 || weekday === 6) continue;

    [...idByNumber.entries()].forEach(([employeeNumber, employeeId], index) => {
      const status =
        employeeNumber === "EMP-009"
          ? "on_leave"
          : index % 3 === 1
            ? "remote"
            : "present";
      rows.push({
        organization_id: organizationId,
        employee_id: employeeId,
        work_date: iso,
        status,
        note: null,
        source: "self",
      });
    });
  }

  const { error } = await admin
    .from("attendance_records")
    .upsert(rows, { onConflict: "organization_id,employee_id,work_date" });

  if (error) {
    if (/attendance_records/.test(error.message)) {
      log("\nAttendance skipped: apply supabase/migrations/0005_attendance.sql first.");
      return;
    }
    throw error;
  }

  log(`Attendance:   ${rows.length} demo entries`);
}

async function main() {
  log(`Seeding demo data into ${url}\n`);

  let organization = await findOrganization();
  if (!organization) {
    organization = await createOrganization();
  } else {
    log(`Using existing organization: ${organization.name}`);
  }

  const organizationId = organization.id;

  const userIds = {};
  for (const user of USERS) {
    const userId = await ensureUser(user, organizationId);
    userIds[user.role] = userId;
    await ensureProfile(user, userId, organizationId);
  }

  const departments = await ensureDepartments(organizationId);
  const locations = await ensureLocations(organizationId);

  const employeeRows = USERS.map((user) => ({
    employeeNumber: user.employeeNumber,
    firstName: user.fullName.split(" ")[0],
    lastName: user.fullName.split(" ").slice(1).join(" "),
    workEmail: user.email,
    jobTitle: user.jobTitle,
    department: user.department,
    location: user.location,
    employmentType: user.employmentType,
    status: user.status,
    startDate: user.startDate,
    managerEmployeeNumber: user.managerEmployeeNumber,
    userId: userIds[user.role],
  }));

  // Managers must be inserted before their reports, so keep the array ordered.
  const allRows = [...employeeRows, ...EXTRA_EMPLOYEES];
  await resetDemoEmployees(allRows, organizationId);
  const employeeIds = await insertEmployees(
    allRows,
    organizationId,
    departments,
    locations,
    userIds.admin,
  );

  await seedAttendance(organizationId, employeeIds);

  log("\n--- Demo logins (password is the same for all) ---");
  for (const user of USERS) {
    log(`${user.role.padEnd(9)} ${user.email.padEnd(26)} ${PASSWORD}`);
  }
  log("\nOpen http://localhost:3000/login and sign in with any of the above.");
}

main().catch((error) => {
  console.error("\nSeed failed:", error.message ?? error);
  process.exit(1);
});
