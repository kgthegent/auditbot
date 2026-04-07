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
  const authUser = await getAuthUser(req);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const portalId = searchParams.get("portal_id");

  if (!portalId) {
    return NextResponse.json({ error: "portal_id required" }, { status: 400 });
  }

  // Verify portal ownership
  const { data: portal } = await supabaseAdmin
    .from("portals")
    .select("id")
    .eq("id", portalId)
    .eq("user_id", authUser.id)
    .single();

  if (!portal) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: audits, error } = await supabaseAdmin
    .from("audits")
    .select("id, score, created_at, completed_at")
    .eq("portal_id", portalId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Audit history fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit history" },
      { status: 500 }
    );
  }

  return NextResponse.json({ audits: audits ?? [] });
}
