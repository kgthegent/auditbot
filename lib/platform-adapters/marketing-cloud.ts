import { CheckResult } from "@/types";
import { IncompleteAuditError } from "@/lib/audit/completeness";
import { PlatformAdapter } from "./types";

export const marketingCloudAdapter: PlatformAdapter = {
  id: "marketing_cloud",
  name: "Marketing Cloud",
  authType: "client_credentials",
  async runAudit(): Promise<CheckResult[]> {
    throw new IncompleteAuditError(["Marketing Cloud health checks (not implemented; connectivity only)"]);
  },
};
