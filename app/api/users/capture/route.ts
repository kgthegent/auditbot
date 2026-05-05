import { NextRequest, NextResponse } from "next/server";
import { setSessionCookies } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/client";
import { triggerSequence } from "@/lib/email/sequence";

function requiredString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function getAuthUser(req: NextRequest) {
  const email = req.cookies.get("sa_email")?.value;
  if (!email) return null;

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", email)
    .single();

  return user ?? null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = requiredString(body.email).toLowerCase();
    const portalId = requiredString(body.portal_id);

    if (!email || !portalId) {
      return NextResponse.json(
        { error: "Missing email or portal_id" },
        { status: 400 }
      );
    }

    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: portal, error: portalLookupError } = await supabaseAdmin
      .from("portals")
      .select("id, hub_id, access_token, refresh_token, portal_name")
      .eq("id", portalId)
      .eq("user_id", authUser.id)
      .single();

    if (portalLookupError || !portal) {
      return NextResponse.json({ error: "Portal not found" }, { status: 404 });
    }

    // Upsert user by email — fully idempotent for re-submissions
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .upsert({ email }, { onConflict: "email", ignoreDuplicates: false })
      .select("id")
      .single();

    if (userError || !user) {
      console.error("User upsert failed:", userError);
      return NextResponse.json(
        { error: "Failed to save user" },
        { status: 500 }
      );
    }

    let linkedPortalId = portal.id;

    // Link portal to user
    const { error: portalError } = await supabaseAdmin
      .from("portals")
      .update({ user_id: user.id })
      .eq("id", portalId)
      .eq("user_id", authUser.id);

    if (portalError) {
      if (portalError.code !== "23505") {
        console.error("Portal link failed:", portalError);
        return NextResponse.json(
          { error: "Failed to link portal" },
          { status: 500 }
        );
      }

      const { data: existingPortal, error: existingPortalError } = await supabaseAdmin
        .from("portals")
        .select("id")
        .eq("user_id", user.id)
        .eq("hub_id", portal.hub_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (existingPortalError || !existingPortal) {
        console.error("Portal conflict lookup failed:", existingPortalError);
        return NextResponse.json(
          { error: "Failed to link portal" },
          { status: 500 }
        );
      }

      linkedPortalId = existingPortal.id;

      await supabaseAdmin
        .from("portals")
        .update({
          access_token: portal.access_token,
          refresh_token: portal.refresh_token,
          portal_name: portal.portal_name,
        })
        .eq("id", existingPortal.id);
    }

    // Trigger email drip sequence
    // Get hub_id and audit score for the portal
    if (portal?.hub_id) {
      // Get latest audit score if available
      const { data: audit } = await supabaseAdmin
        .from("audits")
        .select("score")
        .eq("portal_id", linkedPortalId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const auditScore = audit?.score ?? 0;

      triggerSequence(email, linkedPortalId, portal.hub_id, auditScore).catch(
        (err) => console.error("Email sequence trigger failed:", err)
      );
    }

    const response = NextResponse.json({
      success: true,
      portal: { id: linkedPortalId, hub_id: portal.hub_id },
    });
    setSessionCookies(response, email, portal.hub_id);
    return response;
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
