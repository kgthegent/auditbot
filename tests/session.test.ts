import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  createEmailClaimToken, createSessionToken, EMAIL_LINK_MAX_AGE, readSession,
  SESSION_COOKIE_NAME, SESSION_MAX_AGE, setSessionCookies, verifyEmailClaimToken, verifySessionToken,
} from "../lib/auth/session";
import { hasValidOAuthState } from "../lib/auth/oauth-state";
import { normalizeProviderBaseUrl, providerFetch } from "../lib/security/provider-url";

const secret = "synthetic-session-test-key-not-for-deployment-12345";
const userId = "11111111-1111-4111-8111-111111111111";
const targetId = "22222222-2222-4222-8222-222222222222";
const portalId = "33333333-3333-4333-8333-333333333333";
const identity = { userId, email: "owner@example.com", hubId: "123" };
const originalFetch = global.fetch;
process.env.SESSION_SECRET = secret;
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://session-fixture.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "fixture-anon";
process.env.SUPABASE_SERVICE_ROLE_KEY = "fixture-service";
process.env.STRIPE_SECRET_KEY = "sk_test_synthetic_fixture_not_real";
afterEach(() => { global.fetch = originalFetch; process.env.SESSION_SECRET = secret; });
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
const signed = (payload: object) => {
  const value = `session-v1.${Buffer.from(JSON.stringify(payload)).toString("base64url")}`;
  return `${value}.${createHmac("sha256", secret).update(value).digest("base64url")}`;
};
const post = (path: string, body: object, cookie?: string) => new NextRequest(`https://audit.example${path}`, {
  method: "POST", headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body),
});

test("signed sessions bind immutable identity and expire at exactly the deadline", () => {
  const token = createSessionToken(identity, 1000);
  assert.deepEqual(verifySessionToken(token, 1001), { ...identity, iat: 1000, exp: 1000 + SESSION_MAX_AGE });
  assert.equal(verifySessionToken(token, 1000 + SESSION_MAX_AGE), null);
  assert.equal(verifySessionToken(token, 999), null);
});

test("tampered identity, signature, wrong purpose and malformed tokens fail closed", () => {
  const token = createSessionToken(identity, 1000);
  const parts = token.split(".");
  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
  for (const changed of [{ ...payload, email: "victim@example.com" }, { ...payload, userId: targetId }, { ...payload, hubId: "victim" }]) {
    assert.equal(verifySessionToken(`${parts[0]}.${Buffer.from(JSON.stringify(changed)).toString("base64url")}.${parts[2]}`, 1001), null);
  }
  for (const malformed of [undefined, "owner@example.com", "", "a.b.c", `${token}.extra`, token.slice(0, -1), `${token.slice(0, -43)}${"A".repeat(43)}`, "x".repeat(4097)]) {
    assert.equal(verifySessionToken(malformed, 1001), null);
  }
  const claim = createEmailClaimToken({ email: identity.email, sourceUserId: userId, portalId, hubId: "123" }, 1000);
  assert.equal(verifySessionToken(claim, 1001), null);
  assert.equal(verifyEmailClaimToken(token, 1001), null);
});

test("valid signatures cannot bypass claim shape, future issue time or lifetime bounds", () => {
  const base = { ...identity, iat: 1000, exp: 1100 };
  for (const value of [{ ...base, userId: "" }, { ...base, email: 7 }, { ...base, hubId: {} }, { ...base, exp: "1100" }, { ...base, iat: 1002 }, { ...base, exp: 1000 + SESSION_MAX_AGE + 1 }, { ...base, exp: 999 }]) {
    assert.equal(verifySessionToken(signed(value), 1001), null);
  }
});

test("missing, weak and rotated secrets reject authentication without legacy fallback", () => {
  const token = createSessionToken(identity);
  for (const value of [undefined, "short", "another-secure-but-different-session-key-12345"]) {
    if (value === undefined) delete process.env.SESSION_SECRET; else process.env.SESSION_SECRET = value;
    assert.equal(verifySessionToken(token), null);
    if (value === undefined || value === "short") assert.throws(() => createSessionToken(identity), /SESSION_SECRET/);
  }
  process.env.SESSION_SECRET = secret;
  const request = new NextRequest("https://audit.example", { headers: { cookie: "sa_email=victim@example.com; sa_hub_id=victim" } });
  assert.equal(readSession(request), null);
});

