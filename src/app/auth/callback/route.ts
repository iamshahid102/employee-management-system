import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }
  return value;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get("next"));

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL("/", url.origin));
  }

  const supabase = await createClient();

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }

  return NextResponse.redirect(
    new URL("/login?error=link_invalid", url.origin),
  );
}
