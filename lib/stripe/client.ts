import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  console.error(
    "Stripe is not configured. Set STRIPE_SECRET_KEY in your environment."
  );
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");

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
  const price = PRICES[plan];
  if (!price || price.includes("placeholder")) {
    throw new Error(
      `Stripe price ID for "${plan}" is not configured. Set STRIPE_PRICE_${plan.toUpperCase()} in your environment.`
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: email,
    line_items: [{ price, quantity: 1 }],
    success_url: `${appUrl}/dashboard/success?session_id={CHECKOUT_SESSION_ID}&hub_id=${hubId}&upgraded=${plan}`,
    cancel_url: `${appUrl}/dashboard?hub_id=${hubId}`,
    metadata: {
      portal_id: portalId,
      hub_id: hubId,
      plan,
    },
  });

  return { url: session.url, id: session.id };
}
