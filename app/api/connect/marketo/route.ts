import { getConnectionUser } from "@/lib/auth/connection-user";
import { isPlaceholderEmail } from "@/lib/auth/email";
import { sendSignInLink } from "@/lib/auth/magic-links";
import { NextRequest, NextResponse } from "next/server";
import { assertSessionConfigured, createEmailClaimToken, isValidEmail, setSessionCookies } from "@/lib/auth/session";
import { getMarketoInstanceId, getMarketoToken, marketoGet, MarketoCredentials } from "@/lib/marketo/api";
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
    const credentials: MarketoCredentials = {
      identityUrl: requiredString(body.identityUrl),
      restUrl: requiredString(body.restUrl),
      clientId: requiredString(body.clientId),
      clientSecret: requiredString(body.clientSecret),
    };

    if (!isValidEmail(email) || isPlaceholderEmail(email) || !credentials.identityUrl || !credentials.restUrl || !credentials.clientId || !credentials.clientSecret) {
      return NextResponse.json({ error: "All Marketo credential fields are required" }, { status: 400 });
    }

    const hubId = getMarketoInstanceId(credentials.restUrl);
    if (getMarketoInstanceId(credentials.identityUrl) !== hubId) {
      return NextResponse.json({ error: "Identity and REST URLs must belong to the same Marketo instance" }, { status: 400 });
    }
    const token = await getMarketoToken(credentials);
    if (!token.access_token || !Number.isFinite(token.expires_in) || token.expires_in <= 0) {
      throw new Error("Invalid Marketo token response");
    }
    // Prove this token can read the requested tenant before selecting its identity.
    const description = await marketoGet<{ success?: boolean; result?: unknown[] }>(
      credentials.restUrl, token.access_token, "/rest/v1/leads/describe.json"
    );
    if (description.success !== true || !Array.isArray(description.result)) {
      throw new Error("Marketo credentials cannot read this instance");
    }

    const user = await getConnectionUser(request, `marketo-${hubId}@placeholder.local`);
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
          instance_url: credentials.restUrl,
          portal_name: hubId,
          platform: "marketo",
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
    console.error("Marketo connection error:", error);
    return NextResponse.json({ error: "Could not validate Marketo credentials" }, { status: 400 });
  }
}
