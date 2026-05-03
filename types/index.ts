export type Plan = "free" | "starter" | "pro" | "agency";
export type CheckStatus = "pass" | "warn" | "fail";
export type Severity = "high" | "medium" | "low";
export type WorkflowStatus = "open" | "in_progress" | "fixed" | "ignored";

export interface User {
  id: string;
  email: string;
  created_at: string;
  plan: Plan;
}

export type Platform = "hubspot" | "salesforce" | "marketo" | "marketing_cloud";

export interface Portal {
  id: string;
  user_id: string;
  hub_id: string;
  access_token: string;
  refresh_token: string;
  portal_name: string;
  platform: Platform;
  instance_url: string | null;
  auth_config?: Record<string, unknown>;
  token_expires_at?: string | null;
  created_at: string;
}

export interface Audit {
  id: string;
  portal_id: string;
  score: number;
  report_token?: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface AuditCheck {
  id: string;
  audit_id: string;
  check_name: string;
  severity: Severity;
  count: number;
  percentage: number;
  status: CheckStatus;
  description: string;
  fix_steps: string[];
  example_records: ExampleRecord[];
  workflow_status: WorkflowStatus;
  assigned_to: string | null;
  due_at: string | null;
  notes: string;
  resolved_at: string | null;
}

export interface ExampleRecord {
  id: string;
  label: string;
  detail?: string;
  secondary?: string;
  url?: string;
}

export interface CheckResult {
  id?: string;
  checkName: string;
  severity: Severity;
  count: number;
  percentage: number;
  status: CheckStatus;
  description: string;
  fixSteps: string[];
  exampleRecords?: ExampleRecord[];
  workflowStatus?: WorkflowStatus;
  assignedTo?: string | null;
  dueAt?: string | null;
  notes?: string;
  resolvedAt?: string | null;
}
