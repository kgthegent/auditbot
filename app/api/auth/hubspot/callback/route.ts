import { getConnectionUser } from "@/lib/auth/connection-user";
import { hasValidOAuthState, setOAuthState } from "@/lib/auth/oauth-state";
import { NextRequest, NextResponse } from "next/server";
import { assertSessionConfigured, setSessionCookies } from "@/lib/auth/session";
import { exchangeCode, getPortalInfo } from "@/lib/hubspot/oauth";
import { supabaseAdmin } from "@/lib/supabase/client";

export async function GET(request: NextRequest) {
  if (!hasValidOAuthState(request, "hubspot_oauth_state")) {
    return NextResponse.redirect(new URL("/connect?error=invalid_state", request.url));
  }
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      new URL("/connect?error=missing_code", request.url)
    );
  }

  try {
    assertSessionConfigured();
    const tokens = await exchangeCode(code);
    const portalInfo = await getPortalInfo(tokens.access_token);

    const placeholderEmail = `hubspot-${portalInfo.hub_id}@placeholder.local`;

    const user = await getConnectionUser(request, placeholderEmail);

    // Upsert portal
    const { error: portalError } = await supabaseAdmin
      .from("portals")
      .upsert(
        {
          user_id: user.id,
          hub_id: portalInfo.hub_id,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          portal_name: portalInfo.portal_name,
        },
        { onConflict: "user_id,hub_id" }
      );

    if (portalError) {
      throw new Error(`Failed to upsert portal: ${portalError.message}`);
    }

    const response = NextResponse.redirect(
      new URL(`/dashboard?hub_id=${portalInfo.hub_id}`, request.url)
    );
    setSessionCookies(response, { userId: user.id, email: user.email, hubId: portalInfo.hub_id });
    setOAuthState(response, "hubspot_oauth_state", "");
    return response;
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/connect?error=oauth_failed", request.url)
    );
  }
}
