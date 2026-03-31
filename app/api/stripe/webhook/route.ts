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
    const customerId = session.customer as string;

    if (portalId && plan) {
      const { data: portal } = await supabaseAdmin
        .from("portals")
        .select("user_id")
        .eq("id", portalId)
        .single();

      if (portal) {
        // Update plan and store Stripe customer ID for future portal sessions
        await supabaseAdmin
          .from("users")
          .update({
            plan,
            stripe_customer_id: customerId,
          })
          .eq("id", portal.user_id);
      }
    }
  }

  if (
    event.type === "customer.subscription.deleted" ||
    event.type === "customer.subscription.updated"
  ) {
    const subscription = event.data.object;
    const customerId = subscription.customer as string;

    // For deleted subscriptions, or updated ones where status is canceled/unpaid
    const shouldDowngrade =
      event.type === "customer.subscription.deleted" ||
      ["canceled", "unpaid", "past_due"].includes(subscription.status);

    if (shouldDowngrade) {
      // Find user by Stripe customer ID and downgrade to free
      const { data: user } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .single();

      if (user) {
        await supabaseAdmin
          .from("users")
          .update({ plan: "free" })
          .eq("id", user.id);

        console.log(
          `Downgraded user ${user.id} to free (customer: ${customerId}, event: ${event.type})`
        );
      }
    }
  }

  return NextResponse.json({ received: true });
}
