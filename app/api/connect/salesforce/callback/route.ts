import { NextRequest, NextResponse } from "next/server";
import { setSessionCookies } from "@/lib/auth/session";
import { exchangeCode, getOrgId, getOrgInfo } from "@/lib/salesforce/oauth";
import { supabaseAdmin } from "@/lib/supabase/client";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const codeVerifier = request.cookies.get("sf_code_verifier")?.value;

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
    const tokens = await exchangeCode(code, codeVerifier);
    const fallbackOrgId = getOrgId(tokens.id);
    const orgInfo = await getOrgInfo(tokens.instance_url, tokens.access_token);
    const orgId = orgInfo.id || fallbackOrgId;

    const placeholderEmail = `salesforce-${orgId}@placeholder.local`;

    // Upsert user (placeholder email until we capture real one)
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .upsert(
        { email: placeholderEmail },
        { onConflict: "email" }
      )
      .select()
      .single();

    if (userError || !user) {
      throw new Error(`Failed to upsert user: ${userError?.message}`);
    }

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
    setSessionCookies(response, placeholderEmail, orgId);
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
