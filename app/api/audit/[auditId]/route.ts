import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/client";

export async function GET(
  _request: NextRequest,
  { params }: { params: { auditId: string } }
) {
  const { auditId } = params;

  const { data: audit, error: auditError } = await supabaseAdmin
    .from("audits")
    .select("*")
    .eq("id", auditId)
    .single();

  if (auditError || !audit) {
    return NextResponse.json({ error: "Audit not found" }, { status: 404 });
  }

  const { data: checks, error: checksError } = await supabaseAdmin
    .from("audit_checks")
    .select("*")
    .eq("audit_id", auditId);

  if (checksError) {
    return NextResponse.json({ error: "Failed to load checks" }, { status: 500 });
  }

  return NextResponse.json({ audit, checks });
}
