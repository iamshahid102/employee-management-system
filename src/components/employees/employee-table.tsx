import Link from "next/link";

import { StatusBadge } from "@/components/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import type { Employee } from "@/lib/types";

export type EmployeeRow = Employee & {
  departmentName: string | null;
  locationName: string | null;
};

export function EmployeeTable({ rows }: { rows: EmployeeRow[] }) {
  return (
    <>
      <div className="hidden rounded-lg border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Job title</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Start date</TableHead>
              <TableHead className="text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <Link
                    href={`/employees/${row.id}`}
                    className="font-medium hover:text-primary"
                  >
                    {row.first_name} {row.last_name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {row.employee_number} · {row.work_email}
                  </p>
                </TableCell>
                <TableCell className="text-sm">{row.job_title ?? "—"}</TableCell>
                <TableCell className="text-sm">
                  {row.departmentName ?? "—"}
                  {row.locationName ? (
                    <span className="block text-xs text-muted-foreground">
                      {row.locationName}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell>
                  <StatusBadge status={row.status} />
                </TableCell>
                <TableCell className="text-sm whitespace-nowrap">
                  {formatDate(row.start_date)}
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/employees/${row.id}`}
                    className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    View
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="space-y-3 md:hidden">
        {rows.map((row) => (
          <li key={row.id} className="rounded-lg border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/employees/${row.id}`}
                  className="font-medium hover:text-primary"
                >
                  {row.first_name} {row.last_name}
                </Link>
                <p className="truncate text-xs text-muted-foreground">
                  {row.employee_number} · {row.work_email}
                </p>
              </div>
              <StatusBadge status={row.status} />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div>
                <dt className="text-muted-foreground">Job title</dt>
                <dd>{row.job_title ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Department</dt>
                <dd>{row.departmentName ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Location</dt>
                <dd>{row.locationName ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Start date</dt>
                <dd>{formatDate(row.start_date)}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
