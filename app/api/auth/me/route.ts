export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/client";

export async function GET(req: NextRequest) {
  const session = readSession(req);
  if (!session) return NextResponse.json({ authenticated: false });
  const { data: user } = await supabaseAdmin.from("users").select("email").eq("id", session.userId).single();
  if (!user) return NextResponse.json({ authenticated: false });
  return NextResponse.json({ authenticated: true, email: user.email, hub_id: session.hubId });
}
