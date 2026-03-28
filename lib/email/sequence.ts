import { supabaseAdmin } from "@/lib/supabase/client";

const AGENTMAIL_API_KEY = process.env.AGENTMAIL_API_KEY!;
const FROM_INBOX = "auditbot@agentmail.to";
const APP_URL = "https://auditbot-zeta.vercel.app";

export async function sendEmail(to: string, subject: string, htmlBody: string) {
  const res = await fetch(
    `https://api.agentmail.to/v0/inboxes/${FROM_INBOX}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AGENTMAIL_API_KEY}`,
      },
      body: JSON.stringify({
        to: [{ email: to }],
        subject,
        html: htmlBody,
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AgentMail send failed (${res.status}): ${text}`);
  }

  return res.json();
}

export async function triggerSequence(
  email: string,
  portalId: string,
  hubId: string,
  auditScore: number
) {
  // Create sequence row
  const { error } = await supabaseAdmin.from("email_sequences").upsert(
    {
      user_email: email,
      portal_id: portalId,
      hub_id: hubId,
      audit_score: auditScore,
      step: 0,
      next_send_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // step 1 in 1 day
      completed: false,
    },
    { onConflict: "user_email,portal_id" }
  );

  if (error) {
    console.error("Failed to create email sequence:", error);
    throw error;
  }

  // Send step 0 immediately
  const html = getEmailHtml(0, email, hubId, auditScore);
  await sendEmail(
    email,
    `Your HubSpot hygiene score: ${auditScore}/100`,
    html
  );
}

export function getEmailHtml(
  step: number,
  email: string,
  hubId: string,
  score: number
): string {
  const dashboardUrl = `${APP_URL}/dashboard?hub_id=${hubId}`;
  const upgradeUrl = dashboardUrl;

  const header = `
    <div style="background-color:#1a1a1a;padding:32px 24px;text-align:center;">
      <span style="color:#ffffff;font-size:24px;font-weight:700;letter-spacing:0.5px;">Audit</span><span style="color:#15A1C7;font-size:24px;font-weight:700;">Bot</span>
    </div>`;

  const footer = `
    <div style="padding:24px;text-align:center;color:#999999;font-size:12px;border-top:1px solid #eeeeee;">
      AuditBot by Village Consulting · <a href="${APP_URL}/unsubscribe?email=${encodeURIComponent(email)}" style="color:#999999;">Unsubscribe</a>
    </div>`;

  const cta = (text: string, url: string) =>
    `<div style="text-align:center;margin:32px 0;">
      <a href="${url}" style="background-color:#15A1C7;color:#ffffff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:600;font-size:16px;display:inline-block;">${text}</a>
    </div>`;

  const wrap = (body: string) =>
    `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background-color:#ffffff;border-radius:8px;overflow:hidden;margin-top:24px;margin-bottom:24px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    ${header}
    <div style="padding:32px 24px;">
      ${body}
    </div>
    ${footer}
  </div>
</body>
</html>`;

  switch (step) {
    case 0:
      return wrap(`
        <div style="text-align:center;margin-bottom:24px;">
          <div style="font-size:64px;font-weight:800;color:#1a1a1a;">${score}<span style="font-size:24px;color:#999999;">/100</span></div>
          <div style="font-size:14px;color:#666666;margin-top:4px;">Your HubSpot Hygiene Score</div>
        </div>
        <h2 style="color:#1a1a1a;font-size:20px;margin-bottom:16px;">Here is what we found:</h2>
        <ul style="color:#444444;font-size:15px;line-height:1.8;padding-left:20px;">
          <li><strong>Missing owner assignments</strong> — contacts without a designated owner fall through the cracks</li>
          <li><strong>UTM attribution gaps</strong> — leads with no source tracking make ROI reporting impossible</li>
          <li><strong>Unassigned new leads</strong> — recent contacts sitting in your CRM with no one following up</li>
        </ul>
        ${cta("View Full Report", dashboardUrl)}
        <p style="color:#999999;font-size:13px;text-align:center;">Upgrade to Starter for weekly monitoring + alerts — $49/mo</p>
      `);

    case 1:
      return wrap(`
        <h2 style="color:#1a1a1a;font-size:22px;margin-bottom:16px;">Did you see your results?</h2>
        <p style="color:#444444;font-size:15px;line-height:1.7;">
          Your HubSpot portal scored <strong>${score}/100</strong>. A score under 70 typically means leads are falling through the cracks — contacts go unassigned, lifecycle stages are missing, and attribution data has gaps.
        </p>
        <p style="color:#444444;font-size:15px;line-height:1.7;">
          These are the silent killers of pipeline velocity. The good news: they are all fixable.
        </p>
        ${cta("Fix It With AuditBot Starter — $49/mo", upgradeUrl)}
      `);

    case 2:
      return wrap(`
        <h2 style="color:#1a1a1a;font-size:22px;margin-bottom:16px;">What a ${score}/100 costs you</h2>
        <p style="color:#444444;font-size:15px;line-height:1.7;">
          Unassigned leads, bad attribution, and missing lifecycle stages are the top 3 reasons deals go cold before they even start.
        </p>
        <p style="color:#444444;font-size:15px;line-height:1.7;">
          Every day without monitoring means more contacts slipping through — and more pipeline revenue left on the table. Companies that audit weekly recover <strong>15-30% more qualified leads</strong> from their existing CRM data.
        </p>
        ${cta("Start Monitoring for $49/mo", upgradeUrl)}
      `);

    case 3:
      return wrap(`
        <h2 style="color:#1a1a1a;font-size:22px;margin-bottom:16px;">Your portal has not been re-audited</h2>
        <p style="color:#444444;font-size:15px;line-height:1.7;">
          Your free audit was a one-time snapshot. Your HubSpot data changes every day — new contacts come in, owners change, integrations break.
        </p>
        <p style="color:#444444;font-size:15px;line-height:1.7;">
          Without ongoing monitoring, issues pile up silently until they show up as missed deals in your pipeline review. Upgrade to catch problems before they cost you revenue.
        </p>
        ${cta("Get Weekly Monitoring — $49/mo", upgradeUrl)}
      `);

    default:
      return "";
  }
}

const STEP_SUBJECTS: Record<number, (score: number) => string> = {
  1: (score) => `Your portal scored ${score}/100 — here is what that means`,
  2: (score) => `What a ${score} HubSpot score costs in pipeline`,
  3: () => `Your HubSpot has not been scanned in 7 days`,
};

export function getSubjectForStep(step: number, score: number): string {
  return STEP_SUBJECTS[step]?.(score) ?? "";
}
