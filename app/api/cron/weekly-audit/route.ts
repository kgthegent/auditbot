export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/client";
import { runPlatformAudit } from "@/lib/audit/runners";
import { getPlatformConfig } from "@/lib/platforms";
import { calculateScore } from "@/lib/audit/score";
import { sendEmail } from "@/lib/email/sequence";

function createReportToken() {
  return randomBytes(24).toString("hex");
}

// Called by Vercel Cron — secured by CRON_SECRET header
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get all paid portals (starter or pro)
  const { data: portals, error } = await supabaseAdmin
    .from("portals")
    .select("id, hub_id, portal_name, access_token, refresh_token, instance_url, auth_config, platform, user_id, users(email, plan)")
    .in("users.plan", ["starter", "pro"]);

  if (error) {
    console.error("Failed to fetch paid portals:", error);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  let ran = 0;
  let failed = 0;

  for (const portal of portals ?? []) {
    const user = (Array.isArray(portal.users) ? portal.users[0] : portal.users) as { email: string; plan: string } | null;
    if (!user || !["starter", "pro"].includes(user.plan)) continue;

    try {
      // Run audit
      const { data: audit } = await supabaseAdmin
        .from("audits")
        .insert({ portal_id: portal.id, score: 0, report_token: createReportToken() })
        .select()
        .single();

      if (!audit) continue;

      const platformConfig = getPlatformConfig(portal.platform);
      const checks = await runPlatformAudit(portal);
      const score = calculateScore(checks);

      await supabaseAdmin.from("audit_checks").insert(
        checks.map((c) => ({
          audit_id: audit.id,
          check_name: c.checkName,
          severity: c.severity,
          count: c.count,
          percentage: c.percentage,
          status: c.status,
          description: c.description,
          fix_steps: c.fixSteps,
          example_records: c.exampleRecords ?? [],
        }))
      );

      await supabaseAdmin
        .from("audits")
        .update({ score, completed_at: new Date().toISOString() })
        .eq("id", audit.id);

      // Send weekly digest email
      const dashUrl = `https://auditbot-zeta.vercel.app/dashboard?hub_id=${portal.hub_id}`;
      const failedChecks = checks.filter((c) => c.status === "fail").length;
      const warnChecks = checks.filter((c) => c.status === "warn").length;

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
<div style="max-width:600px;margin:24px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
  <div style="background:#1a1a1a;padding:32px 24px;text-align:center;">
    <span style="color:#fff;font-size:24px;font-weight:700;">Stack</span><span style="color:#15A1C7;font-size:24px;font-weight:700;">Audit</span>
  </div>
  <div style="padding:32px 24px;">
    <h2 style="color:#1a1a1a;font-size:20px;margin-bottom:8px;">Your weekly ${platformConfig.name} health report</h2>
    <p style="color:#666;font-size:14px;margin-bottom:24px;">${portal.portal_name || `Your ${platformConfig.productNoun}`} — ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
    <div style="display:flex;gap:16px;margin-bottom:24px;">
      <div style="flex:1;text-align:center;padding:20px;background:#f8f8f8;border-radius:8px;">
        <div style="font-size:48px;font-weight:800;color:#1a1a1a;">${score}</div>
        <div style="font-size:12px;color:#999;margin-top:4px;">Health Score</div>
      </div>
      <div style="flex:1;text-align:center;padding:20px;background:#fff3f3;border-radius:8px;">
        <div style="font-size:48px;font-weight:800;color:#ef4444;">${failedChecks}</div>
        <div style="font-size:12px;color:#999;margin-top:4px;">Issues Found</div>
      </div>
      <div style="flex:1;text-align:center;padding:20px;background:#fffbf0;border-radius:8px;">
        <div style="font-size:48px;font-weight:800;color:#f59e0b;">${warnChecks}</div>
        <div style="font-size:12px;color:#999;margin-top:4px;">Warnings</div>
      </div>
    </div>
    <div style="text-align:center;">
      <a href="${dashUrl}" style="background:#15A1C7;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:600;font-size:16px;display:inline-block;">View Full Report</a>
    </div>
  </div>
  <div style="padding:24px;text-align:center;color:#999;font-size:12px;border-top:1px solid #eee;">
    StackAudit by Village Consulting · <a href="https://auditbot-zeta.vercel.app/unsubscribe?email=${encodeURIComponent(user.email)}" style="color:#999;">Unsubscribe</a>
  </div>
</div>
</body></html>`;

      await sendEmail(user.email, `Your weekly ${platformConfig.name} score: ${score}/100 — ${portal.portal_name || platformConfig.name}`, html);
      ran++;
    } catch (err) {
      console.error(`Failed for portal ${portal.id}:`, err);
      failed++;
    }
  }

  return NextResponse.json({ ran, failed, total: portals?.length ?? 0 });
}