test("session cookie is HttpOnly, SameSite Lax, path-bound and clears unsigned cookies", () => {
  const response = NextResponse.json({ ok: true });
  setSessionCookies(response, identity);
  const cookie = response.cookies.get(SESSION_COOKIE_NAME)!;
  assert.equal(cookie.httpOnly, true);
  assert.equal(cookie.sameSite, "lax");
  assert.equal(cookie.path, "/");
  assert.equal(cookie.maxAge, SESSION_MAX_AGE);
  assert.equal(response.cookies.get("sa_email")?.maxAge, 0);
  assert.equal(response.cookies.get("sa_hub_id")?.maxAge, 0);
  assert.equal(verifySessionToken(cookie.value)?.userId, userId);
});

test("email claims are signed, expiring, nonce-unique and bind exact source portal", () => {
  const claim = { email: "victim@example.com", sourceUserId: userId, portalId, hubId: "123" };
  const token = createEmailClaimToken(claim, 1000);
  assert.notEqual(createEmailClaimToken(claim, 1000), token);
  assert.equal(verifyEmailClaimToken(token, 1001)?.portalId, portalId);
  assert.equal(verifyEmailClaimToken(token, 1000 + EMAIL_LINK_MAX_AGE), null);
  const parts = token.split(".");
  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
  payload.portalId = targetId;
  assert.equal(verifyEmailClaimToken(`${parts[0]}.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.${parts[2]}`, 1001), null);
});

test("unverified capture cannot upsert victim account, transfer a portal or issue a session", async () => {
  let storedToken = "";
  const calls: string[] = [];
  global.fetch = async (input, init) => {
    const url = new URL(String(input));
    const table = url.pathname.split("/").at(-1)!;
    const method = init?.method ?? "GET";
    calls.push(`${method} ${table}`);
    if (url.hostname === "api.agentmail.to") return json({ id: "message" });
    assert.equal(url.hostname, "session-fixture.supabase.co");
    if (table === "users") {
      assert.equal(method, "GET");
      assert.equal(url.searchParams.get("id"), `eq.${userId}`);
      assert.equal(url.searchParams.has("email"), false);
      return json({ id: userId, email: "hubspot-123@placeholder.local" });
    }
    if (table === "portals") {
      assert.equal(method, "GET");
      assert.equal(url.searchParams.get("user_id"), `eq.${userId}`);
      return json({ id: portalId, hub_id: "123" });
    }
    assert.equal(table, "magic_links"); assert.equal(method, "POST");
    const body = JSON.parse(String(init?.body));
    assert.equal(body.email, "victim@example.com");
    storedToken = body.token;
    return json(null);
  };
  const { POST } = await import("../app/api/users/capture/route");
  const response = await POST(post("/api/users/capture", { email: "victim@example.com", portal_id: portalId }, `sa_session=${createSessionToken({ ...identity, email: "hubspot-123@placeholder.local" })}`));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).verification_required, true);
  assert.equal(response.headers.has("set-cookie"), false);
  assert.equal(verifyEmailClaimToken(storedToken)?.sourceUserId, userId);
  assert.equal(calls.some(call => call === "POST users" || call === "PATCH portals"), false);
});

test("legacy cookie cannot capture email or access Stripe billing", async () => {
  global.fetch = async () => { throw new Error("No database or external call expected"); };
  const { POST: capture } = await import("../app/api/users/capture/route");
  assert.equal((await capture(post("/api/users/capture", { email: "victim@example.com", portal_id: portalId }, "sa_email=victim@example.com"))).status, 401);
  const { POST: checkout } = await import("../app/api/stripe/checkout/route");
  assert.equal((await checkout(post("/api/stripe/checkout", { email: "victim@example.com", plan: "pro", portal_id: portalId }))).status, 401);
  const { POST: portal } = await import("../app/api/stripe/portal/route");
  assert.equal((await portal(post("/api/stripe/portal", { email: "victim@example.com" }))).status, 401);
});

