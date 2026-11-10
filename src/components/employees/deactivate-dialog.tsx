"use client";

import { useTransition } from "react";

import { deactivateEmployeeAction } from "@/actions/employees";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function DeactivateDialog({
  employeeId,
  employeeName,
}: {
  employeeId: string;
  employeeName: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Deactivate
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deactivate {employeeName}?</DialogTitle>
          <DialogDescription>
            The record is kept for historical references and is marked inactive
            with today&apos;s end date. You can reactivate it later.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const formData = new FormData();
                formData.set("employeeId", employeeId);
                await deactivateEmployeeAction(formData);
              })
            }
          >
            {pending ? "Deactivating…" : "Deactivate employee"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
