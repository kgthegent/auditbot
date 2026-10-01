import assert from "node:assert/strict";
import { afterEach, before, mock, test } from "node:test";
import type { AuditPortal } from "../lib/platform-adapters/types";

// Only mocked network requests are used. These are deliberately fake values.
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://auditbot-test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
process.env.SALESFORCE_CLIENT_ID = "test-client";
process.env.SALESFORCE_CLIENT_SECRET = "test-client-secret";
process.env.SALESFORCE_REDIRECT_URI = "https://app.example.com/salesforce/callback";

const instanceUrl = "https://auditbot-test.my.salesforce.com";
const portal = {
  id: "test-portal",
  access_token: "test-access-token",
  refresh_token: "test-refresh-token",
  instance_url: instanceUrl,
  platform: "salesforce",
} satisfies AuditPortal;

let runSOQL: typeof import("../lib/salesforce/api").runSOQL;
let runAllChecks: typeof import("../lib/salesforce/audit").runAllChecks;

before(async () => {
  ({ runSOQL } = await import("../lib/salesforce/api"));
  ({ runAllChecks } = await import("../lib/salesforce/audit"));
});
afterEach(() => mock.restoreAll());

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function rows(records: Record<string, unknown>[]) {
  return { totalSize: records.length, done: true, records };
}

function count(totalSize: number) {
  return { totalSize, done: true, records: [] };
}

function mockSalesforce(handler: (url: URL, init?: RequestInit) => Response | Promise<Response>) {
  return mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.origin === "https://auditbot-test.supabase.co") return json(portal);
    assert.equal(url.origin, instanceUrl, "No credentials may leave the Salesforce instance");
    assert.equal(init?.redirect, "error");
    return handler(url, init);
  });
}

function healthyQuery(query: string): Response {
  if (query === "SELECT COUNT() FROM Lead") return json(count(100));
  if (query === "SELECT COUNT() FROM Contact") return json(count(50));
  if (query === "SELECT COUNT() FROM Lead WHERE IsConverted = false") return json(count(80));
  if (query === "SELECT COUNT() FROM Lead WHERE IsConverted = true") return json(count(20));
  if (query === "SELECT COUNT() FROM Opportunity WHERE IsClosed = false") return json(count(40));
  if (query.startsWith("SELECT COUNT()")) return json(count(0));
  return json(rows([]));
}

test("SOQL follows every page and returns the complete record population", async () => {
  const paths: string[] = [];
  mockSalesforce((url, init) => {
    assert.equal(new Headers(init?.headers).get("authorization"), "Bearer test-access-token");
    paths.push(url.pathname);
    return paths.length === 1
      ? json({ totalSize: 3, done: false, records: [{ Email: "a@example.com" }], nextRecordsUrl: "/services/data/v59.0/query/next-page" })
      : json({ totalSize: 3, done: true, records: [{ Email: "b@example.com" }, { Email: "c@example.com" }] });
  });
  const result = await runSOQL(portal.id, "SELECT Email FROM Lead WHERE Email != null");
  assert.deepEqual(paths, ["/services/data/v59.0/query", "/services/data/v59.0/query/next-page"]);
  assert.equal(result.totalSize, 3);
  assert.equal(result.done, true);
  assert.deepEqual(result.records.map((record) => record.Email), ["a@example.com", "b@example.com", "c@example.com"]);
});

test("COUNT() preserves totalSize even though Salesforce returns no record rows", async () => {
  mockSalesforce(() => json(count(20_000)));
  assert.equal((await runSOQL(portal.id, "SELECT COUNT() FROM Lead")).totalSize, 20_000);
});

for (const [name, nextRecordsUrl] of [
  ["missing locator", undefined],
  ["foreign origin", "https://attacker.example/services/data/v59.0/query/next"],
  ["network-path locator", "//attacker.example/services/data/v59.0/query/next"],
  ["path traversal", "/services/data/v59.0/query/../../sobjects/Lead"],
  ["unexpected endpoint", "/services/data/v59.0/sobjects/Lead"],
]) {
  test(`SOQL rejects ${name} without making a second provider request`, async () => {
    let requests = 0;
    mockSalesforce(() => {
      requests++;
      return json({ totalSize: 2, done: false, records: [{ Id: "1" }], nextRecordsUrl });
    });
    await assert.rejects(runSOQL(portal.id, "SELECT Id FROM Lead"), /pagination locator/);
    assert.equal(requests, 1);
  });
}

test("SOQL rejects repeating pagination locators", async () => {
  let requests = 0;
  mockSalesforce(() => {
    requests++;
    return json({ totalSize: 10, done: false, records: [{ Id: String(requests) }], nextRecordsUrl: "/services/data/v59.0/query/repeated" });
  });
  await assert.rejects(runSOQL(portal.id, "SELECT Id FROM Lead"), /repeated a pagination locator/);
  assert.equal(requests, 2);
});