test("magic link consumption is one atomic expiry-guarded update; replay loses", async () => {
  let used = false;
  global.fetch = async (input, init) => {
    const url = new URL(String(input));
    assert.equal(init?.method, "PATCH");
    assert.equal(url.searchParams.get("used"), "eq.false");
    assert.ok(url.searchParams.get("expires_at")?.startsWith("gt."));
    assert.equal(url.searchParams.get("token"), "eq.one-time-token");
    const available = !used;
    used = true;
    return json(available ? { email: identity.email, hub_id: identity.hubId } : null);
  };
  const { consumeMagicLink } = await import("../lib/auth/magic-links");
  const results = await Promise.all([consumeMagicLink("one-time-token"), consumeMagicLink("one-time-token")]);
  assert.equal(results.filter(Boolean).length, 1);
});

test("credential connection cannot use a submitted email to choose an account", async () => {
  let placeholder = "";
  global.fetch = async (input, init) => {
    const url = new URL(String(input));
    const table = url.pathname.split("/").at(-1)!;
    assert.equal(table, "users");
    assert.equal(init?.method, "POST");
    placeholder = JSON.parse(String(init?.body)).email;
    return json({ id: userId, email: placeholder });
  };
  const { getConnectionUser } = await import("../lib/auth/connection-user");
  const user = await getConnectionUser(new NextRequest("https://audit.example", { headers: { cookie: "sa_email=victim@example.com" } }), "marketo-test@placeholder.local");
  assert.equal(user.email, "marketo-test@placeholder.local");
  assert.notEqual(user.email, "victim@example.com");
});

test("OAuth callbacks require exact browser-bound state", () => {
  const state = "a".repeat(64);
  const request = (query: string, cookie = state) => new NextRequest(`https://audit.example/callback?${query}`, { headers: { cookie: `test_state=${cookie}` } });
  assert.equal(hasValidOAuthState(request(`state=${state}`), "test_state"), true);
  assert.equal(hasValidOAuthState(request(""), "test_state"), false);
  assert.equal(hasValidOAuthState(request(`state=${"b".repeat(64)}`), "test_state"), false);
  assert.equal(hasValidOAuthState(request(`state=${state}`, ""), "test_state"), false);
});

test("provider base URLs reject userinfo, nondefault ports and suffix lookalikes", async () => {
  for (const value of ["https://user:pass@test.salesforce.com", "https://test.salesforce.com:8443", "https://salesforce.com.attacker.example", "https://evilsalesforce.com", "http://test.salesforce.com", "https://test.salesforce.com/path"]) {
    assert.throws(() => normalizeProviderBaseUrl(value, [".salesforce.com"]));
  }
  assert.equal(normalizeProviderBaseUrl("https://test.salesforce.com:443/", [".salesforce.com"]), "https://test.salesforce.com");
  global.fetch = async (_input, init) => { assert.equal(init?.redirect, "error"); return json({}); };
  await providerFetch("https://test.salesforce.com", { redirect: "follow" });
});


test("Marketo cannot pair attacker identity URL with a victim REST tenant", async () => {
  global.fetch = async () => { throw new Error("Mismatched tenants must fail before a provider or DB request"); };
  const { POST } = await import("../app/api/connect/marketo/route");
  const response = await POST(post("/api/connect/marketo", {
    email: "victim@example.com", identityUrl: "https://attacker.mktorest.com", restUrl: "https://victim.mktorest.com",
    clientId: "fixture", clientSecret: "fixture",
  }));
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /same Marketo instance/);
  assert.equal(response.headers.has("set-cookie"), false);
});

