import { NextResponse } from "next/server";
import { getAuthUrl, generateCodeVerifier, generateCodeChallenge } from "@/lib/salesforce/oauth";

export const dynamic = "force-dynamic";

export async function GET() {
  const verifier = generateCodeVerifier();
  const challenge = generateCodeChallenge(verifier);
  const url = getAuthUrl(challenge);

  const response = NextResponse.redirect(url);
  // Store verifier in a short-lived cookie for the callback
  response.cookies.set("sf_code_verifier", verifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 300, // 5 minutes
    path: "/",
    sameSite: "lax",
  });

  return response;
}
