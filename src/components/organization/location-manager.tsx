"use client";

import { Pencil, Plus } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import { deleteLocationAction, saveLocationAction } from "@/actions/organization";
import { ConfirmAction } from "@/components/confirm-action";
import { SubmitButton } from "@/components/submit-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ActionState } from "@/lib/errors";
import type { WorkLocation } from "@/lib/types";

const INITIAL: ActionState = { status: "idle" };

export function LocationManager({ locations }: { locations: WorkLocation[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WorkLocation | null>(null);
  const [state, formAction] = useActionState(saveLocationAction, INITIAL);

  useEffect(() => {
    if (state.status === "success") setOpen(false);
  }, [state]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {locations.length} location{locations.length === 1 ? "" : "s"}
        </p>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus aria-hidden />
          Add location
        </Button>
      </div>

      {locations.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No locations yet. Add offices or remote regions to assign employees.
        </p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Timezone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.map((location) => (
                <TableRow key={location.id}>
                  <TableCell className="font-medium">{location.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {location.address ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {location.timezone ?? "—"}
                  </TableCell>
                  <TableCell>
                    {location.is_active ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="muted">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => {
                          setEditing(location);
                          setOpen(true);
                        }}
                        aria-label={`Edit ${location.name}`}
                      >
                        <Pencil aria-hidden />
                      </Button>
                      <ConfirmAction
                        triggerLabel="Delete"
                        title={`Delete ${location.name}?`}
                        description="Locations that are still assigned to employees cannot be deleted. Deactivate them instead."
                        confirmLabel="Delete location"
                        action={deleteLocationAction}
                        fields={{ id: location.id }}
                        variant="ghost"
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.name}` : "Add location"}</DialogTitle>
            <DialogDescription>
              Locations describe where people work, including remote regions.
            </DialogDescription>
          </DialogHeader>

          <form action={formAction} className="space-y-4" noValidate>
            {editing ? <input type="hidden" name="id" value={editing.id} /> : null}

            {state.status === "error" ? (
              <Alert variant="destructive">
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
            ) : null}

            <Field label="Name" htmlFor="location-name" required error={state.fieldErrors?.name?.[0]}>
              <Input
                id="location-name"
                name="name"
                required
                maxLength={120}
                defaultValue={editing?.name ?? ""}
                aria-invalid={Boolean(state.fieldErrors?.name)}
              />
            </Field>

            <Field label="Address" htmlFor="location-address" error={state.fieldErrors?.address?.[0]}>
              <Input
                id="location-address"
                name="address"
                maxLength={240}
                defaultValue={editing?.address ?? ""}
              />
            </Field>

            <Field label="Timezone" htmlFor="location-timezone" hint="For example Europe/London.">
              <Input
                id="location-timezone"
                name="timezone"
                maxLength={64}
                defaultValue={editing?.timezone ?? ""}
              />
            </Field>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox name="isActive" defaultChecked={editing?.is_active ?? true} />
              Active
            </label>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <SubmitButton pendingLabel="Saving…">
                {editing ? "Save changes" : "Create location"}
              </SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
