import { Skeleton } from "@/components/ui/skeleton";

export default function AttendanceLoading() {
  return (
    <div className="space-y-4" aria-busy="true">
      <span className="sr-only">Loading attendance…</span>

      <div className="space-y-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 rounded-lg border p-6 lg:col-span-2">
          <div className="space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>

        <div className="space-y-4 rounded-lg border p-6">
          <div className="space-y-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3 w-40" />
          </div>
          {Array.from({ length: 4 }).map((_, row) => (
            <div key={row} className="flex items-center justify-between gap-3">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-4 w-6" />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 rounded-lg border p-6">
        <div className="space-y-2">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-3 w-56" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
          <Skeleton className="h-9 sm:col-span-2" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, row) => (
            <div key={row} className="flex items-center gap-4">
              <Skeleton className="h-3 w-24 shrink-0" />
              <div className="w-full space-y-1.5">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-5 w-20 shrink-0" />
              <Skeleton className="hidden h-3 w-40 sm:block" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
