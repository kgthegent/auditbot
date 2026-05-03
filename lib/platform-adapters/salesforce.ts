import { runAllChecks } from "@/lib/salesforce/audit";
import { PlatformAdapter } from "./types";

export const salesforceAdapter: PlatformAdapter = {
  id: "salesforce",
  name: "Salesforce",
  authType: "oauth",
  runAudit(portal) {
    return runAllChecks(portal.id);
  },
};
