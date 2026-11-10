"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SubmitButtonProps = React.ComponentProps<typeof Button> & {
  pendingLabel?: string;
};

export function SubmitButton({
  children,
  pendingLabel,
  className,
  disabled,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending || disabled}
      aria-disabled={pending || disabled}
      className={cn(className)}
      {...props}
    >
      {pending ? (
        <>
          <Loader2 aria-hidden className="animate-spin" />
          {pendingLabel ?? "Working…"}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
