import { CheckResult } from "@/types";
import { IncompleteAuditError } from "@/lib/audit/completeness";
import { PlatformAdapter } from "./types";

export const marketoAdapter: PlatformAdapter = {
  id: "marketo",
  name: "Marketo Engage",
  authType: "client_credentials",
  async runAudit(): Promise<CheckResult[]> {
    throw new IncompleteAuditError(["Marketo health checks (not implemented; connectivity only)"]);
  },
};
