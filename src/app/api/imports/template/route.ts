import { getSession } from "@/lib/auth/session";
import { buildTemplateCsv } from "@/lib/csv/template";

export async function GET() {
  const session = await getSession();

  if (!session?.permissions.can_import) {
    return new Response("Forbidden", { status: 403 });
  }

  return new Response(buildTemplateCsv(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="employee-import-template.csv"',
      "Cache-Control": "no-store",
    },
  });
}
