import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/client";

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

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
