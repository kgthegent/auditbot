import { NextRequest, NextResponse } from "next/server";
import { createEmailClaimToken, isValidEmail, readSession } from "@/lib/auth/session";
import { isPlaceholderEmail } from "@/lib/auth/email";
import { sendSignInLink } from "@/lib/auth/magic-links";
import { supabaseAdmin } from "@/lib/supabase/client";

export async function POST(req: NextRequest) {
  try {
    const session = readSession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const portalId = typeof body.portal_id === "string" ? body.portal_id : "";
    if (!isValidEmail(email) || isPlaceholderEmail(email) || !portalId) {
      return NextResponse.json({ error: "A valid email and portal_id are required" }, { status: 400 });
    }
    const { data: user } = await supabaseAdmin.from("users").select("id, email").eq("id", session.userId).single();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: portal } = await supabaseAdmin.from("portals").select("id, hub_id")
      .eq("id", portalId).eq("user_id", user.id).single();
    if (!portal) return NextResponse.json({ error: "Portal not found" }, { status: 404 });

    if (!isPlaceholderEmail(user.email)) {
      if (email !== user.email.toLowerCase()) {
        return NextResponse.json({ error: "Sign in with the requested email before changing accounts" }, { status: 403 });
      }
      return NextResponse.json({ success: true, portal });
    }

    // A supplied address is not proof of ownership. Neither merge accounts nor mint
    // an email session until the recipient redeems this one-time signed claim.
    const token = createEmailClaimToken({ email, sourceUserId: user.id, portalId: portal.id, hubId: portal.hub_id });
    await sendSignInLink(email, portal.hub_id, token);
    return NextResponse.json({ success: true, verification_required: true });
  } catch (error) {
    console.error("Email capture failed:", error);
    return NextResponse.json({ error: "Could not send verification email" }, { status: 500 });
  }
}
