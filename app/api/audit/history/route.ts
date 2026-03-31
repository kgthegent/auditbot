import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const portalId = searchParams.get("portal_id");

  if (!portalId) {
    return NextResponse.json({ error: "portal_id required" }, { status: 400 });
  }

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