test("Marketo token without tenant read access cannot create any session", async () => {
  global.fetch = async (input) => {
    const url = new URL(String(input));
    assert.equal(url.hostname, "tenant.mktorest.com");
    if (url.pathname.includes("oauth/token")) return json({ access_token: "synthetic", expires_in: 3600 });
    assert.equal(url.pathname, "/rest/v1/leads/describe.json");
    return json({ success: false, errors: [{ code: "603" }] });
  };
  const { POST } = await import("../app/api/connect/marketo/route");
  const response = await POST(post("/api/connect/marketo", {
    email: "victim@example.com", identityUrl: "https://tenant.mktorest.com", restUrl: "https://tenant.mktorest.com",
    clientId: "fixture", clientSecret: "fixture",
  }));
  assert.equal(response.status, 400);
  assert.equal(response.headers.has("set-cookie"), false);
});

test("redeemed email claim adopts verified target only after source ownership check, once", async () => {
  const claim = createEmailClaimToken({ email: "victim@example.com", sourceUserId: userId, portalId, hubId: "123" });
  let consumed = false;
  let transferred = false;
  global.fetch = async (input, init) => {
    const url = new URL(String(input));
    assert.equal(url.hostname, "session-fixture.supabase.co");
    const table = url.pathname.split("/").at(-1)!;
    const method = init?.method ?? "GET";
    if (table === "magic_links") {
      assert.equal(method, "PATCH");
      assert.equal(url.searchParams.get("token"), `eq.${claim}`);
      if (consumed) return json(null);
      consumed = true;
      return json({ email: "victim@example.com", hub_id: "123" });
    }
    if (table === "users" && method === "GET") {
      assert.equal(url.searchParams.get("id"), `eq.${userId}`);
      return json({ email: "hubspot-123@placeholder.local" });
    }
    if (table === "users" && method === "POST") {
      assert.equal(JSON.parse(String(init?.body)).email, "victim@example.com");
      return json({ id: targetId, email: "victim@example.com" });
    }
    if (table === "portals" && method === "GET") {
      if (url.searchParams.get("user_id") === `eq.${targetId}`) return json([]);
      assert.equal(url.searchParams.get("user_id"), `eq.${userId}`);
      assert.equal(url.searchParams.get("id"), `eq.${portalId}`);
      return json({ id: portalId, hub_id: "123" });
    }
    assert.equal(table, "portals"); assert.equal(method, "PATCH");
    assert.equal(url.searchParams.get("user_id"), `eq.${userId}`);
    assert.equal(url.searchParams.get("id"), `eq.${portalId}`);
    assert.deepEqual(JSON.parse(String(init?.body)), { user_id: targetId });
    transferred = true;
    return json({ id: portalId });
  };
  const { GET } = await import("../app/api/auth/verify/route");
  const request = new NextRequest(`https://audit.example/api/auth/verify?token=${encodeURIComponent(claim)}`);
  const response = await GET(request);
  assert.equal(transferred, true);
  assert.equal(verifySessionToken(response.cookies.get(SESSION_COOKIE_NAME)?.value)?.userId, targetId);
  const replay = await GET(request);
  assert.equal(replay.headers.has("set-cookie"), false);
  assert.match(replay.headers.get("location")!, /login\?error=invalid/);
});

test("billing lookup ignores body email and scopes checkout to the signed owner", async () => {
  global.fetch = async (input) => {
    const url = new URL(String(input));
    assert.equal(url.hostname, "session-fixture.supabase.co");
    const table = url.pathname.split("/").at(-1)!;
    if (table === "users") {
      assert.equal(url.searchParams.get("id"), `eq.${userId}`);
      assert.equal(url.searchParams.has("email"), false);
      return json({ email: identity.email, stripe_customer_id: null });
    }
    assert.equal(table, "portals");
    assert.equal(url.searchParams.get("user_id"), `eq.${userId}`);
    return json(null);
  };
  const cookie = `sa_session=${createSessionToken(identity)}`;
  const { POST: billing } = await import("../app/api/stripe/portal/route");
  assert.equal((await billing(post("/api/stripe/portal", { email: "victim@example.com" }, cookie))).status, 404);
  const { POST: checkout } = await import("../app/api/stripe/checkout/route");
  assert.equal((await checkout(post("/api/stripe/checkout", { email: "victim@example.com", portal_id: portalId, hub_id: "victim", plan: "pro" }, cookie))).status, 404);
});
