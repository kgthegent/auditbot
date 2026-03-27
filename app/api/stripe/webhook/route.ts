import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { supabaseAdmin } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const portalId = session.metadata?.portal_id;
    const plan = session.metadata?.plan;

    if (portalId && plan) {
      const { data: portal } = await supabaseAdmin
        .from("portals")
        .select("user_id")
        .eq("id", portalId)
        .single();

      if (portal) {
        await supabaseAdmin
          .from("users")
          .update({ plan })
          .eq("id", portal.user_id);
      }
    }
  }

  return NextResponse.json({ received: true });
}
