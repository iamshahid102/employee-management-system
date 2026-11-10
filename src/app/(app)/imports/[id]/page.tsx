import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { cancelImportAction, commitImportAction } from "@/actions/imports";
import { SubmitButton } from "@/components/submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  IMPORT_STATUS_LABELS,
  type ImportJob,
  type ImportRowPayload,
} from "@/lib/types";
import { formatDateTime, pluralize } from "@/lib/utils";

export const metadata: Metadata = { title: "Import preview" };

export default async function ImportPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("can_import");
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("import_jobs")
    .select("*")
    .eq("id", id)
    .maybeSingle<ImportJob>();

  if (!data) notFound();

  const job = data;
  const rows = job.payload ?? [];
  const canConfirm = job.status === "pending_review" && job.valid_rows > 0;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          href="/imports"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Back to imports
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{job.filename}</h1>
          <Badge
            variant={
              job.status === "completed"
                ? "success"
                : job.status === "failed"
                  ? "destructive"
                  : job.status === "pending_review"
                    ? "warning"
                    : "muted"
            }
          >
            {IMPORT_STATUS_LABELS[job.status]}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Uploaded {formatDateTime(job.created_at)} · {pluralize(job.total_rows, "row")}{" "}
          · {job.valid_rows} valid
        </p>
      </div>

      {job.status === "completed" ? (
        <Alert variant="success">
          <CheckCircle2 aria-hidden />
          <AlertTitle>Import completed</AlertTitle>
          <AlertDescription>
            {job.created_rows} created, {job.skipped_rows} skipped and{" "}
            {job.failed_rows} rejected. The audit log records this import.
          </AlertDescription>
        </Alert>
      ) : null}

      {job.status === "failed" ? (
        <Alert variant="destructive">
          <XCircle aria-hidden />
          <AlertTitle>No rows were imported</AlertTitle>
          <AlertDescription>
            Fix the reported problems and upload the file again.
          </AlertDescription>
        </Alert>
      ) : null}

      {canConfirm ? (
        <Alert variant="info">
          <AlertTitle>Review before writing</AlertTitle>
          <AlertDescription>
            Nothing has been saved yet. Confirming writes the {job.valid_rows} valid
            rows. Ambiguous duplicates are skipped, never overwritten.
          </AlertDescription>
        </Alert>
      ) : null}

      {job.error_summary.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Rows needing attention</CardTitle>
            <CardDescription>
              {pluralize(job.error_summary.length, "issue")} found while validating
              the file.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-80 overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Row</TableHead>
                    <TableHead className="w-40">Column</TableHead>
                    <TableHead>Problem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {job.error_summary.slice(0, 200).map((error, index) => (
                    <TableRow key={`${error.row}-${index}`}>
                      <TableCell className="tabular-nums">{error.row}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {error.column ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm">{error.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {rows.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Valid rows</CardTitle>
            <CardDescription>
              Showing {Math.min(rows.length, 100)} of {rows.length}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[28rem] overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Row</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Start</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 100).map((row: ImportRowPayload) => (
                    <TableRow key={row.row}>
                      <TableCell className="tabular-nums">{row.row}</TableCell>
                      <TableCell className="text-sm font-medium">
                        {row.first_name} {row.last_name}
                        <span className="block text-xs text-muted-foreground">
                          {row.employee_number}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{row.work_email}</TableCell>
                      <TableCell className="text-sm">
                        {row.department_name ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm">{row.start_date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {job.status === "pending_review" ? (
        <div className="flex flex-wrap items-center gap-3">
          <form action={commitImportAction}>
            <input type="hidden" name="jobId" value={job.id} />
            <SubmitButton pendingLabel="Importing…" disabled={!canConfirm}>
              Confirm import
            </SubmitButton>
          </form>
          <form action={cancelImportAction}>
            <input type="hidden" name="jobId" value={job.id} />
            <Button type="submit" variant="outline">
              Cancel import
            </Button>
          </form>
          <p className="text-xs text-muted-foreground">
            Rows are written in batches of 50.
          </p>
        </div>
      ) : null}
    </div>
  );
}
