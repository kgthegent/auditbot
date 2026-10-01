export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { assertSessionConfigured, setSessionCookies, verifyEmailClaimToken } from "@/lib/auth/session";
import { isPlaceholderEmail } from "@/lib/auth/email";
import { consumeMagicLink } from "@/lib/auth/magic-links";
import { supabaseAdmin } from "@/lib/supabase/client";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://getstackaudit.app";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token || token.length > 4096) return NextResponse.redirect(`${APP_URL}/login?error=invalid`);
  const isClaim = token.startsWith("email-claim-v1.");
  const claim = isClaim ? verifyEmailClaimToken(token) : null;
  if (isClaim && !claim) return NextResponse.redirect(`${APP_URL}/login?error=invalid`);

  try {
    assertSessionConfigured();
    const link = await consumeMagicLink(token);
    if (!link || isPlaceholderEmail(link.email) || (claim && (claim.email !== link.email || claim.hubId !== link.hub_id))) {
      return NextResponse.redirect(`${APP_URL}/login?error=invalid`);
    }

    let user: { id: string; email: string } | null;
    if (claim) {
      // Check the original connection still belongs to the placeholder account.
      const { data: source } = await supabaseAdmin.from("users").select("email").eq("id", claim.sourceUserId).single();
      const { data: portal } = await supabaseAdmin.from("portals").select("id, hub_id")
        .eq("id", claim.portalId).eq("user_id", claim.sourceUserId).eq("hub_id", claim.hubId).single();
      if (!source || !isPlaceholderEmail(source.email) || !portal) throw new Error("Connection is no longer available");

      const result = await supabaseAdmin.from("users").upsert({ email: link.email }, { onConflict: "email" }).select("id, email").single();
      if (result.error || !result.data) throw new Error("Could not create verified account");
      user = result.data;

      const { data: existingPortal, error: lookupError } = await supabaseAdmin.from("portals").select("id")
        .eq("user_id", user!.id).eq("hub_id", claim.hubId).maybeSingle();
      if (lookupError) throw new Error("Could not look up existing connection");
      if (!existingPortal) {
        const { data: moved, error: moveError } = await supabaseAdmin.from("portals").update({ user_id: user!.id })
          .eq("id", portal.id).eq("user_id", claim.sourceUserId).select("id").single();
        if (moveError || !moved) throw new Error("Could not link verified account");
      }
      // An existing verified account's connection and credentials are never overwritten.
    } else {
      const result = await supabaseAdmin.from("users").select("id, email").eq("email", link.email).single();
      user = result.data;
    }
    if (!user) throw new Error("Account not found");

    const destination = new URL(link.hub_id ? "/dashboard" : "/connect", APP_URL);
    if (link.hub_id) destination.searchParams.set("hub_id", link.hub_id);
    const response = NextResponse.redirect(destination);
    setSessionCookies(response, { userId: user.id, email: user.email, hubId: link.hub_id });
    return response;
  } catch (error) {
    console.error("Magic link verification failed:", error);
    return NextResponse.redirect(`${APP_URL}/login?error=verification_failed`);
  }
}