test("SOQL rejects a done response that silently truncates records", async () => {
  mockSalesforce(() => json({ totalSize: 3, done: true, records: [{ Id: "1" }] }));
  await assert.rejects(runSOQL(portal.id, "SELECT Id FROM Lead"), /incomplete record set/);
});

test("SOQL rejects a changing total across pages", async () => {
  let requests = 0;
  mockSalesforce(() => ++requests === 1
    ? json({ totalSize: 2, done: false, records: [{ Id: "1" }], nextRecordsUrl: "/services/data/v59.0/query/next" })
    : json({ totalSize: 3, done: true, records: [{ Id: "2" }] }));
  await assert.rejects(runSOQL(portal.id, "SELECT Id FROM Lead"), /changed its total/);
});

test("SOQL rejects malformed provider data rather than reporting a healthy audit", async () => {
  mockSalesforce(() => json({ totalSize: "3", done: true, records: [] }));
  await assert.rejects(runSOQL(portal.id, "SELECT Id FROM Lead"), /Invalid Salesforce query response/);
});

test("SOQL refreshes a 401 once and restarts pagination with the refreshed token", async () => {
  let requests = 0;
  let refreshes = 0;
  let saves = 0;
  mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.origin === "https://auditbot-test.supabase.co") {
      if (init?.method === "PATCH") { saves++; return json({}); }
      return json(portal);
    }
    if (url.href === "https://login.salesforce.com/services/oauth2/token") {
      refreshes++;
      return json({ access_token: "refreshed-test-token", instance_url: instanceUrl });
    }
    assert.equal(url.origin, instanceUrl);
    requests++;
    if (requests === 1) return json({ totalSize: 2, done: false, records: [{ Id: "old-snapshot" }], nextRecordsUrl: "/services/data/v59.0/query/next" });
    if (requests === 2) return json([{ errorCode: "INVALID_SESSION_ID" }], 401);
    assert.equal(url.pathname, "/services/data/v59.0/query");
    assert.equal(new Headers(init?.headers).get("authorization"), "Bearer refreshed-test-token");
    return json(rows([{ Id: "new-snapshot" }]));
  });
  const result = await runSOQL(portal.id, "SELECT Id FROM Lead");
  assert.deepEqual(result.records, [{ Id: "new-snapshot" }]);
  assert.equal(refreshes, 1);
  assert.equal(saves, 1);
});

test("SOQL does not refresh based on a 401 substring in an unrelated error body", async () => {
  mockSalesforce(() => json({ message: "Provider details with 401 and private data" }, 400));
  await assert.rejects(runSOQL(portal.id, "SELECT Id FROM Lead"), (error: Error) => {
    assert.equal(error.message, "Salesforce API request failed (400)");
    return true;
  });
});

test("Salesforce duplicates count affected records, exclude null-email groups, and label groups separately", async () => {
  const duplicateQueries: string[] = [];
  mockSalesforce((url) => {
    const query = url.searchParams.get("q")!;
    if (query.includes("GROUP BY Email")) {
      duplicateQueries.push(query);
      assert.match(query, /WHERE Email != null GROUP BY Email/);
      return json(rows(query.includes("FROM Lead")
        ? [{ Email: "a@example.com", total: 4 }, { Email: "b@example.com", total: 2 }]
        : [{ Email: "a@example.com", total: 3 }]));
    }
    return healthyQuery(query);
  });
  const checks = await runAllChecks(portal.id);
  assert.equal(checks.length, 9);
  const leads = checks.find((check) => check.checkName === "Duplicate Leads")!;
  assert.equal(leads.count, 6);
  assert.equal(leads.percentage, 6);
  assert.equal(leads.status, "fail");
  assert.match(leads.description, /6 of 100 leads.*2 duplicate email groups/);
  const contacts = checks.find((check) => check.checkName === "Duplicate Contacts")!;
  assert.equal(contacts.count, 3);
  assert.equal(contacts.percentage, 6);
  assert.equal(duplicateQueries.length, 2);
});

test("Salesforce stale checks include old records without activity and use identical sample filters", async () => {
  const queries: string[] = [];
  mockSalesforce((url) => {
    const query = url.searchParams.get("q")!;
    queries.push(query);
    return healthyQuery(query);
  });
  await runAllChecks(portal.id);
  for (const [object, days, state] of [["Lead", "30", "IsConverted"], ["Opportunity", "14", "IsClosed"]]) {
    const where = `${state} = false AND (LastActivityDate < LAST_N_DAYS:${days} OR (LastActivityDate = null AND CreatedDate < LAST_N_DAYS:${days}))`;
    assert.ok(queries.includes(`SELECT COUNT() FROM ${object} WHERE ${where}`));
    assert.ok(queries.some((query) => query.startsWith("SELECT Id, Name,") && query.includes(`FROM ${object} WHERE ${where} LIMIT 5`)));
  }
});

