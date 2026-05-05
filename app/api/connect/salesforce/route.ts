import { NextRequest, NextResponse } from "next/server";
import { getAuthUrl, generateCodeVerifier, generateCodeChallenge } from "@/lib/salesforce/oauth";
import { supabaseAdmin } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

async function hasSalesforcePortalSchema() {
  const { error } = await supabaseAdmin
    .from("portals")
    .select("platform, instance_url")
    .limit(1);

  return !error;
}

export async function GET(request: NextRequest) {
  try {
    if (!(await hasSalesforcePortalSchema())) {
      return NextResponse.redirect(
        new URL("/connect/salesforce?error=db_not_ready", request.url)
      );
    }

    const verifier = generateCodeVerifier();
    const challenge = generateCodeChallenge(verifier);
    const url = getAuthUrl(challenge);

    const response = NextResponse.redirect(url);
    response.cookies.set("sf_code_verifier", verifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 300,
      path: "/",
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.error("Salesforce auth configuration error:", error);
    return NextResponse.redirect(
      new URL("/connect/salesforce?error=salesforce_not_configured", request.url)
    );
  }
}
