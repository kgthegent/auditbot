import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/client";

export async function GET(req: NextRequest) {
  const hubId = req.nextUrl.searchParams.get("hub_id");

  if (!hubId) {
    return NextResponse.json(
      { error: "hub_id query parameter is required" },
      { status: 400 }
    );
  }

  const { data: portal, error } = await supabaseAdmin
    .from("portals")
    .select("id, hub_id, portal_name, user_id, users(plan)")
    .eq("hub_id", hubId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !portal) {
    return NextResponse.json(
      { error: "No portal found for this hub_id" },
      { status: 404 }
    );
  }

  const plan = (portal.users as { plan?: string } | null)?.plan ?? "free";
  return NextResponse.json({ id: portal.id, hub_id: portal.hub_id, portal_name: portal.portal_name, plan });
}
