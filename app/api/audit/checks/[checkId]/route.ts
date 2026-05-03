import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/client";
import { WorkflowStatus } from "@/types";

export const dynamic = "force-dynamic";

const WORKFLOW_STATUSES = new Set<WorkflowStatus>([
  "open",
  "in_progress",
  "fixed",
  "ignored",
]);

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

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanNullableString(value: unknown) {
  const cleaned = cleanString(value);
  return cleaned || null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { checkId: string } }
) {
  const authUser = await getAuthUser(req);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { checkId } = params;
  const body = await req.json();
  const workflowStatus = cleanString(body.workflow_status || body.workflowStatus) as WorkflowStatus;

  if (!WORKFLOW_STATUSES.has(workflowStatus)) {
    return NextResponse.json({ error: "Invalid workflow status" }, { status: 400 });
  }

  const { data: ownedCheck, error: lookupError } = await supabaseAdmin
    .from("audit_checks")
    .select("id, audits!inner(portals!inner(user_id))")
    .eq("id", checkId)
    .eq("audits.portals.user_id", authUser.id)
    .single();

  if (lookupError || !ownedCheck) {
    return NextResponse.json({ error: "Check not found" }, { status: 404 });
  }

  const assignedTo = cleanNullableString(body.assigned_to || body.assignedTo);
  const dueAt = cleanNullableString(body.due_at || body.dueAt);
  const notes = cleanString(body.notes);

  const { data: updatedCheck, error: updateError } = await supabaseAdmin
    .from("audit_checks")
    .update({
      workflow_status: workflowStatus,
      assigned_to: assignedTo,
      due_at: dueAt,
      notes,
      resolved_at:
        workflowStatus === "fixed" || workflowStatus === "ignored"
          ? new Date().toISOString()
          : null,
    })
    .eq("id", checkId)
    .select("id, check_name, severity, count, percentage, status, description, fix_steps, example_records, workflow_status, assigned_to, due_at, notes, resolved_at")
    .single();

  if (updateError || !updatedCheck) {
    return NextResponse.json({ error: "Failed to update check" }, { status: 500 });
  }

  return NextResponse.json({
    check: {
      id: updatedCheck.id,
      checkName: updatedCheck.check_name,
      severity: updatedCheck.severity,
      count: updatedCheck.count,
      percentage: Number(updatedCheck.percentage),
      status: updatedCheck.status,
      description: updatedCheck.description,
      fixSteps: updatedCheck.fix_steps,
      exampleRecords: updatedCheck.example_records,
      workflowStatus: updatedCheck.workflow_status,
      assignedTo: updatedCheck.assigned_to,
      dueAt: updatedCheck.due_at,
      notes: updatedCheck.notes,
      resolvedAt: updatedCheck.resolved_at,
    },
  });
}
