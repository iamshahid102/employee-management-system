import { Badge } from "@/components/ui/badge";
import {
  ATTENDANCE_BADGE_VARIANT,
  ATTENDANCE_STATUS_LABELS,
  type AttendanceStatus,
} from "@/lib/types";

export function AttendanceStatusBadge({ status }: { status: AttendanceStatus }) {
  return (
    <Badge variant={ATTENDANCE_BADGE_VARIANT[status]}>
      {ATTENDANCE_STATUS_LABELS[status]}
    </Badge>
  );
}
