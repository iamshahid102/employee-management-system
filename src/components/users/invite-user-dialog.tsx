"use client";

import { UserPlus } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import { inviteUserAction } from "@/actions/users";
import { SubmitButton } from "@/components/submit-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ActionState } from "@/lib/errors";
import { ASSIGNABLE_ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/types";

const INITIAL: ActionState = { status: "idle" };

export function InviteUserDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(inviteUserAction, INITIAL);

  useEffect(() => {
    if (state.status === "success") setOpen(false);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus aria-hidden />
          Invite user
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a user</DialogTitle>
          <DialogDescription>
            They receive an email invitation and are added to this organization with the
            role you choose.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4" noValidate>
          {state.status === "error" ? (
            <Alert variant="destructive">
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}

          <Field
            label="Full name"
            htmlFor="invite-name"
            required
            error={state.fieldErrors?.displayName?.[0]}
          >
            <Input
              id="invite-name"
              name="displayName"
              required
              maxLength={120}
              autoComplete="name"
              aria-invalid={Boolean(state.fieldErrors?.displayName)}
            />
          </Field>

          <Field
            label="Work email"
            htmlFor="invite-email"
            required
            error={state.fieldErrors?.email?.[0]}
          >
            <Input
              id="invite-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              aria-invalid={Boolean(state.fieldErrors?.email)}
            />
          </Field>

          <Field
            label="Role"
            htmlFor="invite-role"
            required
            hint="Roles are enforced by database policies."
            error={state.fieldErrors?.role?.[0]}
          >
            <Select name="role" defaultValue="employee">
              <SelectTrigger id="invite-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNABLE_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {ROLE_LABELS[role]} — {ROLE_DESCRIPTIONS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton pendingLabel="Sending…">Send invitation</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
