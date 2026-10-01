import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { createSessionToken } from "../lib/auth/session";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fixture.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "fixture-anon";
process.env.SUPABASE_SERVICE_ROLE_KEY = "fixture-service";
process.env.SESSION_SECRET = "synthetic-test-secret-not-for-deployment-12345";
const userId = "11111111-1111-4111-8111-111111111111";
const portalId = "22222222-2222-4222-8222-222222222222";
const auditId = "33333333-3333-4333-8333-333333333333";
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
const request = (cookie?: string) => new NextRequest("https://audit.example/api/audit/run", {
  method: "POST", headers: { "content-type": "application/json", cookie: cookie ?? `sa_session=${createSessionToken({ userId, email: "owner@example.com", hubId: "123" })}` },
  body: JSON.stringify({ portal_id: portalId }),
});

function mockScenario(failure?: "provider" | "checks" | "completion" | "fallback") {
  const writes: { table: string; method: string; body: Record<string, unknown> }[] = [];
  global.fetch = async (input, init) => {
    const url = new URL(String(input));
    if (url.hostname === "api.hubapi.com") {
      if (url.pathname.includes("access-tokens")) return json({ hub_id: "123" });
      if (!url.pathname.endsWith("search")) return failure === "provider" ? json({}, 429) : json({ results: [] });
      return json({ total: 0, results: [] });
    }
    assert.equal(url.hostname, "fixture.supabase.co");
    const table = url.pathname.split("/").at(-1)!;
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    if (method !== "GET") writes.push({ table, method, body });
    if (table === "users") return json({ id: userId });
    if (table === "portals") {
      if (failure === "fallback" && url.searchParams.has("id")) return json({ message: "not found" }, 406);
      return json({ id: failure === "fallback" ? "resolved-owned-portal" : portalId, user_id: userId, hub_id: "123", platform: "hubspot", access_token: "fixture" });
    }
    if (table === "audits" && method === "POST") return json({ id: auditId, ...body });
    if (table === "audit_checks") {
      if (failure === "checks") return json({ message: "storage unavailable" }, 400);
      return json(body.map((row: object, index: number) => ({ id: String(index), ...row, workflow_status: "open" })));
    }
    if (table === "audits" && method === "PATCH") return failure === "completion" ? json({ message: "update unavailable" }, 400) : json({ id: auditId });
    throw new Error(`Unexpected fixture request ${method} ${table}`);
  };
  return writes;
}

test("forged legacy cookie cannot access audit endpoint", async () => {
  global.fetch = async () => { throw new Error("Unauthenticated request must not query DB"); };
  const { POST } = await import("../app/api/audit/run/route");
  const response = await POST(request("sa_email=victim@example.com"));
  assert.equal(response.status, 401);
});
test("provider failure returns named incomplete result without writing an audit", async () => {
  const writes = mockScenario("provider");
  const { POST } = await import("../app/api/audit/run/route");
  const response = await POST(request());
  const body = await response.json();
  assert.equal(response.status, 502);
  assert.equal(body.score, null);
  assert.deepEqual(body.failed_checks, ["Duplicate Contacts"]);
  assert.equal(writes.length, 0);
});
test("failed check persistence never finalizes or returns a score", async () => {
  const writes = mockScenario("checks");
  const { POST } = await import("../app/api/audit/run/route");
  const response = await POST(request());
  assert.equal(response.status, 500);
  assert.equal((await response.json()).score, undefined);
  assert.equal(writes.some((write) => write.method === "PATCH"), false);
});
test("failed completion update cannot claim success", async () => {
  mockScenario("completion");
  const { POST } = await import("../app/api/audit/run/route");
  const response = await POST(request());
  assert.equal(response.status, 500);
  assert.match((await response.json()).error, /finalize/);
});
test("complete saved audit returns all five checks", async () => {
  mockScenario();
  const { POST } = await import("../app/api/audit/run/route");
  const response = await POST(request());
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.score, 100);
  assert.equal(body.checks.length, 5);
});
test("fallback portal is the portal persisted, never stale request id", async () => {
  const writes = mockScenario("fallback");
  const { POST } = await import("../app/api/audit/run/route");
  const response = await POST(request());
  assert.equal(response.status, 200);
  assert.equal(writes.find((write) => write.table === "audits")?.body.portal_id, "resolved-owned-portal");
});

test("history database failures cannot turn into zero-issue summaries", async () => {
  global.fetch = async (input) => {
    const url = new URL(String(input));
    const table = url.pathname.split("/").at(-1)!;
    if (table === "users") return json({ id: userId });
    if (table === "portals") return json([{ id: portalId, hub_id: "123" }]);
    if (table === "audits") {
      assert.equal(url.searchParams.get("completed_at"), "not.is.null");
      return json([{ id: auditId, score: 100, completed_at: "2026-09-30T00:00:00Z" }]);
    }
    if (table === "audit_checks") return json({ message: "read failed" }, 400);
    throw new Error("Unexpected request");
  };
  const { GET } = await import("../app/api/audit/history/route");
  const response = await GET(new NextRequest(`https://audit.example/api/audit/history?portal_id=${portalId}`, { headers: { cookie: request().headers.get("cookie")! } }));
  assert.equal(response.status, 500);
  assert.equal((await response.json()).audits, undefined);
});

test("unfinished saved audit never exposes a score", async () => {
  global.fetch = async (input) => {
    const table = new URL(String(input)).pathname.split("/").at(-1)!;
    if (table === "users") return json({ id: userId });
    if (table === "portals") return json({ id: portalId });
    if (table === "audits") return json({ id: auditId, portal_id: portalId, score: 0, completed_at: null });
    throw new Error("Incomplete audit must not load checks");
  };
  const { GET } = await import("../app/api/audit/[auditId]/route");
  const response = await GET(new NextRequest(`https://audit.example/api/audit/${auditId}`, { headers: { cookie: request().headers.get("cookie")! } }), { params: { auditId } });
  assert.equal(response.status, 409);
  assert.equal((await response.json()).score, undefined);
});
