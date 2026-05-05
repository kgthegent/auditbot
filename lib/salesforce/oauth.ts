import crypto from "crypto";

const SF_AUTH_URL = "https://login.salesforce.com/services/oauth2/authorize";
const SF_TOKEN_URL = "https://login.salesforce.com/services/oauth2/token";

const clientId = () => process.env.SALESFORCE_CLIENT_ID!;
const clientSecret = () => process.env.SALESFORCE_CLIENT_SECRET!;
const redirectUri = () => process.env.SALESFORCE_REDIRECT_URI!;

function requireSalesforceConfig() {
  const missing = [
    ["SALESFORCE_CLIENT_ID", clientId()],
    ["SALESFORCE_CLIENT_SECRET", clientSecret()],
    ["SALESFORCE_REDIRECT_URI", redirectUri()],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing Salesforce configuration: ${missing.join(", ")}`);
  }
}

// PKCE helpers
export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function generateCodeChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

export function getAuthUrl(codeChallenge: string, state?: string): string {
  requireSalesforceConfig();

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId(),
    redirect_uri: redirectUri(),
    scope: "api refresh_token",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    ...(state && { state }),
  });
  return `${SF_AUTH_URL}?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  instance_url: string;
  id: string; // identity URL e.g. https://login.salesforce.com/id/00Dxx.../005xx...
}

export async function exchangeCode(code: string, codeVerifier: string): Promise<TokenResponse> {
  requireSalesforceConfig();

  const res = await fetch(SF_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId(),
      client_secret: clientSecret(),
      redirect_uri: redirectUri(),
      code,
      code_verifier: codeVerifier,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Salesforce token exchange failed: ${error}`);
  }

  return res.json();
}

export async function refreshToken(refresh_token: string): Promise<{ access_token: string; instance_url: string }> {
  requireSalesforceConfig();

  const res = await fetch(SF_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId(),
      client_secret: clientSecret(),
      refresh_token,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Salesforce token refresh failed: ${error}`);
  }

  return res.json();
}

export function getOrgId(identityUrl: string): string {
  // Identity URL format: https://login.salesforce.com/id/00Dxx0000001gEH/005xx000001Svhz
  const parts = identityUrl.split("/");
  return parts[parts.length - 2]; // org ID
}

export async function getOrgInfo(
  instanceUrl: string,
  accessToken: string
): Promise<{ id: string; name: string }> {
  const res = await fetch(
    `${instanceUrl}/services/data/v59.0/query?q=${encodeURIComponent(
      "SELECT Id, Name FROM Organization LIMIT 1"
    )}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Salesforce org lookup failed: ${error}`);
  }

  const data = await res.json();
  const record = data.records?.[0];
  return {
    id: String(record?.Id ?? ""),
    name: String(record?.Name ?? ""),
  };
}
