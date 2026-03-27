import { NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/hubspot/oauth";

export async function GET() {
  const url = getAuthUrl();
  return NextResponse.redirect(url);
}
