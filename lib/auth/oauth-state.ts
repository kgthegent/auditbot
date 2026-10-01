import { randomBytes, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

export function createOAuthState() {
  return randomBytes(32).toString("hex");
}

export function hasValidOAuthState(request: NextRequest, cookieName: string) {
  const expected = request.cookies.get(cookieName)?.value;
  const received = request.nextUrl.searchParams.get("state");
  if (!expected || !received || !/^[a-f0-9]{64}$/.test(expected) || !/^[a-f0-9]{64}$/.test(received)) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

export function setOAuthState(response: NextResponse, cookieName: string, state: string) {
  response.cookies.set(cookieName, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: state ? 300 : 0,
  });
}
