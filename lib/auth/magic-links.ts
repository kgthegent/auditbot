import { randomBytes } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/client";
import { sendEmail } from "@/lib/email/sequence";
import { assertSessionConfigured, EMAIL_LINK_MAX_AGE } from "@/lib/auth/session";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://getstackaudit.app";

export async function sendSignInLink(email: string, hubId: string | null, token = randomBytes(32).toString("hex")) {
  assertSessionConfigured();
  const { error } = await supabaseAdmin.from("magic_links").insert({
    email,
    token,
    hub_id: hubId,
    expires_at: new Date(Date.now() + EMAIL_LINK_MAX_AGE * 1000).toISOString(),
  });
  if (error) throw new Error("Could not create sign-in link");

  const link = `${APP_URL}/auth/verify?token=${encodeURIComponent(token)}`;
  const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:40px auto;padding:24px">
    <h1>Confirm your email for StackAudit</h1>
    <p>Use this one-time link to sign in and finish connecting your platform. It expires in 15 minutes.</p>
    <p><a href="${link}">Confirm email and sign in</a></p>
    <p>If you did not request this, ignore this email.</p>
  </body></html>`;
  await sendEmail(email, "Sign in to StackAudit", html);
}

export async function consumeMagicLink(token: string) {
  // A single conditional UPDATE is the lock: concurrent requests cannot both redeem it.
  const { data, error } = await supabaseAdmin
    .from("magic_links")
    .update({ used: true })
    .eq("token", token)
    .eq("used", false)
    .gt("expires_at", new Date().toISOString())
    .select("email, hub_id")
    .maybeSingle();
  if (error) throw new Error("Could not verify sign-in link");
  return data as { email: string; hub_id: string | null } | null;
}
