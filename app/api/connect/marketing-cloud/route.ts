import { NextRequest, NextResponse } from "next/server";
import { setSessionCookies } from "@/lib/auth/session";
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
    const body = await request.json();
    const email = requiredString(body.email).toLowerCase();
    const accountId = requiredString(body.accountId);
    const credentials: MarketingCloudCredentials = {
      authBaseUrl: requiredString(body.authBaseUrl),
      clientId: requiredString(body.clientId),
      clientSecret: requiredString(body.clientSecret),
      accountId: accountId || undefined,
    };

    if (!email || !credentials.authBaseUrl || !credentials.clientId || !credentials.clientSecret) {
      return NextResponse.json({ error: "Email, Authentication Base URI, Client ID, and Client Secret are required" }, { status: 400 });
    }

    const token = await getMarketingCloudToken(credentials);
    const hubId = getMarketingCloudInstanceId(token.rest_instance_url, credentials.accountId);

    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .upsert({ email }, { onConflict: "email" })
      .select()
      .single();

    if (userError || !user) {
      throw new Error(`Failed to upsert user: ${userError?.message}`);
    }

    const { error: portalError } = await supabaseAdmin
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
      );

    if (portalError) {
      throw new Error(`Failed to upsert portal: ${portalError.message}`);
    }

    const response = NextResponse.json({ redirect: `/dashboard?hub_id=${encodeURIComponent(hubId)}` });
    setSessionCookies(response, email, hubId);
    return response;
  } catch (error) {
    console.error("Marketing Cloud connection error:", error);
    return NextResponse.json({ error: "Could not validate Marketing Cloud credentials" }, { status: 400 });
  }
}
