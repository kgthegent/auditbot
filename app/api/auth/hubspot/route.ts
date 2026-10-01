import { assertSessionConfigured } from "@/lib/auth/session";
import { createOAuthState, setOAuthState } from "@/lib/auth/oauth-state";
import { NextRequest, NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/hubspot/oauth";

export async function GET(request: NextRequest) {
  try {
    assertSessionConfigured();
    const state = createOAuthState();
    const url = getAuthUrl(state);
    const response = NextResponse.redirect(url);
    setOAuthState(response, "hubspot_oauth_state", state);
    return response;
  } catch (error) {
    console.error("HubSpot auth configuration error:", error);
    return NextResponse.redirect(
      new URL("/connect?error=hubspot_not_configured", request.url)
    );
  }
}
