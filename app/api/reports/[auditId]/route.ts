import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/client";
import { CheckResult, ExampleRecord, Platform } from "@/types";

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

export async function GET(
  req: NextRequest,
  { params }: { params: { auditId: string } }
) {
  const token = req.nextUrl.searchParams.get("token");
  const authUser = await getAuthUser(req);

  const { data: audit, error: auditError } = await supabaseAdmin
    .from("audits")
    .select("id, portal_id, score, report_token, created_at, completed_at")
    .eq("id", params.auditId)
    .single();

  if (auditError || !audit) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const { data: portal, error: portalError } = await supabaseAdmin
    .from("portals")
    .select("id, hub_id, portal_name, platform, user_id")
    .eq("id", audit.portal_id)
    .single();

  if (portalError || !portal) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const hasShareToken = !!token && token === audit.report_token;
  const isOwner = !!authUser && portal.user_id === authUser.id;

  if (!hasShareToken && !isOwner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: checks, error: checksError } = await supabaseAdmin
    .from("audit_checks")
    .select("id, check_name, severity, count, percentage, status, description, fix_steps, example_records, workflow_status, assigned_to, due_at, notes, resolved_at")
    .eq("audit_id", audit.id)
    .order("severity", { ascending: true });

  if (checksError) {
    return NextResponse.json({ error: "Failed to load report" }, { status: 500 });
  }

  return NextResponse.json({
    audit: {
      id: audit.id,
      score: audit.score,
      reportToken: audit.report_token,
      createdAt: audit.created_at,
      completedAt: audit.completed_at,
    },
    portal: {
      hubId: portal.hub_id,
      name: portal.portal_name,
      platform: portal.platform as Platform,
    },
    checks: (checks ?? []).map(mapCheckRow),
    viewer: { canEdit: isOwner },
  });
}
