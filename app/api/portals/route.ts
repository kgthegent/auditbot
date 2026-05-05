import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

async function getAuthUser(req: NextRequest) {
  const email = req.cookies.get("sa_email")?.value;
  if (!email) return null;
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", email)
    .single();
  return user ?? null;
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const hubId = req.nextUrl.searchParams.get("hub_id");

  if (!hubId) {
    return NextResponse.json(
      { error: "hub_id query parameter is required" },
      { status: 400 }
    );
  }

  let { data: portal, error } = await supabaseAdmin
    .from("portals")
    .select("id, hub_id, portal_name, platform, user_id, users(plan)")
    .eq("hub_id", hubId)
    .eq("user_id", user.id)  // ownership check
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error?.message?.includes("platform")) {
    const fallback = await supabaseAdmin
      .from("portals")
      .select("id, hub_id, portal_name, user_id, users(plan)")
      .eq("hub_id", hubId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    portal = fallback.data ? { ...fallback.data, platform: "hubspot" } : null;
    error = fallback.error;
  }

  if (error || !portal) {
    return NextResponse.json(
      { error: "No portal found for this hub_id" },
      { status: 404 }
    );
  }

  const plan = (portal.users as { plan?: string } | null)?.plan ?? "free";
  const platform = portal.platform || "hubspot";
  return NextResponse.json({ id: portal.id, hub_id: portal.hub_id, portal_name: portal.portal_name, platform, plan });
}
