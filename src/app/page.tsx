import { redirect } from "next/navigation";

import { ConfigurationNotice } from "@/components/configuration-notice";
import { isSupabaseConfigured } from "@/lib/env";

export default function HomePage() {
  if (!isSupabaseConfigured()) {
    return <ConfigurationNotice />;
  }

  redirect("/dashboard");
}
