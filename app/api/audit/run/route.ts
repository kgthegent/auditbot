import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/client";
import { runAllChecks } from "@/lib/audit/engine";
import { calculateScore } from "@/lib/audit/score";

export async function POST(request: NextRequest) {
  try {
    const { portal_id } = await request.json();

    if (!portal_id) {
      return NextResponse.json({ error: "portal_id is required" }, { status: 400 });
    }

    // Get portal
    const { data: portal, error: portalError } = await supabaseAdmin
      .from("portals")
      .select("*")
      .eq("id", portal_id)
      .single();

    if (portalError || !portal) {
      return NextResponse.json({ error: "Portal not found" }, { status: 404 });
    }

    // Create audit record
    const { data: audit, error: auditError } = await supabaseAdmin
      .from("audits")
      .insert({ portal_id, score: 0 })
      .select()
      .single();

    if (auditError || !audit) {
      return NextResponse.json({ error: "Failed to create audit" }, { status: 500 });
    }

    // Run all checks
    const checks = await runAllChecks(portal.access_token);
    const score = calculateScore(checks);

    // Save check results
    const checkRows = checks.map((check) => ({
      audit_id: audit.id,
      check_name: check.checkName,
      severity: check.severity,
      count: check.count,
      percentage: check.percentage,
      status: check.status,
      description: check.description,
      fix_steps: check.fixSteps,
    }));

    await supabaseAdmin.from("audit_checks").insert(checkRows);

    // Update audit with score and completion time
    await supabaseAdmin
      .from("audits")
      .update({ score, completed_at: new Date().toISOString() })
      .eq("id", audit.id);

    return NextResponse.json({ audit_id: audit.id, score, checks });
  } catch (error) {
    console.error("Audit run error:", error);
    return NextResponse.json(
      { error: "Audit failed. Check your HubSpot connection." },
      { status: 500 }
    );
  }
}
