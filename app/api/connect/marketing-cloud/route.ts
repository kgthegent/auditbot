import { getConnectionUser } from "@/lib/auth/connection-user";
import { isPlaceholderEmail } from "@/lib/auth/email";
import { sendSignInLink } from "@/lib/auth/magic-links";
import { NextRequest, NextResponse } from "next/server";
import { assertSessionConfigured, createEmailClaimToken, isValidEmail, setSessionCookies } from "@/lib/auth/session";
import {
  getMarketingCloudInstanceId,
  getMarketingCloudToken,
  MarketingCloudCredentials,
} from "@/lib/marketing-cloud/api";
import { supabaseAdmin } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

function requiredString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: NextRequest) {
  try {
    assertSessionConfigured();
    const body = await request.json();
    const email = requiredString(body.email).toLowerCase();
    const accountId = requiredString(body.accountId);
    const credentials: MarketingCloudCredentials = {
      authBaseUrl: requiredString(body.authBaseUrl),
      clientId: requiredString(body.clientId),
      clientSecret: requiredString(body.clientSecret),
      accountId: accountId || undefined,
    };

    if (!isValidEmail(email) || isPlaceholderEmail(email) || !credentials.authBaseUrl || !credentials.clientId || !credentials.clientSecret) {
      return NextResponse.json({ error: "Email, Authentication Base URI, Client ID, and Client Secret are required" }, { status: 400 });
    }

    const token = await getMarketingCloudToken(credentials);
    if (!token.access_token || !Number.isFinite(token.expires_in) || token.expires_in <= 0) {
      throw new Error("Invalid Marketing Cloud token response");
    }
    const hubId = getMarketingCloudInstanceId(token.rest_instance_url, credentials.accountId);

    const user = await getConnectionUser(request, `marketing-cloud-${hubId}@placeholder.local`);
    if (!isPlaceholderEmail(user.email) && user.email.toLowerCase() !== email) {
      return NextResponse.json({ error: "Use your signed-in email or sign in to the requested account" }, { status: 403 });
    }

    const { data: portal, error: portalError } = await supabaseAdmin
      .from("portals")
      .upsert(
        {
          user_id: user.id,
          hub_id: hubId,
          access_token: token.access_token,
          refresh_token: "",
          instance_url: token.rest_instance_url,
          portal_name: credentials.accountId ? `MID ${credentials.accountId}` : hubId,
          platform: "marketing_cloud",
          auth_config: credentials,
          token_expires_at: new Date(Date.now() + token.expires_in * 1000).toISOString(),
        },
        { onConflict: "user_id,hub_id" }
      ).select("id").single();

    if (portalError || !portal) {
      throw new Error(`Failed to upsert portal: ${portalError?.message}`);
    }

    const verificationRequired = isPlaceholderEmail(user.email);
    if (verificationRequired) {
      const token = createEmailClaimToken({ email, sourceUserId: user.id, portalId: portal.id, hubId });
      await sendSignInLink(email, hubId, token);
    }
    const response = NextResponse.json({ redirect: `/dashboard?hub_id=${encodeURIComponent(hubId)}${verificationRequired ? "&verification=sent" : ""}` });
    setSessionCookies(response, { userId: user.id, email: user.email, hubId });
    return response;
  } catch (error) {
    console.error("Marketing Cloud connection error:", error);
    return NextResponse.json({ error: "Could not validate Marketing Cloud credentials" }, { status: 400 });
  }
}
