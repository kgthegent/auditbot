export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { isValidEmail } from "@/lib/auth/session";
import { isPlaceholderEmail } from "@/lib/auth/email";
import { sendSignInLink } from "@/lib/auth/magic-links";
import { supabaseAdmin } from "@/lib/supabase/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!isValidEmail(email) || isPlaceholderEmail(email)) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }
    const { data: user } = await supabaseAdmin.from("users").select("id").eq("email", email).single();
    // Preserve a non-enumerating response for unknown addresses.
    if (!user) return NextResponse.json({ ok: true });
    const { data: portal } = await supabaseAdmin.from("portals").select("hub_id")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    await sendSignInLink(email, portal?.hub_id ?? null);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Magic link request failed:", error);
    return NextResponse.json({ error: "Could not send sign-in link" }, { status: 500 });
  }
}
