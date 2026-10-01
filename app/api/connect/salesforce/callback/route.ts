import { getConnectionUser } from "@/lib/auth/connection-user";
import { hasValidOAuthState, setOAuthState } from "@/lib/auth/oauth-state";
import { NextRequest, NextResponse } from "next/server";
import { assertSessionConfigured, setSessionCookies } from "@/lib/auth/session";
import { exchangeCode, getOrgId, getOrgInfo } from "@/lib/salesforce/oauth";
import { supabaseAdmin } from "@/lib/supabase/client";

export async function GET(request: NextRequest) {
  if (!hasValidOAuthState(request, "salesforce_oauth_state")) {
    return NextResponse.redirect(new URL("/connect?error=invalid_state", request.url));
  }
  const code = request.nextUrl.searchParams.get("code");
  const salesforceError = request.nextUrl.searchParams.get("error");
  const salesforceErrorDescription = request.nextUrl.searchParams.get("error_description");
  const codeVerifier = request.cookies.get("sf_code_verifier")?.value;

  if (salesforceError) {
    const redirect = new URL("/connect/salesforce", request.url);
    redirect.searchParams.set("error", "salesforce_denied");
    redirect.searchParams.set("sf_error", salesforceError);
    if (salesforceErrorDescription) {
      redirect.searchParams.set("sf_message", salesforceErrorDescription);
    }
    return NextResponse.redirect(redirect);
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/connect/salesforce?error=missing_code", request.url)
    );
  }

  if (!codeVerifier) {
    return NextResponse.redirect(
      new URL("/connect/salesforce?error=missing_verifier", request.url)
    );
  }

  try {
    assertSessionConfigured();
    const tokens = await exchangeCode(code, codeVerifier);
    const fallbackOrgId = getOrgId(tokens.id);
    const orgInfo = await getOrgInfo(tokens.instance_url, tokens.access_token);
    const orgId = orgInfo.id || fallbackOrgId;

    const placeholderEmail = `salesforce-${orgId}@placeholder.local`;

    const user = await getConnectionUser(request, placeholderEmail);

    // Upsert portal
    const { error: portalError } = await supabaseAdmin
      .from("portals")
      .upsert(
        {
          user_id: user.id,
          hub_id: orgId,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          instance_url: tokens.instance_url,
          portal_name: orgInfo.name,
          platform: "salesforce",
        },
        { onConflict: "user_id,hub_id" }
      );

    if (portalError) {
      throw new Error(`Failed to upsert portal: ${portalError.message}`);
    }

    const response = NextResponse.redirect(
      new URL(`/dashboard?hub_id=${orgId}`, request.url)
    );
    setSessionCookies(response, { userId: user.id, email: user.email, hubId: orgId });
    setOAuthState(response, "salesforce_oauth_state", "");
    response.cookies.set("sf_code_verifier", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 0,
      path: "/",
      sameSite: "lax",
    });
    return response;
  } catch (error) {
    console.error("Salesforce OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/connect/salesforce?error=oauth_failed", request.url)
    );
  }
}
