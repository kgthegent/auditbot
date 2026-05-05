import { NextRequest, NextResponse } from "next/server";

const gatedPrefixes = [
  "/api/connect/salesforce",
  "/api/connect/marketo",
  "/api/connect/marketing-cloud",
  "/connect/salesforce",
  "/connect/marketo",
  "/connect/marketing-cloud",
];

export function middleware(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_ENABLE_MULTI_PLATFORM === "true") {
    return NextResponse.next();
  }

  if (gatedPrefixes.some((prefix) => request.nextUrl.pathname.startsWith(prefix))) {
    return NextResponse.redirect(new URL("/connect", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/connect/:path*", "/connect/:path*"],
};
