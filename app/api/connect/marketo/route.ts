import { NextRequest, NextResponse } from "next/server";
import { setSessionCookies } from "@/lib/auth/session";
import { getMarketoInstanceId, getMarketoToken, MarketoCredentials } from "@/lib/marketo/api";
import { supabaseAdmin } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

function requiredString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = requiredString(body.email).toLowerCase();
    const credentials: MarketoCredentials = {
      identityUrl: requiredString(body.identityUrl),
      restUrl: requiredString(body.restUrl),
      clientId: requiredString(body.clientId),
      clientSecret: requiredString(body.clientSecret),
    };

    if (!email || !credentials.identityUrl || !credentials.restUrl || !credentials.clientId || !credentials.clientSecret) {
      return NextResponse.json({ error: "All Marketo credential fields are required" }, { status: 400 });
    }

    const token = await getMarketoToken(credentials);
    const hubId = getMarketoInstanceId(credentials.restUrl);

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
          instance_url: credentials.restUrl,
          portal_name: hubId,
          platform: "marketo",
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
    console.error("Marketo connection error:", error);
    return NextResponse.json({ error: "Could not validate Marketo credentials" }, { status: 400 });
  }
}
