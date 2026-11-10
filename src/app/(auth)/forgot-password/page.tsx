import type { Metadata } from "next";
import Link from "next/link";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Reset your password</CardTitle>
        <CardDescription>
          Enter your work email and we will send a secure reset link.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <ForgotPasswordForm />
        <Link
          href="/login"
          className="block text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      </CardContent>
    </Card>
  );
}
