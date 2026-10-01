import { CheckResult, ExampleRecord } from "@/types";

import { IncompleteAuditError, runChecks } from "./completeness";

const HUBSPOT_API = "https://api.hubapi.com";
const SAMPLE_PROPERTIES = [
  "firstname",
  "lastname",
  "email",
  "createdate",
  "lifecyclestage",
  "hs_analytics_source",
  "hubspot_owner_id",
];

async function hubspotGet(path: string, accessToken: string, params?: Record<string, string>) {
  const url = new URL(`${HUBSPOT_API}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const res = await fetch(url.toString(), {
    signal: AbortSignal.timeout(30000),
    cache: "no-store",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`HubSpot API error ${res.status}`);
  }
  return res.json();
}

async function getTotalContacts(accessToken: string): Promise<number> {
  const res = await fetch(`${HUBSPOT_API}/crm/v3/objects/contacts/search`, {
    signal: AbortSignal.timeout(30000),
    cache: "no-store",
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ filterGroups: [], limit: 1 }),
  });
  if (!res.ok) throw new Error(`HubSpot contact total failed (${res.status})`);
  const data = await res.json();
  return requireTotal(data.total);
}

async function getHubId(accessToken: string): Promise<string> {
  const res = await fetch(`${HUBSPOT_API}/oauth/v1/access-tokens/${accessToken}`, { signal: AbortSignal.timeout(30000), cache: "no-store" });
  if (!res.ok) return "";
  const data = await res.json();
  return String(data.hub_id ?? "");
}

async function hubspotContactSearch(
  accessToken: string,
  body: Record<string, unknown>
) {
  const res = await fetch(`${HUBSPOT_API}/crm/v3/objects/contacts/search`, {
    signal: AbortSignal.timeout(30000),
    cache: "no-store",
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: SAMPLE_PROPERTIES,
      limit: 5,
      ...body,
    }),
  });

  if (!res.ok) throw new Error("HubSpot contact search failed");
  const data = await res.json();
  requireTotal(data.total);
  if (!Array.isArray(data.results)) throw new Error("Invalid HubSpot search response");
  return data;
}

function requireTotal(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error("Invalid HubSpot contact total");
  }
  return value;
}

function affectedPercentage(count: number, total: number): number {
  if (count > total) throw new Error("Contact totals changed during audit; retry for a consistent result");
  return total > 0 ? (count / total) * 100 : 0;
}

function formatDate(value?: string) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function contactLabel(properties: Record<string, string | undefined>) {
  const name = [properties.firstname, properties.lastname].filter(Boolean).join(" ");
  return name || properties.email || "Unnamed contact";
}

function mapContactExamples(
  hubId: string,
  records: { id: string; properties: Record<string, string | undefined> }[]
): ExampleRecord[] {
  return records.slice(0, 5).map((record) => {
    const created = formatDate(record.properties.createdate);
    return {
      id: record.id,
      label: contactLabel(record.properties),
      detail: record.properties.email || "No email",
      secondary: created ? `Created ${created}` : undefined,
      url: hubId
        ? `https://app.hubspot.com/contacts/${hubId}/record/0-1/${record.id}`
        : undefined,
    };
  });
}

function toStatus(percentage: number, warnThreshold: number, failThreshold: number) {
  if (percentage >= failThreshold) return "fail" as const;
  if (percentage >= warnThreshold) return "warn" as const;
  return "pass" as const;
}

