import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
});

export const PRICES = {
  starter: process.env.STRIPE_PRICE_STARTER || "price_starter_placeholder",
  pro: process.env.STRIPE_PRICE_PRO || "price_pro_placeholder",
};

export async function createCheckoutSession(
  email: string,
  plan: "starter" | "pro",
  portalId: string,
  hubId: string
) {
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: email,
    line_items: [{ price: PRICES[plan], quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/success?session_id={CHECKOUT_SESSION_ID}&hub_id=${hubId}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?hub_id=${hubId}`,
    metadata: { portal_id: portalId, hub_id: hubId, plan },
  });
  return session;
}
