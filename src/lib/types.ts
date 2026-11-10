export type AppRole = "admin" | "hr" | "manager" | "employee";

export type EmploymentType =
  | "full_time"
  | "part_time"
  | "contract"
  | "intern"
  | "temporary";

export type EmploymentStatus =
  | "active"
  | "probation"
  | "on_leave"
  | "terminated"
  | "inactive";

export type ImportStatus =
  | "pending_review"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export interface Organization {
  id: string;
  name: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  organization_id: string | null;
  email: string;
  display_name: string;
  role: AppRole;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

/** Readable employee columns — personal contact fields are excluded by grants. */
export const EMPLOYEE_COLUMNS = [
  "id",
  "organization_id",
  "employee_number",
  "first_name",
  "last_name",
  "work_email",
  "job_title",
  "department_id",
  "location_id",
  "manager_id",
  "user_id",
  "employment_type",
  "status",
  "start_date",
  "end_date",
  "created_at",
  "updated_at",
].join(", ");

export interface Employee {
  id: string;
  organization_id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  work_email: string;
  job_title: string | null;
  department_id: string | null;
  location_id: string | null;
  manager_id: string | null;
  user_id: string | null;
  employment_type: EmploymentType;
  status: EmploymentStatus;
  start_date: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeContact {
  personal_email: string | null;
  phone: string | null;
}

export interface Department {
  id: string;
  organization_id: string;
  name: string;
  parent_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface WorkLocation {
  id: string;
  organization_id: string;
  name: string;
  address: string | null;
  timezone: string | null;
  is_active: boolean;
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  organization_id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  summary: Record<string, unknown>;
  created_at: string;
}

export interface ImportJob {
  id: string;
  organization_id: string;
  created_by: string;
  filename: string;
  status: ImportStatus;
  total_rows: number;
  valid_rows: number;
  created_rows: number;
  skipped_rows: number;
  failed_rows: number;
  error_summary: ImportRowError[];
  payload: ImportRowPayload[] | null;
  created_at: string;
  completed_at: string | null;
}

export interface ImportRowError {
  row: number;
  message: string;
  column?: string;
}

export interface ImportRowPayload {
  row: number;
  employee_number: string;
  first_name: string;
  last_name: string;
  work_email: string;
  personal_email: string | null;
  phone: string | null;
  job_title: string | null;
  department_id: string | null;
  department_name: string | null;
  location_id: string | null;
  location_name: string | null;
  manager_id: string | null;
  manager_employee_number: string | null;
  employment_type: EmploymentType;
  status: EmploymentStatus;
  start_date: string;
  end_date: string | null;
}

export interface DashboardSummary {
  headcount: number;
  active: number;
  probation: number;
  on_leave: number;
  inactive: number;
  departments: number;
  locations: number;
  anniversaries: Array<{
    id: string;
    name: string;
    date: string;
    days_away: number;
  }>;
  new_starters: Array<{
    id: string;
    name: string;
    start_date: string;
    days_ago: number;
  }>;
}

export interface Permissions {
  role: AppRole | "none";
  organization_id: string | null;
  employee_id: string | null;
  can_manage_organization: boolean;
  can_manage_users: boolean;
  can_manage_employees: boolean;
  can_import: boolean;
  can_export: boolean;
  can_view_audit: boolean;
}

export const NO_PERMISSIONS: Permissions = {
  role: "none",
  organization_id: null,
  employee_id: null,
  can_manage_organization: false,
  can_manage_users: false,
  can_manage_employees: false,
  can_import: false,
  can_export: false,
  can_view_audit: false,
};

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Organization admin",
  hr: "HR manager",
  manager: "Manager",
  employee: "Employee",
};

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  admin:
    "Full control of the organization, users, roles and every employee record.",
  hr: "Manages employee records, imports, exports and organization-level reports.",
  manager: "Views direct reports and maintains their team details.",
  employee: "Views their own permitted profile information.",
};

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  full_time: "Full time",
  part_time: "Part time",
  contract: "Contract",
  intern: "Intern",
  temporary: "Temporary",
};

export const EMPLOYMENT_STATUS_LABELS: Record<EmploymentStatus, string> = {
  active: "Active",
  probation: "Probation",
  on_leave: "On leave",
  terminated: "Terminated",
  inactive: "Inactive",
};

export const STATUS_BADGE_VARIANT: Record<
  EmploymentStatus,
  "success" | "warning" | "muted" | "destructive" | "default"
> = {
  active: "success",
  probation: "warning",
  on_leave: "default",
  terminated: "destructive",
  inactive: "muted",
};

export const IMPORT_STATUS_LABELS: Record<ImportStatus, string> = {
  pending_review: "Awaiting confirmation",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

/** Roles an administrator may assign when inviting or editing a user. */
export const ASSIGNABLE_ROLES: AppRole[] = ["admin", "hr", "manager", "employee"];
