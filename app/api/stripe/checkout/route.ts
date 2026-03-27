import { NextRequest, NextResponse } from "next/server";
import { createCheckoutSession } from "@/lib/stripe/client";

export async function POST(req: NextRequest) {
  try {
    const { email, plan, portal_id, hub_id } = await req.json();

    if (!email || !plan || !portal_id || !hub_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (plan !== "starter" && plan !== "pro") {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const session = await createCheckoutSession(email, plan, portal_id, hub_id);
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
