import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { supabaseAdmin } from "@/lib/supabase/client";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
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

    if (portalId) {
      // Look up the portal to find the user
      const { data: portal } = await supabaseAdmin
        .from("portals")
        .select("user_id")
        .eq("id", portalId)
        .single();

      if (portal) {
        // Determine plan from the price
        const lineItems = await stripe.checkout.sessions.listLineItems(
          session.id
        );
        const priceId = lineItems.data[0]?.price?.id;

        let plan = "starter";
        if (priceId === "price_pro_placeholder") {
          plan = "pro";
        }

        await supabaseAdmin
          .from("users")
          .update({ plan })
          .eq("id", portal.user_id);
      }
    }
  }

  return NextResponse.json({ received: true });
}
