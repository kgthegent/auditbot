import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fixture.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "fixture-anon";
process.env.SUPABASE_SERVICE_ROLE_KEY = "fixture-service";
process.env.CRON_SECRET = "fixture-cron";
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

for (const failure of ["provider", "insert", "fallback", "completion"] as const) {
  test(`weekly ${failure} failure cannot send a success digest`, async () => {
    let emails = 0; let inserts = 0; let completions = 0;
    global.fetch = async (input, init) => {
      const url = new URL(String(input));
      if (url.hostname === "api.agentmail.to") { emails++; return json({}); }
      if (url.hostname === "api.hubapi.com") {
        if (url.pathname.includes("access-tokens")) return json({ hub_id: "1" });
        if (!url.pathname.endsWith("search")) return failure === "provider" ? json({}, 403) : json({ results: [] });
        return json({ total: 0, results: [] });
      }
      assert.equal(url.hostname, "fixture.supabase.co");
      if (url.pathname.endsWith("portals")) return json([{ id: "portal", hub_id: "1", platform: "hubspot", access_token: "fixture", users: { email: "owner@example.com", plan: "pro" } }]);
      if (url.pathname.endsWith("audit_checks")) {
        inserts++;
        return failure === "fallback" && inserts === 1 ? json({ message: "example_records missing" }, 400)
          : failure === "insert" || failure === "fallback" ? json({ message: "storage failed" }, 400) : json({});
      }
      if (url.pathname.endsWith("audits") && init?.method === "POST") return json({ id: "audit" });
      if (url.pathname.endsWith("audits") && init?.method === "PATCH") { completions++; return json({ message: "completion failed" }, 400); }
      throw new Error("Unexpected fixture request");
    };
    const { GET } = await import("../app/api/cron/weekly-audit/route");
    const response = await GET(new NextRequest("https://audit.example/api/cron/weekly-audit", { headers: { authorization: "Bearer fixture-cron" } }));
    assert.deepEqual(await response.json(), { ran: 0, failed: 1, total: 1 });
    assert.equal(emails, 0);
    assert.equal(completions, failure === "completion" ? 1 : 0);
  });
}
