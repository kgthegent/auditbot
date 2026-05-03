import { CheckResult, ExampleRecord } from "@/types";

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
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HubSpot API error ${res.status}: ${text}`);
  }
  return res.json();
}

async function getTotalContacts(accessToken: string): Promise<number> {
  const res = await fetch(`${HUBSPOT_API}/crm/v3/objects/contacts/search`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ filterGroups: [], limit: 1 }),
  });
  if (!res.ok) return 0;
  const data = await res.json();
  return data.total ?? 0;
}

async function getHubId(accessToken: string): Promise<string> {
  const res = await fetch(`${HUBSPOT_API}/oauth/v1/access-tokens/${accessToken}`);
  if (!res.ok) return "";
  const data = await res.json();
  return String(data.hub_id ?? "");
}

async function hubspotContactSearch(
  accessToken: string,
  body: Record<string, unknown>
) {
  const res = await fetch(`${HUBSPOT_API}/crm/v3/objects/contacts/search`, {
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
  return res.json();
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
  // Search for contacts grouped by email to find duplicates
  const data = await hubspotGet("/crm/v3/objects/contacts", accessToken, {
    limit: "100",
    properties: SAMPLE_PROPERTIES.join(","),
  });

  const records = (data.results || []) as {
    id: string;
    properties: Record<string, string | undefined>;
  }[];
  const emails = records
    .map((c) => c.properties.email?.toLowerCase())
    .filter(Boolean) as string[];

  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const email of emails) {
    if (seen.has(email)) dupes.add(email);
    seen.add(email);
  }

  const count = dupes.size;
  const percentage = total > 0 ? (count / total) * 100 : 0;
  const exampleRecords = mapContactExamples(
    hubId,
    records.filter((record) => dupes.has(record.properties.email?.toLowerCase() ?? ""))
  );

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
  // If totalNew is 0 but count > 0, treat as 100% affected
  const percentage = totalNew > 0 ? (count / totalNew) * 100 : count > 0 ? 100 : 0;

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
    exampleRecords: mapContactExamples(hubId, searchData.results ?? []),
  };
}

export async function runAllChecks(accessToken: string): Promise<CheckResult[]> {
  // Fetch total once upfront and inject into checks that need it
  const total = await getTotalContacts(accessToken);
  const hubId = await getHubId(accessToken);

  const results = await Promise.allSettled([
    checkDuplicateContacts(accessToken, total, hubId),
    checkMissingOwner(accessToken, total, hubId),
    checkMissingLifecycleStage(accessToken, total, hubId),
    checkUnassignedNewLeads(accessToken, total, hubId),
    checkUTMGaps(accessToken, total, hubId),
  ]);

  return results
    .filter((r): r is PromiseFulfilledResult<CheckResult> => r.status === "fulfilled")
    .map((r) => r.value);
}
