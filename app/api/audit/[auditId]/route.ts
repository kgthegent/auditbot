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

export async function GET(
  req: NextRequest,
  { params }: { params: { auditId: string } }
) {
  const authUser = await getAuthUser(req);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { auditId } = params;

  const { data: audit, error: auditError } = await supabaseAdmin
    .from("audits")
    .select("*")
    .eq("id", auditId)
    .single();

  if (auditError || !audit) {
    return NextResponse.json({ error: "Audit not found" }, { status: 404 });
  }

  // Verify audit ownership via portal
  const { data: portal } = await supabaseAdmin
    .from("portals")
    .select("id")
    .eq("id", audit.portal_id)
    .eq("user_id", authUser.id)
    .single();

  if (!portal) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: checks, error: checksError } = await supabaseAdmin
    .from("audit_checks")
    .select("*")
    .eq("audit_id", auditId);

  if (checksError) {
    return NextResponse.json({ error: "Failed to load checks" }, { status: 500 });
  }

  return NextResponse.json({ audit, checks });
}
