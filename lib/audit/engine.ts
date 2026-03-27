import { CheckResult } from "@/types";

const HUBSPOT_API = "https://api.hubapi.com";

async function hubspotGet(path: string, accessToken: string, params?: Record<string, string>) {
  const url = new URL(`${HUBSPOT_API}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HubSpot API error ${res.status}: ${text}`);
  }
  return res.json();
}

async function getTotalContacts(accessToken: string): Promise<number> {
  const data = await hubspotGet("/crm/v3/objects/contacts", accessToken, { limit: "1" });
  return data.total ?? 0;
}

function toStatus(percentage: number, warnThreshold: number, failThreshold: number) {
  if (percentage >= failThreshold) return "fail" as const;
  if (percentage >= warnThreshold) return "warn" as const;
  return "pass" as const;
}

export async function checkDuplicateContacts(accessToken: string): Promise<CheckResult> {
  // Search for contacts grouped by email to find duplicates
  const data = await hubspotGet("/crm/v3/objects/contacts", accessToken, {
    limit: "100",
    properties: "email",
  });

  const emails = (data.results || [])
    .map((c: { properties: { email?: string } }) => c.properties.email?.toLowerCase())
    .filter(Boolean);

  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const email of emails) {
    if (seen.has(email)) dupes.add(email);
    seen.add(email);
  }

  const total = await getTotalContacts(accessToken);
  const count = dupes.size;
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return {
    checkName: "Duplicate Contacts",
    severity: "high",
    count,
    percentage: Math.round(percentage * 100) / 100,
    status: toStatus(percentage, 2, 5),
    description: `Found ${count} duplicate email addresses across ${total} contacts.`,
    fixSteps: [
      "Export duplicate contacts and review manually",
      "Use HubSpot's merge tool to combine duplicate records",
      "Set up a deduplication workflow to prevent future duplicates",
    ],
  };
}

export async function checkMissingOwner(accessToken: string): Promise<CheckResult> {
  // Note: initial fetch not needed here, using search API directly below

  // Use search API to filter for contacts with no owner
  const searchRes = await fetch(`${HUBSPOT_API}/crm/v3/objects/contacts/search`, {
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
              propertyName: "hubspot_owner_id",
              operator: "NOT_HAS_PROPERTY",
            },
          ],
        },
      ],
      limit: 1,
    }),
  });

  if (!searchRes.ok) throw new Error("Search API failed for missing owner check");
  const searchData = await searchRes.json();

  const total = await getTotalContacts(accessToken);
  const count = searchData.total ?? 0;
  const percentage = total > 0 ? (count / total) * 100 : 0;

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
  };
}

export async function checkMissingLifecycleStage(accessToken: string): Promise<CheckResult> {
  const searchRes = await fetch(`${HUBSPOT_API}/crm/v3/objects/contacts/search`, {
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
              propertyName: "lifecyclestage",
              operator: "NOT_HAS_PROPERTY",
            },
          ],
        },
      ],
      limit: 1,
    }),
  });

  if (!searchRes.ok) throw new Error("Search API failed for lifecycle stage check");
  const searchData = await searchRes.json();

  const total = await getTotalContacts(accessToken);
  const count = searchData.total ?? 0;
  const percentage = total > 0 ? (count / total) * 100 : 0;

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
  };
}

export async function checkUnassignedNewLeads(accessToken: string): Promise<CheckResult> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const searchRes = await fetch(`${HUBSPOT_API}/crm/v3/objects/contacts/search`, {
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
            {
              propertyName: "hubspot_owner_id",
              operator: "NOT_HAS_PROPERTY",
            },
          ],
        },
      ],
      limit: 1,
    }),
  });

  if (!searchRes.ok) throw new Error("Search API failed for unassigned leads check");
  const searchData = await searchRes.json();

  // Get total new contacts in last 7 days
  const totalNewRes = await fetch(`${HUBSPOT_API}/crm/v3/objects/contacts/search`, {
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

  const totalNewData = totalNewRes.ok ? await totalNewRes.json() : { total: 0 };
  const totalNew = totalNewData.total ?? 0;
  const count = searchData.total ?? 0;
  const percentage = totalNew > 0 ? (count / totalNew) * 100 : 0;

  return {
    checkName: "Unassigned New Leads (7d)",
    severity: "high",
    count,
    percentage: Math.round(percentage * 100) / 100,
    status: toStatus(percentage, 15, 30),
    description: `${count} of ${totalNew} contacts created in the last 7 days have no owner.`,
    fixSteps: [
      "Set up lead rotation workflows for immediate assignment",
      "Create SLA alerts for unassigned leads older than 24 hours",
      "Review form submission workflows to ensure proper routing",
    ],
  };
}

export async function checkUTMGaps(accessToken: string): Promise<CheckResult> {
  const searchRes = await fetch(`${HUBSPOT_API}/crm/v3/objects/contacts/search`, {
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
      limit: 1,
    }),
  });

  if (!searchRes.ok) throw new Error("Search API failed for UTM gaps check");
  const searchData = await searchRes.json();

  const total = await getTotalContacts(accessToken);
  const count = searchData.total ?? 0;
  const percentage = total > 0 ? (count / total) * 100 : 0;

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
  };
}

export async function runAllChecks(accessToken: string): Promise<CheckResult[]> {
  const results = await Promise.allSettled([
    checkDuplicateContacts(accessToken),
    checkMissingOwner(accessToken),
    checkMissingLifecycleStage(accessToken),
    checkUnassignedNewLeads(accessToken),
    checkUTMGaps(accessToken),
  ]);

  return results
    .filter((r): r is PromiseFulfilledResult<CheckResult> => r.status === "fulfilled")
    .map((r) => r.value);
}
