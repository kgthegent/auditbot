import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/client";
import { runPlatformAudit } from "@/lib/audit/runners";
import { calculateScore } from "@/lib/audit/score";
import { CheckResult, ExampleRecord } from "@/types";

export const dynamic = "force-dynamic";

function createReportToken() {
  return randomBytes(24).toString("hex");
}

function mapCheckRow(row: {
  id: string;
  check_name: string;
  severity: CheckResult["severity"];
  count: number;
  percentage: number;
  status: CheckResult["status"];
  description: string;
  fix_steps: string[];
  example_records: ExampleRecord[];
  workflow_status: NonNullable<CheckResult["workflowStatus"]>;
  assigned_to: string | null;
  due_at: string | null;
  notes: string;
  resolved_at: string | null;
}): CheckResult {
  return {
    id: row.id,
    checkName: row.check_name,
    severity: row.severity,
    count: row.count,
    percentage: Number(row.percentage),
    status: row.status,
    description: row.description,
    fixSteps: row.fix_steps,
    exampleRecords: row.example_records,
    workflowStatus: row.workflow_status,
    assignedTo: row.assigned_to,
    dueAt: row.due_at,
    notes: row.notes,
    resolvedAt: row.resolved_at,
  };
}

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

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { portal_id } = await request.json();

    if (!portal_id) {
      return NextResponse.json({ error: "portal_id is required" }, { status: 400 });
    }

    // Get portal and verify ownership
    const { data: portal, error: portalError } = await supabaseAdmin
      .from("portals")
      .select("*")
      .eq("id", portal_id)
      .eq("user_id", authUser.id)
      .single();

    if (portalError || !portal) {
      return NextResponse.json({ error: "Portal not found" }, { status: 404 });
    }

    // Create audit record
    const reportToken = createReportToken();
    const { data: audit, error: auditError } = await supabaseAdmin
      .from("audits")
      .insert({ portal_id, score: 0, report_token: reportToken })
      .select()
      .single();

    if (auditError || !audit) {
      return NextResponse.json({ error: "Failed to create audit" }, { status: 500 });
    }

    const checks = await runPlatformAudit(portal);

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
      example_records: check.exampleRecords ?? [],
    }));

    const { data: savedChecks, error: checksError } = await supabaseAdmin
      .from("audit_checks")
      .insert(checkRows)
      .select("id, check_name, severity, count, percentage, status, description, fix_steps, example_records, workflow_status, assigned_to, due_at, notes, resolved_at");

    if (checksError || !savedChecks) {
      return NextResponse.json({ error: "Failed to save audit checks" }, { status: 500 });
    }

    // Update audit with score and completion time
    await supabaseAdmin
      .from("audits")
      .update({ score, completed_at: new Date().toISOString() })
      .eq("id", audit.id);

    return NextResponse.json({
      audit_id: audit.id,
      report_token: audit.report_token ?? reportToken,
      score,
      checks: savedChecks.map(mapCheckRow),
    });
  } catch (error) {
    console.error("Audit run error:", error);
    return NextResponse.json(
      { error: "Audit failed. Check your CRM connection." },
      { status: 500 }
    );
  }
}
