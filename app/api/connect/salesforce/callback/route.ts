import { NextRequest, NextResponse } from "next/server";
import { exchangeCode, getOrgId } from "@/lib/salesforce/oauth";
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
    const orgId = getOrgId(tokens.id);

    // Upsert user (placeholder email until we capture real one)
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .upsert(
        { email: `salesforce-${orgId}@placeholder.local` },
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
          portal_name: "",
          platform: "salesforce",
        },
        { onConflict: "user_id,hub_id" }
      );

    if (portalError) {
      throw new Error(`Failed to upsert portal: ${portalError.message}`);
    }

    return NextResponse.redirect(
      new URL(`/dashboard?hub_id=${orgId}`, request.url)
    );
  } catch (error) {
    console.error("Salesforce OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/connect?error=oauth_failed", request.url)
    );
  }
}
