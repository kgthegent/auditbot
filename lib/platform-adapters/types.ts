import { CheckResult, Platform, Portal } from "@/types";

export interface TokenSet {
  accessToken: string;
  refreshToken?: string;
  instanceUrl?: string;
  expiresAt?: string;
}

export type AuditPortal = Pick<
  Portal,
  "id" | "access_token" | "refresh_token" | "platform" | "instance_url" | "auth_config"
>;

export interface PlatformAdapter {
  id: Platform;
  name: string;
  authType: "oauth" | "client_credentials";
  runAudit(portal: AuditPortal): Promise<CheckResult[]>;
}
