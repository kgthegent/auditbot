import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/client";
import { sendEmail, getEmailHtml, getSubjectForStep } from "@/lib/email/sequence";

// Schedule: next_send_at offsets per step
// After step 0 (immediate): +1 day  → step 1
// After step 1:             +2 days → step 2  (day 3 total)
// After step 2:             +4 days → step 3  (day 7 total)
// After step 3:             mark completed
const NEXT_DELAY_DAYS: Record<number, number> = {
  1: 2, // after sending step 1, schedule step 2 in 2 more days
  2: 4, // after sending step 2, schedule step 3 in 4 more days
};

export async function GET() {
  try {
    const { data: sequences, error } = await supabaseAdmin
      .from("email_sequences")
      .select("*")
      .eq("completed", false)
      .lte("next_send_at", new Date().toISOString());

    if (error) {
      console.error("Failed to query email sequences:", error);
      return NextResponse.json({ error: "Query failed" }, { status: 500 });
    }

    let sent = 0;
    let errors = 0;

    for (const seq of sequences ?? []) {
      const nextStep = seq.step + 1;
      if (nextStep > 3) {
        // Mark completed
        await supabaseAdmin
          .from("email_sequences")
          .update({ completed: true })
          .eq("id", seq.id);
        continue;
      }

      try {
        const html = getEmailHtml(nextStep, seq.user_email, seq.hub_id, seq.audit_score ?? 0);
        const subject = getSubjectForStep(nextStep, seq.audit_score ?? 0);
        await sendEmail(seq.user_email, subject, html);

        const isLastStep = nextStep >= 3;
        const delayDays = NEXT_DELAY_DAYS[nextStep];
        const nextSendAt = delayDays
          ? new Date(Date.now() + delayDays * 24 * 60 * 60 * 1000).toISOString()
          : null;

        await supabaseAdmin
          .from("email_sequences")
          .update({
            step: nextStep,
            next_send_at: nextSendAt,
            completed: isLastStep,
          })
          .eq("id", seq.id);

        sent++;
      } catch (err) {
        console.error(`Failed to send step ${nextStep} to ${seq.user_email}:`, err);
        errors++;
      }
    }

    return NextResponse.json({ sent, errors, total: sequences?.length ?? 0 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
