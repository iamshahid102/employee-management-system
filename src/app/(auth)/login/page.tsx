import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { ConfigurationNotice } from "@/components/configuration-notice";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  if (!isSupabaseConfigured()) {
    return <ConfigurationNotice />;
  }

  const session = await getSession();
  if (session?.profile.organization_id) redirect("/dashboard");

  const params = await searchParams;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Sign in</CardTitle>
        <CardDescription>
          Access is invitation-only. Contact your administrator if you need an
          account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <LoginForm next={params.next} initialError={params.error} />

        <div className="flex items-center justify-between text-sm">
          <Link
            href="/forgot-password"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Forgot password?
          </Link>
          <span className="text-muted-foreground">Invitation-only access</span>
        </div>
      </CardContent>
    </Card>
  );
}
