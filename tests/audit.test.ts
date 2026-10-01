import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { checkDuplicateContacts, checkUnassignedNewLeads, runAllChecks } from "../lib/audit/engine";
import { IncompleteAuditError, runChecks } from "../lib/audit/completeness";
import { calculateScore } from "../lib/audit/score";
import type { CheckResult } from "../types";

const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });
const result: CheckResult = { checkName: "Fixture", severity: "high", count: 0, percentage: 0, status: "pass", description: "fixture", fixSteps: [] };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

test("no health score for an empty audit", () => assert.throws(() => calculateScore([]), /empty audit/));
test("scoring retains configured severity penalties", () => {
  assert.equal(calculateScore([result]), 100);
  assert.equal(calculateScore([{ ...result, status: "fail" }, { ...result, severity: "medium", status: "warn" }]), 75);
});
test("failed and synchronously throwing checks are named, not dropped or leaked", async () => {
  await assert.rejects(runChecks([
    { name: "Good", run: async () => result },
    { name: "Rate limited", run: async () => { throw new Error("secret provider payload"); } },
    { name: "Invalid", run: () => { throw new Error("secret"); } },
  ]), (error: unknown) => {
    assert.ok(error instanceof IncompleteAuditError);
    assert.deepEqual(error.failedChecks, ["Rate limited", "Invalid"]);
    assert.doesNotMatch(error.message, /secret/);
    return true;
  });
});
test("duplicates on later pages are found and percentages use affected scanned records", async () => {
  const pages = [
    { results: [{ id: "1", properties: { email: " Person@EXAMPLE.com " } }, { id: "2", properties: { email: "" } }], paging: { next: { after: "page2" } } },
    { results: [{ id: "3", properties: { email: "person@example.com" } }, { id: "4", properties: {} }] },
  ];
  const urls: string[] = [];
  global.fetch = async (url) => { urls.push(String(url)); return json(pages.shift()); };
  const check = await checkDuplicateContacts("fixture-token", 999, "hub");
  assert.equal(check.count, 2);
  assert.equal(check.percentage, 50);
  assert.equal(check.status, "fail");
  assert.match(urls[1], /after=page2/);
  assert.match(check.description, /4 scanned contacts/);
});
test("a failed duplicate page never becomes a partial clean result", async () => {
  let page = 0;
  global.fetch = async () => ++page === 1 ? json({ results: [{ id: "1", properties: {} }], paging: { next: { after: "2" } } }) : json({}, 429);
  await assert.rejects(checkDuplicateContacts("fixture", 200, ""), /429/);
});
test("repeated pagination cursors fail closed", async () => {
  let id = 0;
  global.fetch = async () => json({ results: [{ id: String(++id), properties: {} }], paging: { next: { after: "same" } } });
  await assert.rejects(checkDuplicateContacts("fixture", 200, ""), /Repeated/);
});
test("empty portals complete with zero affected contacts", async () => {
  global.fetch = async () => json({ results: [] });
  const check = await checkDuplicateContacts("fixture", 0, "");
  assert.equal(check.percentage, 0); assert.equal(check.count, 0);
});
test("failed or malformed prerequisite totals cannot produce 100", async () => {
  for (const response of [json({}, 403), json({}), json({ total: -1 })]) {
    global.fetch = async () => response;
    await assert.rejects(runAllChecks("fixture"), (error: unknown) => error instanceof IncompleteAuditError && error.failedChecks[0] === "Contact total");
  }
});
test("new lead denominator failure is an unavailable check", async () => {
  let calls = 0;
  global.fetch = async () => ++calls === 1 ? json({ total: 2, results: [] }) : json({}, 500);
  await assert.rejects(checkUnassignedNewLeads("fixture", 10, ""), /total failed/);
});
test("single failed HubSpot check reports incomplete audit", async () => {
  global.fetch = async (input, init) => {
    const url = String(input);
    if (url.includes("access-tokens")) return json({ hub_id: "fixture" });
    if (!url.includes("/search")) return json({}, 429);
    const body = JSON.parse(String(init?.body));
    return json({ total: body.filterGroups?.length ? 0 : 10, results: [] });
  };
  await assert.rejects(runAllChecks("fixture"), (error: unknown) => error instanceof IncompleteAuditError && error.failedChecks.includes("Duplicate Contacts"));
});

test("empty pages with a continuation cursor cannot run indefinitely", async () => {
  global.fetch = async () => json({ results: [], paging: { next: { after: "more" } } });
  await assert.rejects(checkDuplicateContacts("fixture", 0, ""), /Empty HubSpot page/);
});