test("Campaign membership uses the standard relationship and permission failures prevent a score", async () => {
  let campaignQuery = "";
  mockSalesforce((url) => {
    const query = url.searchParams.get("q")!;
    assert.doesNotMatch(query, /Campaign__c/);
    if (query.includes("CampaignMember")) {
      campaignQuery = query;
      return json([{ errorCode: "INVALID_TYPE" }], 403);
    }
    return healthyQuery(query);
  });
  await assert.rejects(runAllChecks(portal.id), (error: Error & { failedChecks?: string[] }) => {
    assert.equal(error.name, "IncompleteAuditError");
    assert.deepEqual(error.failedChecks, ["Missing Campaign Attribution"]);
    return true;
  });
  assert.match(campaignQuery, /Id NOT IN \(SELECT LeadId FROM CampaignMember WHERE LeadId != null\)/);
});

test("A failed Salesforce check is never silently removed from the scored audit", async () => {
  mockSalesforce((url) => {
    const query = url.searchParams.get("q")!;
    if (query.includes("OwnerId = null")) return json({ message: "Denied" }, 403);
    return healthyQuery(query);
  });
  await assert.rejects(runAllChecks(portal.id), (error: Error & { failedChecks?: string[] }) => {
    assert.equal(error.name, "IncompleteAuditError");
    assert.deepEqual(error.failedChecks, ["Missing Lead Owner"]);
    return true;
  });
});

test("Lead/contact cross-duplicates include matches found only on later pages", async () => {
  mockSalesforce((url) => {
    if (url.pathname.endsWith("/leads-next")) return json({ totalSize: 2, done: true, records: [{ Email: "Later@Example.com" }] });
    const query = url.searchParams.get("q")!;
    if (query === "SELECT Email FROM Lead WHERE Email != null") return json({ totalSize: 2, done: false, records: [{ Email: "first@example.com" }], nextRecordsUrl: "/services/data/v59.0/query/leads-next" });
    if (query === "SELECT Email FROM Contact WHERE Email != null") return json(rows([{ Email: "later@example.com" }]));
    return healthyQuery(query);
  });
  const result = (await runAllChecks(portal.id)).find((check) => check.checkName === "Lead/Contact Cross-Dupes")!;
  assert.equal(result.count, 1);
  assert.equal(result.percentage, 50);
  assert.match(result.description, /1 of 2 distinct non-empty lead email addresses/);
});

test("Marketo and Marketing Cloud connectivity cannot produce a health score", async () => {
  const { marketoAdapter } = await import("../lib/platform-adapters/marketo");
  const { marketingCloudAdapter } = await import("../lib/platform-adapters/marketing-cloud");
  mock.method(globalThis, "fetch", async () => { throw new Error("Unsupported audits must fail before fetching"); });
  for (const [adapter, name] of [[marketoAdapter, "Marketo"], [marketingCloudAdapter, "Marketing Cloud"]] as const) {
    await assert.rejects(adapter.runAudit({ ...portal, platform: adapter.id }), (error: Error & { failedChecks?: string[] }) => {
      assert.equal(error.name, "IncompleteAuditError");
      assert.match(error.message, /No health score was produced/);
      assert.deepEqual(error.failedChecks, [`${name} health checks (not implemented; connectivity only)`]);
      return true;
    });
  }
});

for (const [name, record] of [
  ["null email group", { Email: null, total: 5 }],
  ["malformed group size", { Email: "a@example.com", total: "5" }],
  ["impossible affected count", { Email: "a@example.com", total: 101 }],
] as const) {
  test(`Duplicate checks fail closed for a ${name}`, async () => {
    mockSalesforce((url) => {
      const query = url.searchParams.get("q")!;
      if (query.includes("FROM Lead") && query.includes("GROUP BY Email")) return json(rows([record]));
      return healthyQuery(query);
    });
    await assert.rejects(runAllChecks(portal.id), (error: Error & { failedChecks?: string[] }) => {
      assert.deepEqual(error.failedChecks, ["Duplicate Leads"]);
      return true;
    });
  });
}

