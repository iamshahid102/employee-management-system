import type { Metadata } from "next";
import { WifiOff } from "lucide-react";

export const metadata: Metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <WifiOff aria-hidden className="size-6" />
      </span>
      <h1 className="text-xl font-semibold">You are offline</h1>
      <p className="text-sm text-muted-foreground">
        Employee records are never stored on this device, so they are unavailable
        without a connection. Reconnect to continue working.
      </p>
      <a
        href="/dashboard"
        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        Try again
      </a>
    </main>
  );
}
