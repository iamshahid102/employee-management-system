import { ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="px-6 py-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold"
        >
          <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ShieldCheck aria-hidden className="size-4" />
          </span>
          Employee Management
        </Link>
      </header>

      <main className="flex flex-1 items-start justify-center px-6 pb-16 sm:items-center">
        <div className="w-full max-w-md">{children}</div>
      </main>

      <footer className="px-6 py-6 text-center text-xs text-muted-foreground">
        Authorized HR and management personnel only. All access is logged.
      </footer>
    </div>
  );
}
