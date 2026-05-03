import { runAllChecks } from "@/lib/audit/engine";
import { PlatformAdapter } from "./types";

export const hubSpotAdapter: PlatformAdapter = {
  id: "hubspot",
  name: "HubSpot",
  authType: "oauth",
  runAudit(portal) {
    return runAllChecks(portal.access_token);
  },
};