test("An unavailable aggregate page prevents a partial duplicate score", async () => {
  mockSalesforce((url) => {
    const query = url.searchParams.get("q")!;
    if (query?.includes("FROM Lead") && query.includes("GROUP BY Email")) {
      return json({ totalSize: 2, done: false, records: [{ Email: "a@example.com", total: 4 }], nextRecordsUrl: "/services/data/v59.0/query/aggregate-next" });
    }
    if (url.pathname.endsWith("/aggregate-next")) return json([{ errorCode: "EXCEEDED_ID_LIMIT" }], 400);
    return healthyQuery(query);
  });
  await assert.rejects(runAllChecks(portal.id), (error: Error & { failedChecks?: string[] }) => {
    assert.deepEqual(error.failedChecks, ["Duplicate Leads"]);
    return true;
  });
});

test("Invalid stored Salesforce instance URLs fail before the bearer token is sent", async () => {
  let providerRequests = 0;
  mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.origin === "https://auditbot-test.supabase.co") return json({ ...portal, instance_url: "https://attacker.example" });
    providerRequests++;
    throw new Error("Unexpected provider request");
  });
  await assert.rejects(runSOQL(portal.id, "SELECT Id FROM Lead"), /Unsupported provider URL/);
  assert.equal(providerRequests, 0);
});

test("Failed refreshed-credential persistence prevents retry with unsaved credentials", async () => {
  let providerRequests = 0;
  mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.origin === "https://auditbot-test.supabase.co") {
      return init?.method === "PATCH" ? json({ message: "Update denied" }, 403) : json(portal);
    }
    if (url.href === "https://login.salesforce.com/services/oauth2/token") return json({ access_token: "new-test-token", instance_url: instanceUrl });
    assert.equal(url.origin, instanceUrl);
    providerRequests++;
    return json([{ errorCode: "INVALID_SESSION_ID" }], 401);
  });
  await assert.rejects(runSOQL(portal.id, "SELECT Id FROM Lead"), /Unable to save refreshed Salesforce credentials/);
  assert.equal(providerRequests, 1);
});

const ratioChecks = [
  {
    name: "Missing Lead Owner",
    denominator: "SELECT COUNT() FROM Lead",
    numerator: (query: string) => query === "SELECT COUNT() FROM Lead WHERE OwnerId = null",
  },
  {
    name: "Missing Lead Source",
    denominator: "SELECT COUNT() FROM Lead",
    numerator: (query: string) => query === "SELECT COUNT() FROM Lead WHERE LeadSource = null",
  },
  {
    name: "Stale Leads (30d No Activity)",
    denominator: "SELECT COUNT() FROM Lead WHERE IsConverted = false",
    numerator: (query: string) => query.startsWith("SELECT COUNT() FROM Lead WHERE IsConverted = false AND (LastActivityDate"),
  },
  {
    name: "Converted Leads Without Contact",
    denominator: "SELECT COUNT() FROM Lead WHERE IsConverted = true",
    numerator: (query: string) => query === "SELECT COUNT() FROM Lead WHERE IsConverted = true AND ConvertedContactId = null",
  },
  {
    name: "Missing Campaign Attribution",
    denominator: "SELECT COUNT() FROM Lead",
    numerator: (query: string) => query.startsWith("SELECT COUNT() FROM Lead WHERE Id NOT IN (SELECT LeadId FROM CampaignMember"),
  },
  {
    name: "Open Opps No Activity (14d)",
    denominator: "SELECT COUNT() FROM Opportunity WHERE IsClosed = false",
    numerator: (query: string) => query.startsWith("SELECT COUNT() FROM Opportunity WHERE IsClosed = false AND (LastActivityDate"),
  },
];

for (const check of ratioChecks) {
  for (const total of [0, 2]) {
    test(`${check.name} rejects ${total + 1} affected records out of ${total} instead of scoring`, async () => {
      mockSalesforce((url) => {
        const query = url.searchParams.get("q")!;
        if (query === check.denominator) return json(count(total));
        if (check.numerator(query)) return json(count(total + 1));
        return healthyQuery(query);
      });
      await assert.rejects(runAllChecks(portal.id), (error: Error & { failedChecks?: string[] }) => {
        assert.equal(error.name, "IncompleteAuditError");
        assert.deepEqual(error.failedChecks, [check.name]);
        return true;
      });
    });
  }
}

test("A genuinely empty Salesforce population reports zero affected records without invalid ratios", async () => {
  mockSalesforce((url) => {
    const query = url.searchParams.get("q")!;
    return json(query.startsWith("SELECT COUNT()") ? count(0) : rows([]));
  });
  const checks = await runAllChecks(portal.id);
  assert.equal(checks.length, 9);
  for (const check of checks) {
    assert.equal(check.count, 0);
    assert.equal(check.percentage, 0);
    assert.equal(check.status, "pass");
  }
});
