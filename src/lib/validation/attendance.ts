import { z } from "zod";

import { dateString, optionalText, requiredId } from "@/lib/validation/common";

/** An employee marking their own attendance for today. */
export const markAttendanceSchema = z.object({
  status: z.enum(["present", "remote", "on_leave"], {
    message: "Choose an attendance status",
  }),
  note: optionalText(500),
});

/** Staff recording or correcting a record for any employee and date. */
export const setAttendanceSchema = z.object({
  employeeId: requiredId,
  workDate: dateString,
  status: z.enum(["present", "remote", "on_leave", "absent"], {
    message: "Choose an attendance status",
  }),
  note: optionalText(500),
});
