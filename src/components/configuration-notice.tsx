import { DatabaseZap, FileKey2, TerminalSquare } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const steps = [
  {
    icon: DatabaseZap,
    title: "Create a Supabase project",
    description:
      "Use a dedicated project for development and another for production. Never share credentials between them.",
  },
  {
    icon: FileKey2,
    title: "Add the environment variables",
    description:
      "Copy .env.example to .env.local and fill in the project URL, anon key and service role key.",
  },
  {
    icon: TerminalSquare,
    title: "Apply the migrations",
    description:
      "Run supabase db push, or paste supabase/migrations/*.sql into the SQL editor in filename order.",
  },
];

export function ConfigurationNotice() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center gap-8 px-6 py-16">
      <header className="space-y-3">
        <p className="text-sm font-medium text-primary">Employee Management System</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Connect a Supabase project to get started
        </h1>
        <p className="text-muted-foreground">
          The application is running, but no database is configured yet. Complete the
          steps below and restart the dev server.
        </p>
      </header>

      <div className="grid gap-4">
        {steps.map((step, index) => (
          <Card key={step.title}>
            <CardHeader className="flex-row items-start gap-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <step.icon aria-hidden className="size-4" />
              </span>
              <div className="space-y-1">
                <CardTitle>
                  {index + 1}. {step.title}
                </CardTitle>
                <CardDescription>{step.description}</CardDescription>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Required variables</CardTitle>
          <CardDescription>
            Values are read at runtime; none of them are committed to the repository.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs leading-relaxed">
            {`NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000`}
          </pre>
        </CardContent>
      </Card>
    </main>
  );
}
