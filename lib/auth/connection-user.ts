import type { NextRequest } from "next/server";
import { readSession } from "@/lib/auth/session";
import { isPlaceholderEmail } from "@/lib/auth/email";
import { supabaseAdmin } from "@/lib/supabase/client";

// A provider credential proves access to that provider, never ownership of a
// submitted email address. Only an existing signed session can select an email account.
export async function getConnectionUser(request: NextRequest, placeholderEmail: string) {
  const session = readSession(request);
  if (session) {
    const { data, error } = await supabaseAdmin.from("users").select("id, email").eq("id", session.userId).single();
    if (error || !data) throw new Error("Signed-in account is unavailable");
    // Placeholder sessions cannot grant access to another provider's placeholder account.
    if (!isPlaceholderEmail(data.email) || data.email === placeholderEmail) return data as { id: string; email: string };
  }
  const { data, error } = await supabaseAdmin.from("users")
    .upsert({ email: placeholderEmail }, { onConflict: "email" }).select("id, email").single();
  if (error || !data) throw new Error("Could not create provider account");
  return data as { id: string; email: string };
}
