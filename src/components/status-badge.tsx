import { Badge } from "@/components/ui/badge";
import {
  EMPLOYMENT_STATUS_LABELS,
  STATUS_BADGE_VARIANT,
  type EmploymentStatus,
} from "@/lib/types";

export function StatusBadge({ status }: { status: EmploymentStatus }) {
  return (
    <Badge variant={STATUS_BADGE_VARIANT[status]}>
      {EMPLOYMENT_STATUS_LABELS[status]}
    </Badge>
  );
}
