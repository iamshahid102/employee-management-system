"use client";

import { useActionState } from "react";

import { createEmployeeAction, updateEmployeeAction } from "@/actions/employees";
import { SubmitButton } from "@/components/submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ActionState } from "@/lib/errors";
import {
  EMPLOYMENT_STATUS_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  type Employee,
  type EmployeeContact,
  type EmploymentStatus,
  type EmploymentType,
} from "@/lib/types";

const INITIAL: ActionState = { status: "idle" };

export type Option = { id: string; name: string };

type EmployeeFormProps = {
  mode: "create" | "edit";
  employee?: Employee;
  contact?: EmployeeContact | null;
  departments: Option[];
  locations: Option[];
  managers: Option[];
  fullAccess: boolean;
};

const STATUSES: EmploymentStatus[] = [
  "active",
  "probation",
  "on_leave",
  "terminated",
  "inactive",
];

const TYPES: EmploymentType[] = [
  "full_time",
  "part_time",
  "contract",
  "intern",
  "temporary",
];

function OptionSelect({
  id,
  name,
  defaultValue,
  placeholder,
  options,
}: {
  id: string;
  name: string;
  defaultValue?: string | null;
  placeholder: string;
  options: Option[];
}) {
  return (
    <Select name={name} defaultValue={defaultValue ?? "none"}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">{placeholder}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            {option.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function EmployeeForm({
  mode,
  employee,
  contact,
  departments,
  locations,
  managers,
  fullAccess,
}: EmployeeFormProps) {
  const [state, formAction] = useActionState(
    mode === "create" ? createEmployeeAction : updateEmployeeAction,
    INITIAL,
  );

  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-8" noValidate>
      {employee ? (
        <input type="hidden" name="employeeId" value={employee.id} />
      ) : null}

      {state.status === "error" ? (
        <Alert variant="destructive">
          <AlertTitle>Could not save the employee</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      {state.status === "success" ? (
        <Alert variant="success">
          <AlertTitle>Saved</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      {fullAccess ? (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Identity
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Employee number"
              htmlFor="employeeNumber"
              required
              error={errors.employeeNumber?.[0]}
            >
              <Input
                id="employeeNumber"
                name="employeeNumber"
                required
                maxLength={40}
                defaultValue={employee?.employee_number}
                aria-invalid={Boolean(errors.employeeNumber)}
                placeholder="EMP-042"
              />
            </Field>
            <Field
              label="Work email"
              htmlFor="workEmail"
              required
              error={errors.workEmail?.[0]}
            >
              <Input
                id="workEmail"
                name="workEmail"
                type="email"
                required
                maxLength={160}
                defaultValue={employee?.work_email}
                aria-invalid={Boolean(errors.workEmail)}
                placeholder="name@company.com"
              />
            </Field>
            <Field
              label="First name"
              htmlFor="firstName"
              required
              error={errors.firstName?.[0]}
            >
              <Input
                id="firstName"
                name="firstName"
                required
                maxLength={80}
                defaultValue={employee?.first_name}
                aria-invalid={Boolean(errors.firstName)}
              />
            </Field>
            <Field
              label="Last name"
              htmlFor="lastName"
              required
              error={errors.lastName?.[0]}
            >
              <Input
                id="lastName"
                name="lastName"
                required
                maxLength={80}
                defaultValue={employee?.last_name}
                aria-invalid={Boolean(errors.lastName)}
              />
            </Field>
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Role
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Job title" htmlFor="jobTitle" error={errors.jobTitle?.[0]}>
            <Input
              id="jobTitle"
              name="jobTitle"
              maxLength={120}
              defaultValue={employee?.job_title ?? ""}
              aria-invalid={Boolean(errors.jobTitle)}
              placeholder="Senior Engineer"
            />
          </Field>

          <Field label="Department" htmlFor="departmentId" error={errors.departmentId?.[0]}>
            <OptionSelect
              id="departmentId"
              name="departmentId"
              defaultValue={employee?.department_id}
              placeholder="No department"
              options={departments}
            />
          </Field>

          <Field label="Location" htmlFor="locationId" error={errors.locationId?.[0]}>
            <OptionSelect
              id="locationId"
              name="locationId"
              defaultValue={employee?.location_id}
              placeholder="No location"
              options={locations}
            />
          </Field>
        </div>
      </section>

      {fullAccess ? (
        <>
          <section className="space-y-4">
            <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Employment
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Employment type"
                htmlFor="employmentType"
                required
                error={errors.employmentType?.[0]}
              >
                <Select
                  name="employmentType"
                  defaultValue={employee?.employment_type ?? "full_time"}
                >
                  <SelectTrigger id="employmentType" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {EMPLOYMENT_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field
                label="Status"
                htmlFor="status"
                required
                error={errors.status?.[0]}
              >
                <Select name="status" defaultValue={employee?.status ?? "active"}>
                  <SelectTrigger id="status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {EMPLOYMENT_STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field
                label="Start date"
                htmlFor="startDate"
                required
                error={errors.startDate?.[0]}
              >
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  required
                  defaultValue={employee?.start_date}
                  aria-invalid={Boolean(errors.startDate)}
                />
              </Field>

              <Field
                label="End date"
                htmlFor="endDate"
                hint="Leave blank for current employees."
                error={errors.endDate?.[0]}
              >
                <Input
                  id="endDate"
                  name="endDate"
                  type="date"
                  defaultValue={employee?.end_date ?? ""}
                  aria-invalid={Boolean(errors.endDate)}
                />
              </Field>

              <Field
                label="Manager"
                htmlFor="managerId"
                error={errors.managerId?.[0]}
                className="sm:col-span-2"
              >
                <OptionSelect
                  id="managerId"
                  name="managerId"
                  defaultValue={employee?.manager_id}
                  placeholder="No manager"
                  options={managers}
                />
              </Field>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Personal contact
            </h2>
            <p className="text-xs text-muted-foreground">
              Visible to administrators, HR and the employee only.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Personal email"
                htmlFor="personalEmail"
                error={errors.personalEmail?.[0]}
              >
                <Input
                  id="personalEmail"
                  name="personalEmail"
                  type="email"
                  defaultValue={contact?.personal_email ?? ""}
                  aria-invalid={Boolean(errors.personalEmail)}
                />
              </Field>

              <Field label="Phone" htmlFor="phone" error={errors.phone?.[0]}>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  defaultValue={contact?.phone ?? ""}
                  aria-invalid={Boolean(errors.phone)}
                />
              </Field>
            </div>
          </section>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          You can update the job title, department and location of your direct
          reports. Other fields are managed by HR.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingLabel="Saving…">
          {mode === "create" ? "Create employee" : "Save changes"}
        </SubmitButton>
        <p className="text-xs text-muted-foreground">
          Changes are recorded in the audit log.
        </p>
      </div>

    </form>
  );
}
