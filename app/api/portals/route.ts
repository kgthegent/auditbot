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
    .select("id, hub_id, portal_name")
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

  return NextResponse.json(portal);
}
