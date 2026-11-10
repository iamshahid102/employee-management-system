import type * as React from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FieldProps = {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
};

export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  className,
  children,
}: FieldProps) {
  const descriptionId = `${htmlFor}-description`;
  const errorId = `${htmlFor}-error`;

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required ? (
          <span className="text-destructive" aria-hidden>
            *
          </span>
        ) : null}
      </Label>
      {children}
      {hint && !error ? (
        <p id={descriptionId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
