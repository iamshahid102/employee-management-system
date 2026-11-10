import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login?error=link_invalid");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Choose a new password</CardTitle>
        <CardDescription>
          You are signed in as {session.user.email}. Pick a password you have not
          used before.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <ResetPasswordForm />
        <Link
          href="/dashboard"
          className="block text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Continue to dashboard
        </Link>
      </CardContent>
    </Card>
  );
}
