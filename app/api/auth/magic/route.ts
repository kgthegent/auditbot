export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/client";
import { sendEmail } from "@/lib/email/sequence";
import { randomBytes } from "crypto";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://getstackaudit.app";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  // Look up user's portal
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", email)
    .single();

  if (!user) {
    // Don't reveal if email exists — return success anyway
    return NextResponse.json({ ok: true });
  }

  const { data: portal } = await supabaseAdmin
    .from("portals")
    .select("hub_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min

  await supabaseAdmin.from("magic_links").insert({
    email,
    token,
    hub_id: portal?.hub_id ?? null,
    expires_at: expiresAt,
  });

  const link = `${APP_URL}/auth/verify?token=${token}`;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
<div style="max-width:600px;margin:24px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
  <div style="background:#1a1a1a;padding:32px 24px;text-align:center;">
    <span style="color:#fff;font-size:24px;font-weight:700;">Stack</span><span style="color:#15A1C7;font-size:24px;font-weight:700;">Audit</span>
  </div>
  <div style="padding:40px 32px;text-align:center;">
    <h2 style="color:#1a1a1a;font-size:22px;margin-bottom:12px;">Sign in to StackAudit</h2>
    <p style="color:#666;font-size:15px;margin-bottom:32px;">Click the button below to sign in. This link expires in 15 minutes.</p>
    <a href="${link}" style="background:#15A1C7;color:#fff;padding:16px 40px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;display:inline-block;">Sign In to StackAudit</a>
    <p style="color:#999;font-size:12px;margin-top:24px;">If you didn't request this, you can safely ignore it.</p>
  </div>
  <div style="padding:24px;text-align:center;color:#999;font-size:12px;border-top:1px solid #eee;">
    StackAudit by Village Consulting
  </div>
</div>
</body></html>`;

  await sendEmail(email, "Sign in to StackAudit", html);

  return NextResponse.json({ ok: true });
}
