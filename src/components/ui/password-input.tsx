"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Password field with a show/hide toggle. All other input props (name, id,
 * autoComplete, aria-invalid, …) pass straight through to the input so it keeps
 * working inside a plain <form> with server actions.
 */
export function PasswordInput({
  className,
  ...props
}: React.ComponentProps<"input">) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        className={cn(
          // Room for the toggle, and hide the native reveal control that Edge
          // and IE add (it would sit on top of our own button).
          "pr-9 [&::-ms-clear]:hidden [&::-ms-reveal]:hidden",
          className,
        )}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        aria-controls={props.id}
        title={visible ? "Hide password" : "Show password"}
        className="absolute top-1/2 right-1 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40"
      >
        {visible ? (
          <EyeOff aria-hidden className="size-4" />
        ) : (
          <Eye aria-hidden className="size-4" />
        )}
      </button>
    </div>
  );
}
