import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/client";
import { CheckResult } from "@/types";

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
  const hubId = searchParams.get("hub_id") || req.cookies.get("sa_hub_id")?.value;

  let portalQuery = supabaseAdmin
    .from("portals")
    .select("id, hub_id, portal_name, platform")
    .eq("user_id", authUser.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (portalId) portalQuery = portalQuery.eq("id", portalId);
  else if (hubId) portalQuery = portalQuery.eq("hub_id", hubId);
  else {
    return NextResponse.json({ error: "portal_id or hub_id required" }, { status: 400 });
  }

  const { data: portals } = await portalQuery;
  const portal = portals?.[0];

  if (!portal) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let { data: audits, error } = await supabaseAdmin
    .from("audits")
    .select("id, score, report_token, created_at, completed_at")
    .eq("portal_id", portal.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error?.message?.includes("report_token")) {
    const fallback = await supabaseAdmin
      .from("audits")
      .select("id, score, created_at, completed_at")
      .eq("portal_id", portal.id)
      .order("created_at", { ascending: false })
      .limit(50);

    audits = fallback.data?.map((audit) => ({ ...audit, report_token: null })) ?? null;
    error = fallback.error;
  }

  if (error) {
    console.error("Audit history fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit history" },
      { status: 500 }
    );
  }

  const auditIds = (audits ?? []).map((audit) => audit.id);
  let checks: {
    audit_id: string;
    status: CheckResult["status"];
    severity: CheckResult["severity"];
    count: number;
    workflow_status?: NonNullable<CheckResult["workflowStatus"]>;
  }[] = [];

  if (auditIds.length > 0) {
    const checksResult = await supabaseAdmin
      .from("audit_checks")
      .select("audit_id, status, severity, count, workflow_status")
      .in("audit_id", auditIds);

    if (checksResult.error?.message?.includes("workflow_status")) {
      const fallbackChecks = await supabaseAdmin
        .from("audit_checks")
        .select("audit_id, status, severity, count")
        .in("audit_id", auditIds);
      checks = (fallbackChecks.data ?? []).map((check) => ({
        ...check,
        workflow_status: "open",
      })) as typeof checks;
    } else {
      checks = (checksResult.data ?? []) as typeof checks;
    }
  }

  const auditsWithSummary = (audits ?? []).map((audit) => {
    const auditChecks = checks.filter((check) => check.audit_id === audit.id);
    const active = auditChecks.filter((check) => check.status !== "pass");
    const topIssue = active
      .slice()
      .sort((a, b) => severityRank(a.severity) - severityRank(b.severity) || b.count - a.count)[0];

    return {
      ...audit,
      issues: active.length,
      failed: auditChecks.filter((check) => check.status === "fail").length,
      affectedRecords: active.reduce((total, check) => total + check.count, 0),
      openItems: active.filter((check) => (check.workflow_status ?? "open") !== "fixed").length,
      topIssue: topIssue ? topIssueLabel(topIssue.severity, topIssue.count) : null,
    };
  });

  return NextResponse.json({ portal, audits: auditsWithSummary });
}

function severityRank(severity: CheckResult["severity"]) {
  if (severity === "high") return 0;
  if (severity === "medium") return 1;
  return 2;
}

function topIssueLabel(severity: CheckResult["severity"], count: number) {
  return `${severity} severity, ${count.toLocaleString()} records`;
}
