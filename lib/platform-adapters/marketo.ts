import { CheckResult } from "@/types";
import { getMarketoToken, marketoGet, MarketoCredentials } from "@/lib/marketo/api";
import { PlatformAdapter } from "./types";

function getAuthConfig(portal: { auth_config?: Record<string, unknown> }): MarketoCredentials {
  const config = portal.auth_config ?? {};
  return {
    identityUrl: String(config.identityUrl ?? ""),
    restUrl: String(config.restUrl ?? ""),
    clientId: String(config.clientId ?? ""),
    clientSecret: String(config.clientSecret ?? ""),
  };
}

export const marketoAdapter: PlatformAdapter = {
  id: "marketo",
  name: "Marketo Engage",
  authType: "client_credentials",
  async runAudit(portal): Promise<CheckResult[]> {
    const credentials = getAuthConfig(portal);
    const token = await getMarketoToken(credentials);

    await marketoGet(credentials.restUrl, token.access_token, "/rest/v1/leads/describe.json");

    return [
      {
        checkName: "Marketo API Connection",
        severity: "high",
        count: 0,
        percentage: 0,
        status: "pass",
        description: "StackAudit can authenticate to Marketo and read lead metadata.",
        fixSteps: [],
      },
    ];
  },
};
