import { NextResponse } from "next/server";

export function setSessionCookies(
  response: NextResponse,
  email: string,
  hubId?: string | null
) {
  const secure = process.env.NODE_ENV === "production";

  response.cookies.set("sa_email", email, {
    httpOnly: true,
    secure,
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    sameSite: "lax",
  });

  if (hubId !== undefined) {
    response.cookies.set("sa_hub_id", hubId ?? "", {
      httpOnly: true,
      secure,
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
      sameSite: "lax",
    });
  }
}
