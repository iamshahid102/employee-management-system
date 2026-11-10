import { NextResponse } from "next/server";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const url = new URL(request.url);

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  return NextResponse.redirect(new URL("/login", url.origin), { status: 303 });
}
