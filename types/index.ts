export type Plan = "free" | "starter" | "pro" | "agency";
export type CheckStatus = "pass" | "warn" | "fail";
export type Severity = "high" | "medium" | "low";

export interface User {
  id: string;
  email: string;
  created_at: string;
  plan: Plan;
}

export interface Portal {
  id: string;
  user_id: string;
  hub_id: string;
  access_token: string;
  refresh_token: string;
  portal_name: string;
  created_at: string;
}

export interface Audit {
  id: string;
  portal_id: string;
  score: number;
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
}

export interface CheckResult {
  checkName: string;
  severity: Severity;
  count: number;
  percentage: number;
  status: CheckStatus;
  description: string;
  fixSteps: string[];
}
