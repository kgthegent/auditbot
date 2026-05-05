import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/client";
import { CheckResult, ExampleRecord } from "@/types";

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

  let { data: checks, error: checksError } = await supabaseAdmin
    .from("audit_checks")
    .select("id, check_name, severity, count, percentage, status, description, fix_steps, example_records, workflow_status, assigned_to, due_at, notes, resolved_at")
    .eq("audit_id", auditId);

  if (checksError?.message?.includes("example_records") || checksError?.message?.includes("workflow_status")) {
    const fallback = await supabaseAdmin
      .from("audit_checks")
      .select("id, check_name, severity, count, percentage, status, description, fix_steps")
      .eq("audit_id", auditId);

    checks = fallback.data?.map((row) => ({
      ...row,
      example_records: [],
      workflow_status: "open",
      assigned_to: null,
      due_at: null,
      notes: "",
      resolved_at: null,
    })) ?? null;
    checksError = fallback.error;
  }

  if (checksError) {
    return NextResponse.json({ error: "Failed to load checks" }, { status: 500 });
  }

  return NextResponse.json({
    audit_id: audit.id,
    report_token: audit.report_token ?? null,
    score: audit.score,
    checks: (checks ?? []).map(mapCheckRow),
  });
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
