import { CheckResult } from "@/types";
import {
  getMarketingCloudToken,
  marketingCloudGet,
  MarketingCloudCredentials,
} from "@/lib/marketing-cloud/api";
import { PlatformAdapter } from "./types";

function getAuthConfig(portal: { auth_config?: Record<string, unknown> }): MarketingCloudCredentials {
  const config = portal.auth_config ?? {};
  return {
    authBaseUrl: String(config.authBaseUrl ?? ""),
    clientId: String(config.clientId ?? ""),
    clientSecret: String(config.clientSecret ?? ""),
    accountId: config.accountId ? String(config.accountId) : undefined,
  };
}

export const marketingCloudAdapter: PlatformAdapter = {
  id: "marketing_cloud",
  name: "Marketing Cloud",
  authType: "client_credentials",
  async runAudit(portal): Promise<CheckResult[]> {
    const credentials = getAuthConfig(portal);
    const token = await getMarketingCloudToken(credentials);

    await marketingCloudGet(token.rest_instance_url, token.access_token, "/platform/v1/endpoints");

    return [
      {
        checkName: "Marketing Cloud API Connection",
        severity: "high",
        count: 0,
        percentage: 0,
        status: "pass",
        description: "StackAudit can authenticate to Marketing Cloud and read account API metadata.",
        fixSteps: [],
      },
    ];
  },
};
