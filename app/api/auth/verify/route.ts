export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/client";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://auditbot-zeta.vercel.app";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.redirect(`${APP_URL}/login?error=missing_token`);

  const { data: link } = await supabaseAdmin
    .from("magic_links")
    .select("*")
    .eq("token", token)
    .single();

  if (!link) return NextResponse.redirect(`${APP_URL}/login?error=invalid`);
  if (link.used) return NextResponse.redirect(`${APP_URL}/login?error=used`);
  if (new Date(link.expires_at) < new Date()) return NextResponse.redirect(`${APP_URL}/login?error=expired`);

  // Mark used
  await supabaseAdmin.from("magic_links").update({ used: true }).eq("id", link.id);

  // Build redirect with cookie
  const redirectUrl = link.hub_id
    ? `${APP_URL}/dashboard?hub_id=${link.hub_id}`
    : `${APP_URL}/connect`;

  const res = NextResponse.redirect(redirectUrl);

  // Set auth cookie (30 days)
  res.cookies.set("sa_email", link.email, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  res.cookies.set("sa_hub_id", link.hub_id ?? "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  return res;
}
