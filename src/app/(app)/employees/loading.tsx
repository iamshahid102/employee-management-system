import { Skeleton } from "@/components/ui/skeleton";

export default function EmployeesLoading() {
  return (
    <div className="space-y-4" aria-busy="true">
      <span className="sr-only">Loading employees…</span>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-full max-w-md" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>

      <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-5">
        <Skeleton className="h-9 sm:col-span-2 lg:col-span-1" />
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-9" />
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border">
        <div className="flex items-center gap-4 border-b bg-muted/40 px-4 py-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-3 flex-1" />
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, row) => (
          <div key={row} className="flex items-center gap-4 border-b px-4 py-4 last:border-b-0">
            <div className="flex flex-1 items-center gap-3">
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <div className="w-full space-y-2">
                <Skeleton className="h-3.5 w-36" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
            <Skeleton className="hidden h-3 flex-1 sm:block" />
            <Skeleton className="hidden h-3 flex-1 sm:block" />
            <Skeleton className="h-5 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
