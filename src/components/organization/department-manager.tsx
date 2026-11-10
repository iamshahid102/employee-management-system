"use client";

import { Pencil, Plus } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import {
  deleteDepartmentAction,
  saveDepartmentAction,
} from "@/actions/organization";
import { ConfirmAction } from "@/components/confirm-action";
import { SubmitButton } from "@/components/submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ActionState } from "@/lib/errors";
import type { Department } from "@/lib/types";

const INITIAL: ActionState = { status: "idle" };

export function DepartmentManager({ departments }: { departments: Department[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [state, formAction] = useActionState(saveDepartmentAction, INITIAL);

  useEffect(() => {
    if (state.status === "success") setOpen(false);
  }, [state]);

  const names = new Map(departments.map((department) => [department.id, department.name]));

  const openCreate = () => {
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (department: Department) => {
    setEditing(department);
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {departments.length} department{departments.length === 1 ? "" : "s"}
        </p>
        <Button size="sm" onClick={openCreate}>
          <Plus aria-hidden />
          Add department
        </Button>
      </div>

      {departments.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No departments yet. Add one to group your employees.
        </p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.map((department) => (
                <TableRow key={department.id}>
                  <TableCell className="font-medium">{department.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {department.parent_id ? (names.get(department.parent_id) ?? "—") : "—"}
                  </TableCell>
                  <TableCell>
                    {department.is_active ? (
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
                        onClick={() => openEdit(department)}
                        aria-label={`Edit ${department.name}`}
                      >
                        <Pencil aria-hidden />
                      </Button>
                      <ConfirmAction
                        triggerLabel="Delete"
                        title={`Delete ${department.name}?`}
                        description="Departments that are still assigned to employees cannot be deleted. Deactivate them instead."
                        confirmLabel="Delete department"
                        action={deleteDepartmentAction}
                        fields={{ id: department.id }}
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
        <DialogTrigger className="hidden" aria-hidden />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? `Edit ${editing.name}` : "Add department"}
            </DialogTitle>
            <DialogDescription>
              Departments organise employees and can be nested under a parent department.
            </DialogDescription>
          </DialogHeader>

          <form action={formAction} className="space-y-4" noValidate>
            {editing ? <input type="hidden" name="id" value={editing.id} /> : null}

            {state.status === "error" ? (
              <Alert variant="destructive">
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
            ) : null}

            <Field
              label="Name"
              htmlFor="department-name"
              required
              error={state.fieldErrors?.name?.[0]}
            >
              <Input
                id="department-name"
                name="name"
                required
                maxLength={120}
                defaultValue={editing?.name ?? ""}
                aria-invalid={Boolean(state.fieldErrors?.name)}
              />
            </Field>

            <Field
              label="Parent department"
              htmlFor="department-parent"
              error={state.fieldErrors?.parentId?.[0]}
            >
              <Select
                name="parentId"
                defaultValue={editing?.parent_id ?? "none"}
              >
                <SelectTrigger id="department-parent" className="w-full">
                  <SelectValue placeholder="No parent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No parent</SelectItem>
                  {departments
                    .filter((department) => department.id !== editing?.id)
                    .map((department) => (
                      <SelectItem key={department.id} value={department.id}>
                        {department.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </Field>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                name="isActive"
                defaultChecked={editing?.is_active ?? true}
              />
              Active
            </label>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <SubmitButton pendingLabel="Saving…">
                {editing ? "Save changes" : "Create department"}
              </SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
