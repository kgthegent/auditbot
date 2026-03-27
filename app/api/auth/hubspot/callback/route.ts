import { NextRequest, NextResponse } from "next/server";
import { exchangeCode, getPortalInfo } from "@/lib/hubspot/oauth";
import { supabaseAdmin } from "@/lib/supabase/client";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      new URL("/connect?error=missing_code", request.url)
    );
  }

  try {
    const tokens = await exchangeCode(code);
    const portalInfo = await getPortalInfo(tokens.access_token);

    // Upsert user (using a placeholder email until we get user info)
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .upsert(
        { email: `hubspot-${portalInfo.hub_id}@placeholder.local` },
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

    return NextResponse.redirect(
      new URL(`/dashboard?hub_id=${portalInfo.hub_id}`, request.url)
    );
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/connect?error=oauth_failed", request.url)
    );
  }
}
