import { AttendanceStatusBadge } from "@/components/attendance/attendance-status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AttendanceRecord } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export type AttendanceRow = AttendanceRecord & {
  employeeName: string;
  employeeNumber: string;
};

export function AttendanceTable({ rows }: { rows: AttendanceRow[] }) {
  return (
    <>
      <div className="hidden rounded-lg border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Note</TableHead>
              <TableHead>Recorded</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="text-sm whitespace-nowrap">
                  {formatDate(row.work_date)}
                </TableCell>
                <TableCell>
                  <p className="font-medium">{row.employeeName}</p>
                  <p className="text-xs text-muted-foreground">{row.employeeNumber}</p>
                </TableCell>
                <TableCell>
                  <AttendanceStatusBadge status={row.status} />
                </TableCell>
                <TableCell className="max-w-64 text-sm text-muted-foreground">
                  {row.note ?? "—"}
                </TableCell>
                <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                  {row.source === "hr" ? "By HR / admin" : "Self"}
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
                <p className="font-medium">{row.employeeName}</p>
                <p className="text-xs text-muted-foreground">{row.employeeNumber}</p>
              </div>
              <AttendanceStatusBadge status={row.status} />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div>
                <dt className="text-muted-foreground">Date</dt>
                <dd>{formatDate(row.work_date)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Recorded</dt>
                <dd>{row.source === "hr" ? "By HR / admin" : "Self"}</dd>
              </div>
              {row.note ? (
                <div className="col-span-2">
                  <dt className="text-muted-foreground">Note</dt>
                  <dd>{row.note}</dd>
                </div>
              ) : null}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
