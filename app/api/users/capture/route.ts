import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/client";
import { triggerSequence } from "@/lib/email/sequence";

export async function POST(req: NextRequest) {
  try {
    const { email, portal_id } = await req.json();

    if (!email || !portal_id) {
      return NextResponse.json(
        { error: "Missing email or portal_id" },
        { status: 400 }
      );
    }

    // Upsert user by email
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .upsert({ email }, { onConflict: "email" })
      .select("id")
      .single();

    if (userError || !user) {
      console.error("User upsert failed:", userError);
      return NextResponse.json(
        { error: "Failed to save user" },
        { status: 500 }
      );
    }

    // Link portal to user
    const { error: portalError } = await supabaseAdmin
      .from("portals")
      .update({ user_id: user.id })
      .eq("id", portal_id);

    if (portalError) {
      console.error("Portal link failed:", portalError);
      return NextResponse.json(
        { error: "Failed to link portal" },
        { status: 500 }
      );
    }

    // Trigger email drip sequence
    // Get hub_id and audit score for the portal
    const { data: portal } = await supabaseAdmin
      .from("portals")
      .select("hub_id")
      .eq("id", portal_id)
      .single();

    if (portal?.hub_id) {
      // Get latest audit score if available
      const { data: audit } = await supabaseAdmin
        .from("audits")
        .select("score")
        .eq("portal_id", portal_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const auditScore = audit?.score ?? 0;

      triggerSequence(email, portal_id, portal.hub_id, auditScore).catch(
        (err) => console.error("Email sequence trigger failed:", err)
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
