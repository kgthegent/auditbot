import { NextRequest, NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/hubspot/oauth";

export async function GET(request: NextRequest) {
  try {
    const url = getAuthUrl();
    return NextResponse.redirect(url);
  } catch (error) {
    console.error("HubSpot auth configuration error:", error);
    return NextResponse.redirect(
      new URL("/connect?error=hubspot_not_configured", request.url)
    );
  }
}
