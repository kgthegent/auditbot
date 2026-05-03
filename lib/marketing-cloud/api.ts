import {
  normalizeProviderBaseUrl,
  providerFetch,
  PROVIDER_HOSTS,
} from "@/lib/security/provider-url";

export interface MarketingCloudCredentials {
  authBaseUrl: string;
  clientId: string;
  clientSecret: string;
  accountId?: string;
}

export interface MarketingCloudTokenResponse {
  access_token: string;
  expires_in: number;
  rest_instance_url: string;
  soap_instance_url?: string;
  token_type?: string;
}

function normalizeAuthBaseUrl(url: string) {
  return normalizeProviderBaseUrl(url, PROVIDER_HOSTS.marketingCloudAuth);
}

function normalizeRestBaseUrl(url: string) {
  return normalizeProviderBaseUrl(url, PROVIDER_HOSTS.marketingCloudRest);
}

export async function getMarketingCloudToken(
  credentials: MarketingCloudCredentials
): Promise<MarketingCloudTokenResponse> {
  const body: Record<string, string> = {
    grant_type: "client_credentials",
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
  };

  if (credentials.accountId) {
    body.account_id = credentials.accountId;
  }

  const res = await providerFetch(`${normalizeAuthBaseUrl(credentials.authBaseUrl)}/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Marketing Cloud token request failed: ${error}`);
  }

  return res.json();
}

export async function marketingCloudGet<T>(
  restInstanceUrl: string,
  accessToken: string,
  path: string
): Promise<T> {
  const res = await providerFetch(`${normalizeRestBaseUrl(restInstanceUrl)}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Marketing Cloud API error ${res.status}: ${error}`);
  }

  return res.json();
}

export function getMarketingCloudInstanceId(restInstanceUrl: string, accountId?: string) {
  const host = normalizeRestBaseUrl(restInstanceUrl).replace(/^https?:\/\//, "");
  return accountId ? `${host}:${accountId}` : host;
}
