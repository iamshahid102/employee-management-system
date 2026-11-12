import { ShieldCheck } from "lucide-react";
import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col bg-muted/40">
      <header className="flex items-center justify-between gap-4 px-4 py-6 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold"
        >
          <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ShieldCheck aria-hidden className="size-4" />
          </span>
          Employee Management
        </Link>
        <ThemeToggle compact />
      </header>

      <main className="flex flex-1 items-start justify-center px-4 pb-16 sm:items-center sm:px-6">
        <div className="w-full max-w-md">{children}</div>
      </main>

      <footer className="px-4 py-6 text-center text-xs text-muted-foreground sm:px-6">
        Authorized HR and management personnel only. All access is logged.
      </footer>
    </div>
  );
}
