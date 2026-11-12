import { Skeleton } from "@/components/ui/skeleton";

/** Shared placeholder used by any app route without a tailored skeleton. */
export default function AppSectionLoading() {
  return (
    <div className="space-y-6" aria-busy="true">
      <span className="sr-only">Loading page…</span>

      <div className="space-y-3">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-24 rounded-lg" />
        ))}
      </div>

      <Skeleton className="h-16 rounded-lg" />

      <div className="space-y-3 rounded-lg border p-4">
        <Skeleton className="h-5 w-40" />
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-10" />
        ))}
      </div>
    </div>
  );
}
