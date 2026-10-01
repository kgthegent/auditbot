import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth/session";
import { IncompleteAuditError } from "@/lib/audit/completeness";
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
  const session = readSession(req);
  if (!session) return null;
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("id", session.userId)
    .single();
  return user ?? null;
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { portal_id, hub_id } = await request.json();
    const requestedHubId =
      typeof hub_id === "string" && hub_id.trim()
        ? hub_id.trim()
        : readSession(request)?.hubId;

    if (!portal_id) {
      return NextResponse.json({ error: "portal_id is required" }, { status: 400 });
    }

    // Get portal and verify ownership
    const { data: ownedPortal, error: portalError } = await supabaseAdmin
      .from("portals")
      .select("*")
      .eq("id", portal_id)
      .eq("user_id", authUser.id)
      .single();
    let portal = ownedPortal;

    if (portalError || !portal) {
      portal = await findOwnedPortalFallback(portal_id, authUser.id, requestedHubId);
    }

    if (!portal) {
      return NextResponse.json({ error: "Portal not found" }, { status: 404 });
    }

    // Only persist an audit after every required check completed.
    const checks = await runPlatformAudit(portal);
    const score = calculateScore(checks);

    // Create audit record
    const reportToken = createReportToken();
    let { data: audit, error: auditError } = await supabaseAdmin
      .from("audits")
      .insert({ portal_id: portal.id, score: 0, report_token: reportToken })
      .select()
      .single();

    if (auditError?.message?.includes("report_token")) {
      const fallback = await supabaseAdmin
        .from("audits")
        .insert({ portal_id: portal.id, score: 0 })
        .select()
        .single();
      audit = fallback.data ? { ...fallback.data, report_token: null } : null;
      auditError = fallback.error;
    }

    if (auditError || !audit) {
      return NextResponse.json({ error: "Failed to create audit" }, { status: 500 });
    }

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

    let { data: savedChecks, error: checksError } = await supabaseAdmin
      .from("audit_checks")
      .insert(checkRows)
      .select("id, check_name, severity, count, percentage, status, description, fix_steps, example_records, workflow_status, assigned_to, due_at, notes, resolved_at");

    if (checksError?.message?.includes("example_records") || checksError?.message?.includes("workflow_status")) {
      const fallbackRows = checks.map((check) => ({
        audit_id: audit.id,
        check_name: check.checkName,
        severity: check.severity,
        count: check.count,
        percentage: check.percentage,
        status: check.status,
        description: check.description,
        fix_steps: check.fixSteps,
      }));

      const fallback = await supabaseAdmin
        .from("audit_checks")
        .insert(fallbackRows)
        .select("id, check_name, severity, count, percentage, status, description, fix_steps");

      savedChecks = fallback.data?.map((row) => ({
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

    if (checksError || !savedChecks || savedChecks.length !== checks.length) {
      return NextResponse.json({ error: "Failed to save audit checks" }, { status: 500 });
    }

    // Update audit with score and completion time
    const { data: completedAudit, error: completionError } = await supabaseAdmin
      .from("audits")
      .update({ score, completed_at: new Date().toISOString() })
      .eq("id", audit.id)
      .select("id")
      .single();
    if (completionError || !completedAudit) {
      return NextResponse.json({ error: "Failed to finalize audit. No completed report was published." }, { status: 500 });
    }

    return NextResponse.json({
      audit_id: audit.id,
      report_token: audit.report_token ?? null,
      score,
      checks: savedChecks.map(mapCheckRow),
    });
  } catch (error) {
    if (error instanceof IncompleteAuditError) {
      return NextResponse.json({ error: error.message, status: "incomplete", score: null, failed_checks: error.failedChecks }, { status: 502 });
    }
    console.error("Audit run failed");
    return NextResponse.json(
      { error: "Audit failed. Check your CRM connection." },
      { status: 500 }
    );
  }
}

async function findOwnedPortalFallback(
  portalId: string,
  userId: string,
  hubId?: string | null
) {
  let resolvedHubId = hubId ?? null;

  if (!resolvedHubId) {
    const { data: stalePortal } = await supabaseAdmin
      .from("portals")
      .select("hub_id")
      .eq("id", portalId)
      .single();
    resolvedHubId = stalePortal?.hub_id ?? null;
  }

  if (!resolvedHubId) return null;

  const { data: portal } = await supabaseAdmin
    .from("portals")
    .select("*")
    .eq("hub_id", resolvedHubId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return portal ?? null;
}