export async function checkDuplicateContacts(accessToken: string, total: number, hubId: string): Promise<CheckResult> {
  // Follow the objects cursor rather than treating page one as a portal scan.
  const records: { id: string; properties: Record<string, string | undefined> }[] = [];
  const cursors = new Set<string>();
  const ids = new Set<string>();
  let after: string | undefined;
  do {
    const data = await hubspotGet("/crm/v3/objects/contacts", accessToken, {
      limit: "100", properties: SAMPLE_PROPERTIES.join(","), ...(after ? { after } : {}),
    });
    if (!Array.isArray(data.results)) throw new Error("Invalid HubSpot contact page");
    for (const record of data.results) {
      if (!record || typeof record.id !== "string" || !record.properties || ids.has(record.id)) {
        throw new Error("Invalid or repeated HubSpot contact record");
      }
      ids.add(record.id);
      records.push(record);
    }
    const next = data.paging?.next;
    if (next && data.results.length === 0) throw new Error("Empty HubSpot page has a continuation cursor");
    if (next && (next.after === undefined || next.after === null)) throw new Error("Invalid HubSpot cursor");
    after = next ? String(next.after) : undefined;
    if (after !== undefined) {
      if (!after || cursors.has(after)) throw new Error("Repeated HubSpot cursor");
      cursors.add(after);
    }
    // Fail closed rather than publish a partial score if execution would be unbounded.
    if (records.length > 100000) throw new Error("HubSpot duplicate scan exceeds 100000 contacts");
  } while (after !== undefined);

  const frequencies = new Map<string, number>();
  for (const record of records) {
    const email = record.properties.email?.trim().toLowerCase();
    if (email) frequencies.set(email, (frequencies.get(email) ?? 0) + 1);
  }
  const dupes = new Set(Array.from(frequencies).filter(([, count]) => count > 1).map(([email]) => email));
  // Count affected records, not email groups divided by a record denominator.
  const count = Array.from(dupes).reduce((sum, email) => sum + frequencies.get(email)!, 0);
  const scanned = records.length;
  const percentage = scanned > 0 ? (count / scanned) * 100 : 0;
  const exampleRecords = mapContactExamples(
    hubId, records.filter((record) => dupes.has(record.properties.email?.trim().toLowerCase() ?? ""))
  );

  return {
    checkName: "Duplicate Contacts",
    severity: "high",
    count,
    percentage: Math.round(percentage * 100) / 100,
    status: toStatus(percentage, 2, 5),
    description: `Found ${count} contacts sharing ${dupes.size} duplicate email addresses across ${scanned} scanned contacts (search total at start: ${total}).`,
    fixSteps: [
      "Export duplicate contacts and review manually",
      "Use HubSpot's merge tool to combine duplicate records",
      "Set up a deduplication workflow to prevent future duplicates",
    ],
    exampleRecords,
  };
}

export async function checkMissingOwner(accessToken: string, total: number, hubId: string): Promise<CheckResult> {
  // Note: initial fetch not needed here, using search API directly below

  // Use search API to filter for contacts with no owner
  const searchData = await hubspotContactSearch(accessToken, {
      filterGroups: [
        {
          filters: [
            {
              propertyName: "hubspot_owner_id",
              operator: "NOT_HAS_PROPERTY",
            },
          ],
        },
      ],
  });

  const count = searchData.total ?? 0;
  const percentage = affectedPercentage(count, total);

  return {
    checkName: "Missing Contact Owner",
    severity: "high",
    count,
    percentage: Math.round(percentage * 100) / 100,
    status: toStatus(percentage, 10, 25),
    description: `${count} of ${total} contacts have no assigned owner.`,
    fixSteps: [
      "Create assignment rules based on territory, lead source, or round-robin",
      "Bulk assign orphaned contacts via list + workflow",
      "Review and update your lead routing workflows",
    ],
    exampleRecords: mapContactExamples(hubId, searchData.results ?? []),
  };
}

