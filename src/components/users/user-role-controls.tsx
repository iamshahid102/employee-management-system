"use client";

import { useTransition } from "react";

import { updateUserActiveAction, updateUserRoleAction } from "@/actions/users";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ActionState } from "@/lib/errors";
import { ASSIGNABLE_ROLES, ROLE_LABELS, type AppRole, type Profile } from "@/lib/types";

const INITIAL: ActionState = { status: "idle" };

export function UserRoleControls({
  profile,
  isSelf,
}: {
  profile: Profile;
  isSelf: boolean;
}) {
  const [pending, startTransition] = useTransition();

  const changeRole = (role: AppRole) => {
    const formData = new FormData();
    formData.set("profileId", profile.id);
    formData.set("role", role);
    startTransition(async () => {
      const result = await updateUserRoleAction(INITIAL, formData);
      if (result.status === "error" && result.message) {
        // Surfacing via alert keeps failures visible without a toast dependency.
        window.alert(result.message);
      }
    });
  };

  const toggleActive = () => {
    const formData = new FormData();
    formData.set("profileId", profile.id);
    formData.set("isActive", String(!profile.is_active));
    startTransition(async () => {
      const result = await updateUserActiveAction(INITIAL, formData);
      if (result.status === "error" && result.message) {
        window.alert(result.message);
      }
    });
  };

  if (isSelf) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{ROLE_LABELS[profile.role]}</Badge>
        <span className="text-xs text-muted-foreground">(you)</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        defaultValue={profile.role}
        onValueChange={(value) => changeRole(value as AppRole)}
        disabled={pending}
      >
        <SelectTrigger size="sm" className="w-[190px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ASSIGNABLE_ROLES.map((role) => (
            <SelectItem key={role} value={role}>
              {ROLE_LABELS[role]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant={profile.is_active ? "outline" : "secondary"}
        size="sm"
        onClick={toggleActive}
        disabled={pending}
      >
        {profile.is_active ? "Deactivate" : "Activate"}
      </Button>

      {profile.is_active ? (
        <Badge variant="success">Active</Badge>
      ) : (
        <Badge variant="muted">Inactive</Badge>
      )}
    </div>
  );
}
