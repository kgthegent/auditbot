const HUBSPOT_AUTH_URL = "https://app.hubspot.com/oauth/authorize";
const HUBSPOT_TOKEN_URL = "https://api.hubapi.com/oauth/v1/token";

const clientId = () => process.env.HUBSPOT_CLIENT_ID!;
const clientSecret = () => process.env.HUBSPOT_CLIENT_SECRET!;
const redirectUri = () => process.env.HUBSPOT_REDIRECT_URI!;

const SCOPES = [
  "crm.objects.contacts.read",
  "crm.objects.contacts.write",
  "crm.objects.owners.read",
].join(" ");

export function getAuthUrl(state?: string): string {
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: redirectUri(),
    scope: SCOPES,
    ...(state && { state }),
  });
  return `${HUBSPOT_AUTH_URL}?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export async function exchangeCode(code: string): Promise<TokenResponse> {
  const res = await fetch(HUBSPOT_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId(),
      client_secret: clientSecret(),
      redirect_uri: redirectUri(),
      code,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`HubSpot token exchange failed: ${error}`);
  }

  return res.json();
}

export async function refreshToken(refresh_token: string): Promise<TokenResponse> {
  const res = await fetch(HUBSPOT_TOKEN_URL, {
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
    throw new Error(`HubSpot token refresh failed: ${error}`);
  }

  return res.json();
}

export async function getPortalInfo(accessToken: string): Promise<{ hub_id: string; portal_name: string }> {
  const res = await fetch("https://api.hubapi.com/oauth/v1/access-tokens/" + accessToken);
  if (!res.ok) throw new Error("Failed to get portal info");
  const data = await res.json();
  return { hub_id: String(data.hub_id), portal_name: data.hub_domain || "" };
}
