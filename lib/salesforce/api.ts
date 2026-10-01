import { supabaseAdmin } from "@/lib/supabase/client";
import { normalizeProviderBaseUrl, providerFetch } from "@/lib/security/provider-url";
import { refreshToken } from "./oauth";

interface SOQLResult {
  totalSize: number;
  done: boolean;
  records: Record<string, unknown>[];
  nextRecordsUrl?: string;
}

const MAX_QUERY_PAGES = 1_000;

class SalesforceApiError extends Error {
  constructor(readonly status: number) {
    // Provider responses may contain customer data; do not include their bodies.
    super(`Salesforce API request failed (${status})`);
    this.name = "SalesforceApiError";
  }
}

function salesforceBaseUrl(value: string) {
  return normalizeProviderBaseUrl(value, [".salesforce.com"]);
}

function parseQueryResult(value: unknown): SOQLResult {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid Salesforce query response");
  }
  const result = value as SOQLResult;
  if (
    !Number.isSafeInteger(result.totalSize) ||
    result.totalSize < 0 ||
    typeof result.done !== "boolean" ||
    !Array.isArray(result.records) ||
    result.records.some((record) => !record || typeof record !== "object" || Array.isArray(record))
  ) {
    throw new Error("Invalid Salesforce query response");
  }
  return result;
}

function nextQueryPath(value: unknown): string {
  // Query locators are relative paths, never arbitrary URLs. Validate before
  // attaching a bearer token to a pagination request.
  if (
    typeof value !== "string" ||
    !/^\/services\/data\/v\d+\.\d+\/query\/[A-Za-z0-9_-]+$/.test(value)
  ) {
    throw new Error("Salesforce query returned an invalid pagination locator");
  }
  return value;
}

export async function getSalesforceInstanceUrl(portalId: string): Promise<string> {
  const { data: portal, error } = await supabaseAdmin
    .from("portals")
    .select("instance_url")
    .eq("id", portalId)
    .single();

  if (error || !portal?.instance_url) throw new Error("Salesforce instance URL not found");
  return salesforceBaseUrl(portal.instance_url);
}

export function salesforceRecordUrl(
  instanceUrl: string,
  objectApiName: string,
  id: unknown
) {
  if (typeof id !== "string" || !id) return undefined;
  return `${salesforceBaseUrl(instanceUrl)}/lightning/r/${encodeURIComponent(objectApiName)}/${encodeURIComponent(id)}/view`;
}

async function sfQuery(
  instanceUrl: string,
  accessToken: string,
  soql: string
): Promise<SOQLResult> {
  const baseUrl = salesforceBaseUrl(instanceUrl);
  let path = `/services/data/v59.0/query?q=${encodeURIComponent(soql)}`;
  const visited = new Set<string>();
  const records: Record<string, unknown>[] = [];
  let totalSize: number | undefined;
  // COUNT() uses totalSize for the count and returns no record rows.
  const countOnly = /^\s*SELECT\s+COUNT\(\s*\)\s+FROM\b/i.test(soql);

  for (let page = 0; page < MAX_QUERY_PAGES; page++) {
    if (visited.has(path)) {
      throw new Error("Salesforce query repeated a pagination locator");
    }
    visited.add(path);
    const res = await providerFetch(`${baseUrl}${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      redirect: "error",
    });

    if (!res.ok) throw new SalesforceApiError(res.status);

    const result = parseQueryResult(await res.json());
    if (totalSize === undefined) totalSize = result.totalSize;
    if (result.totalSize !== totalSize) {
      throw new Error("Salesforce query changed its total during pagination");
    }
    records.push(...result.records);

    if (result.done) {
      if (!countOnly && records.length !== totalSize) {
        throw new Error("Salesforce query returned an incomplete record set");
      }
      return { totalSize, done: true, records };
    }
    if (countOnly || result.records.length === 0 || records.length >= totalSize) {
      throw new Error("Salesforce query returned inconsistent pagination metadata");
    }
    path = nextQueryPath(result.nextRecordsUrl);
  }

  throw new Error("Salesforce query exceeded the pagination safety limit; audit is incomplete");
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
    if (err instanceof SalesforceApiError && err.status === 401) {
      const refreshed = await refreshToken(portal.refresh_token);
      const instanceUrl = salesforceBaseUrl(refreshed.instance_url);

      const { error: updateError } = await supabaseAdmin
        .from("portals")
        .update({
          access_token: refreshed.access_token,
          instance_url: instanceUrl,
        })
        .eq("id", portalId);
      if (updateError) throw new Error("Unable to save refreshed Salesforce credentials");

      // Restart from the first page, so records from two queries cannot mix.
      return sfQuery(instanceUrl, refreshed.access_token, query);
    }
    throw err;
  }
}
