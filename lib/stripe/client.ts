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
  const secretKey = process.env.STRIPE_SECRET_KEY!;
  const price = PRICES[plan];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  const params = new URLSearchParams({
    mode: "subscription",
    customer_email: email,
    "line_items[0][price]": price,
    "line_items[0][quantity]": "1",
    success_url: `${appUrl}/dashboard/success?session_id={CHECKOUT_SESSION_ID}&hub_id=${hubId}`,
    cancel_url: `${appUrl}/dashboard?hub_id=${hubId}`,
    "metadata[portal_id]": portalId,
    "metadata[hub_id]": hubId,
    "metadata[plan]": plan,
  });

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(secretKey + ":").toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err?.error?.message || "Stripe API error");
  }

  return res.json() as Promise<{ url: string; id: string }>;
}
