import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SetupForm } from "@/components/setup/setup-form";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Set up your organization" };

export default async function SetupPage() {
  const session = await requireSession();

  if (session.profile.organization_id) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center gap-6 px-6 py-16">
      <div className="flex justify-end">
        <ThemeToggle compact />
      </div>

      <header className="space-y-2">
        <p className="text-sm font-medium text-primary">Welcome</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Create your organization
        </h1>
        <p className="text-sm text-muted-foreground">
          You are signed in as {session.user.email}. Creating the organization makes
          you its administrator; invite your colleagues next.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Organization details</CardTitle>
          <CardDescription>
            You can adjust these later in organization settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SetupForm defaultTimezone="UTC" />
        </CardContent>
      </Card>
    </main>
  );
}
