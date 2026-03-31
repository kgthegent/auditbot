export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const email = req.cookies.get("sa_email")?.value;
  const hubId = req.cookies.get("sa_hub_id")?.value;

  if (!email) return NextResponse.json({ authenticated: false });
  return NextResponse.json({ authenticated: true, email, hub_id: hubId || null });
}
