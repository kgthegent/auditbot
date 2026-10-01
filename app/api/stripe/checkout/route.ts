import { readSession } from "@/lib/auth/session";
import { isPlaceholderEmail } from "@/lib/auth/email";
import { supabaseAdmin } from "@/lib/supabase/client";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createCheckoutSession } from "@/lib/stripe/client";

export async function POST(req: NextRequest) {
  try {
    const identity = readSession(req);
    if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { plan, portal_id } = await req.json();

    if (!plan || typeof portal_id !== "string" || !portal_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (plan !== "starter" && plan !== "pro") {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Stripe is not configured. Set STRIPE_SECRET_KEY in your environment." },
        { status: 503 }
      );
    }

    const { data: user } = await supabaseAdmin.from("users").select("email").eq("id", identity.userId).single();
    if (!user || isPlaceholderEmail(user.email)) {
      return NextResponse.json({ error: "Verify your email before starting a subscription" }, { status: 403 });
    }
    const { data: portal } = await supabaseAdmin.from("portals").select("id, hub_id")
      .eq("id", portal_id).eq("user_id", identity.userId).single();
    if (!portal) return NextResponse.json({ error: "Portal not found" }, { status: 404 });
    const session = await createCheckoutSession(user.email, plan, portal.id, portal.hub_id);
    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Stripe checkout error:", message);
    return NextResponse.json(
      { error: "Could not create checkout session" },
      { status: 500 }
    );
  }
}
