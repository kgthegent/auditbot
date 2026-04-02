import { supabaseAdmin } from "@/lib/supabase/client";
import { refreshToken } from "./oauth";

interface SOQLResult {
  totalSize: number;
  done: boolean;
  records: Record<string, unknown>[];
}

async function sfQuery(
  instanceUrl: string,
  accessToken: string,
  soql: string
): Promise<SOQLResult> {
  const url = `${instanceUrl}/services/data/v59.0/query?q=${encodeURIComponent(soql)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Salesforce API error ${res.status}: ${text}`);
  }

  return res.json();
}

export async function runSOQL(
  portalId: string,
  query: string
): Promise<SOQLResult> {
  const { data: portal, error } = await supabaseAdmin
    .from("portals")
    .select("access_token, refresh_token, instance_url")
    .eq("id", portalId)
    .single();

  if (error || !portal) throw new Error("Portal not found");

  try {
    return await sfQuery(portal.instance_url, portal.access_token, query);
  } catch (err) {
    // Auto-refresh on 401
    if (err instanceof Error && err.message.includes("401")) {
      const refreshed = await refreshToken(portal.refresh_token);

      await supabaseAdmin
        .from("portals")
        .update({
          access_token: refreshed.access_token,
          instance_url: refreshed.instance_url,
        })
        .eq("id", portalId);

      return sfQuery(refreshed.instance_url, refreshed.access_token, query);
    }
    throw err;
  }
}