export async function checkMissingLifecycleStage(accessToken: string, total: number, hubId: string): Promise<CheckResult> {
  const searchData = await hubspotContactSearch(accessToken, {
      filterGroups: [
        {
          filters: [
            {
              propertyName: "lifecyclestage",
              operator: "NOT_HAS_PROPERTY",
            },
          ],
        },
      ],
  });

  const count = searchData.total ?? 0;
  const percentage = affectedPercentage(count, total);

  return {
    checkName: "Missing Lifecycle Stage",
    severity: "medium",
    count,
    percentage: Math.round(percentage * 100) / 100,
    status: toStatus(percentage, 5, 15),
    description: `${count} of ${total} contacts have no lifecycle stage set.`,
    fixSteps: [
      "Set default lifecycle stage for new contacts in HubSpot settings",
      "Create a workflow to auto-set lifecycle stage based on form submissions",
      "Bulk update existing contacts missing lifecycle stage via list",
    ],
    exampleRecords: mapContactExamples(hubId, searchData.results ?? []),
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function checkUnassignedNewLeads(accessToken: string, _total: number, hubId: string): Promise<CheckResult> {
  // HubSpot search API requires timestamps in milliseconds as strings
  const sevenDaysAgo = String(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const searchData = await hubspotContactSearch(accessToken, {
      filterGroups: [
        {
          filters: [
            {
              propertyName: "createdate",
              operator: "GTE",
              value: sevenDaysAgo,
            },
            {
              propertyName: "hubspot_owner_id",
              operator: "NOT_HAS_PROPERTY",
            },
          ],
        },
      ],
  });

  // Get total new contacts in last 7 days
  const totalNewRes = await fetch(`${HUBSPOT_API}/crm/v3/objects/contacts/search`, {
    signal: AbortSignal.timeout(30000),
    cache: "no-store",
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filterGroups: [
        {
          filters: [
            {
              propertyName: "createdate",
              operator: "GTE",
              value: sevenDaysAgo,
            },
          ],
        },
      ],
      limit: 1,
    }),
  });

  if (!totalNewRes.ok) throw new Error("HubSpot new-contact total failed");
  const totalNewData = await totalNewRes.json();
  const totalNew = requireTotal(totalNewData.total);
  const count = searchData.total ?? 0;
  const percentage = affectedPercentage(count, totalNew);

  return {
    checkName: "Unassigned New Leads (7d)",
    severity: "high",
    count,
    percentage: Math.round(percentage * 100) / 100,
    status: toStatus(percentage, 15, 30),
    description: `${count} of ${totalNew > 0 ? totalNew : count} contacts created in the last 7 days have no owner.`,
    fixSteps: [
      "Set up lead rotation workflows for immediate assignment",
      "Create SLA alerts for unassigned leads older than 24 hours",
      "Review form submission workflows to ensure proper routing",
    ],
    exampleRecords: mapContactExamples(hubId, searchData.results ?? []),
  };
}

export async function checkUTMGaps(accessToken: string, total: number, hubId: string): Promise<CheckResult> {
  const searchData = await hubspotContactSearch(accessToken, {
      filterGroups: [
        {
          filters: [
            {
              propertyName: "hs_analytics_source",
              operator: "NOT_HAS_PROPERTY",
            },
          ],
        },
        {
          filters: [
            {
              propertyName: "hs_analytics_source",
              operator: "EQ",
              value: "OFFLINE",
            },
          ],
        },
      ],
  });

  const count = searchData.total ?? 0;
  const percentage = affectedPercentage(count, total);

  return {
    checkName: "UTM / Source Gaps",
    severity: "low",
    count,
    percentage: Math.round(percentage * 100) / 100,
    status: toStatus(percentage, 20, 40),
    description: `${count} of ${total} contacts have no analytics source or are marked OFFLINE.`,
    fixSteps: [
      "Ensure all marketing links use proper UTM parameters",
      "Add hidden UTM fields to all forms",
      "Review offline import processes and add source tagging",
    ],
    exampleRecords: mapContactExamples(hubId, searchData.results ?? []),
  };
}

export async function runAllChecks(accessToken: string): Promise<CheckResult[]> {
  let total: number;
  try {
    total = await getTotalContacts(accessToken);
  } catch {
    throw new IncompleteAuditError(["Contact total"]);
  }
  // Record links are optional metadata, not an audit prerequisite.
  const hubId = await getHubId(accessToken).catch(() => "");
  return runChecks([
    { name: "Duplicate Contacts", run: () => checkDuplicateContacts(accessToken, total, hubId) },
    { name: "Missing Contact Owner", run: () => checkMissingOwner(accessToken, total, hubId) },
    { name: "Missing Lifecycle Stage", run: () => checkMissingLifecycleStage(accessToken, total, hubId) },
    { name: "Unassigned New Leads (7d)", run: () => checkUnassignedNewLeads(accessToken, total, hubId) },
    { name: "UTM / Source Gaps", run: () => checkUTMGaps(accessToken, total, hubId) },
  ]);
}
