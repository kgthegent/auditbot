import {
  normalizeProviderBaseUrl,
  providerFetch,
  PROVIDER_HOSTS,
} from "@/lib/security/provider-url";

const TOKEN_PATH = "/identity/oauth/token";

export interface MarketoCredentials {
  identityUrl: string;
  restUrl: string;
  clientId: string;
  clientSecret: string;
}

export interface MarketoTokenResponse {
  access_token: string;
  expires_in: number;
  scope?: string;
  token_type?: string;
}

function normalizeBaseUrl(url: string) {
  return normalizeProviderBaseUrl(url, PROVIDER_HOSTS.marketo);
}

export async function getMarketoToken(credentials: MarketoCredentials): Promise<MarketoTokenResponse> {
  const identityUrl = normalizeBaseUrl(credentials.identityUrl);
  const res = await providerFetch(`${identityUrl}${TOKEN_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Marketo token request failed: ${error}`);
  }

  return res.json();
}

export async function marketoGet<T>(restUrl: string, accessToken: string, path: string): Promise<T> {
  const baseUrl = normalizeBaseUrl(restUrl);
  const res = await providerFetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Marketo API error ${res.status}: ${error}`);
  }

  return res.json();
}

export function getMarketoInstanceId(restUrl: string) {
  return normalizeBaseUrl(restUrl).replace(/^https?:\/\//, "");
}
