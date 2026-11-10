import { Download, FileUp, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ImportUploadForm } from "@/components/imports/import-upload-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { IMPORT_STATUS_LABELS, type ImportJob } from "@/lib/types";
import { formatDateTime, pluralize } from "@/lib/utils";

export const metadata: Metadata = { title: "Import & export" };

const STATUS_VARIANT = {
  pending_review: "warning",
  processing: "default",
  completed: "success",
  failed: "destructive",
  cancelled: "muted",
} as const;

export default async function ImportsPage() {
  await requirePermission("can_import");
  const supabase = await createClient();

  const { data } = await supabase
    .from("import_jobs")
    .select(
      "id, filename, status, total_rows, valid_rows, created_rows, skipped_rows, failed_rows, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(10);

  const jobs = (data ?? []) as Array<
    Pick<
      ImportJob,
      | "id"
      | "filename"
      | "status"
      | "total_rows"
      | "valid_rows"
      | "created_rows"
      | "skipped_rows"
      | "failed_rows"
      | "created_at"
    >
  >;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import & export"
        description="Bring employees in from a CSV after reviewing every row, and export only the records you are authorised to see."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileUp aria-hidden className="size-4 text-primary" />
              Import employees
            </CardTitle>
            <CardDescription>
              Download the template, fill it in, then upload it. You will see a
              preview with per-row errors before anything is saved.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ImportUploadForm />
            <Button asChild variant="outline" size="sm">
              <a href="/api/imports/template" download>
                <Download aria-hidden />
                Download CSV template
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck aria-hidden className="size-4 text-primary" />
              Export employees
            </CardTitle>
            <CardDescription>
              Exports contain only records your role can read, with spreadsheet
              formula injection protection applied.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Exports are limited to 5,000 rows. Use the directory filters to narrow
              large organizations before exporting.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm">
                <a href="/api/employees/export" download>
                  <Download aria-hidden />
                  Export all visible employees
                </a>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/employees">Filter in the directory</Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Personal contact fields are never included in exports.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent imports</CardTitle>
          <CardDescription>
            Every import records who ran it and its outcome in the audit log.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <EmptyState
              title="No imports yet"
              description="Uploaded files appear here with their row counts and outcome."
            />
          ) : (
            <ul className="divide-y">
              {jobs.map((job) => (
                <li
                  key={job.id}
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/imports/${job.id}`}
                      className="truncate text-sm font-medium hover:text-primary"
                    >
                      {job.filename}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(job.created_at)} · {pluralize(job.total_rows, "row")}{" "}
                      · {job.created_rows} created
                      {job.skipped_rows > 0 ? ` · ${job.skipped_rows} skipped` : ""}
                      {job.failed_rows > 0 ? ` · ${job.failed_rows} errors` : ""}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANT[job.status]}>
                    {IMPORT_STATUS_LABELS[job.status]}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
