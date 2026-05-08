"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import AuditScore from "@/components/AuditScore";
import CheckCard from "@/components/CheckCard";
import { isPlaceholderEmail } from "@/lib/auth/email";
import { getPlatformConfig } from "@/lib/platforms";
import { CheckResult, WorkflowStatus } from "@/types";

interface AuditData {
  audit_id: string;
  report_token?: string | null;
  score: number;
  checks: CheckResult[];
}

interface PortalData {
  id: string;
  hub_id: string;
  portal_name: string;
  platform: "hubspot" | "salesforce" | "marketo" | "marketing_cloud";
  plan: "free" | "starter" | "pro";
}

function DashboardPageInner() {
  const searchParams = useSearchParams();
  const hubId = searchParams.get("hub_id");
  const auditId = searchParams.get("audit_id");

  const [portal, setPortal] = useState<PortalData | null>(null);
  const [portalLoading, setPortalLoading] = useState(true);
  const [portalError, setPortalError] = useState<string | null>(null);

  const [audit, setAudit] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workflowSaving, setWorkflowSaving] = useState<string | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);

  const [emailCaptured, setEmailCaptured] = useState(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    const hid = params.get("hub_id");
    return hid ? !!localStorage.getItem(`stackaudit_email_${hid}`) : false;
  });
  const [userEmail, setUserEmail] = useState(() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams(window.location.search);
    const hid = params.get("hub_id");
    return hid ? localStorage.getItem(`stackaudit_email_${hid}`) || "" : "";
  });
  const [emailInput, setEmailInput] = useState("");
  const [emailSubmitting, setEmailSubmitting] = useState(false);

  // Check magic link cookie on mount — skip email form if already authenticated
  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.json())
      .then((data: { authenticated: boolean; email?: string }) => {
        if (data.authenticated && data.email && !isPlaceholderEmail(data.email) && !emailCaptured) {
          setUserEmail(data.email);
          setEmailCaptured(true);
          if (hubId) localStorage.setItem(`stackaudit_email_${hubId}`, data.email);
        }
      })
      .catch(() => {});
  }, [hubId, emailCaptured]);

  const runAudit = useCallback(async (portalId: string, portalHubId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/audit/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portal_id: portalId, hub_id: portalHubId ?? hubId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Audit failed");
      }
      const data = await res.json();
      setAudit(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Audit failed");
    } finally {
      setLoading(false);
    }
  }, [hubId]);

  const handleEmailSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !portal) return;
    setEmailSubmitting(true);
    try {
      const res = await fetch("/api/users/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput, portal_id: portal.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save email");
      setUserEmail(emailInput);
      setEmailCaptured(true);
      if (hubId) localStorage.setItem(`stackaudit_email_${hubId}`, emailInput);
      const nextPortal = data.portal?.id ? { ...portal, id: data.portal.id } : portal;
      setPortal(nextPortal);
      runAudit(nextPortal.id, nextPortal.hub_id);
    } catch (err) {
      setError(err instanceof Error ? `${err.message}. Please try again.` : "Failed to save email. Please try again.");
    } finally {
      setEmailSubmitting(false);
    }
  }, [emailInput, hubId, portal, runAudit]);

  const updateCheckWorkflow = useCallback(
    async (
      check: CheckResult,
      updates: {
        workflowStatus: WorkflowStatus;
        assignedTo?: string | null;
        dueAt?: string | null;
        notes?: string;
      }
    ) => {
      if (!check.id) return;

      const previousAudit = audit;
      const nextCheck: CheckResult = {
        ...check,
        workflowStatus: updates.workflowStatus,
        assignedTo:
          updates.assignedTo !== undefined ? updates.assignedTo : check.assignedTo,
        dueAt: updates.dueAt !== undefined ? updates.dueAt : check.dueAt,
        notes: updates.notes !== undefined ? updates.notes : check.notes,
        resolvedAt:
          updates.workflowStatus === "fixed" || updates.workflowStatus === "ignored"
            ? new Date().toISOString()
            : null,
      };

      setWorkflowSaving(check.id);
      setError(null);
      setAudit((current) =>
        current
          ? {
              ...current,
              checks: current.checks.map((item) =>
                item.id === check.id ? nextCheck : item
              ),
            }
          : current
      );

      try {
        const res = await fetch(`/api/audit/checks/${check.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workflowStatus: nextCheck.workflowStatus,
            assignedTo: nextCheck.assignedTo,
            dueAt: nextCheck.dueAt,
            notes: nextCheck.notes,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update finding");

        setAudit((current) =>
          current
            ? {
                ...current,
                checks: current.checks.map((item) =>
                  item.id === check.id ? data.check : item
                ),
              }
            : current
        );
        return true;
      } catch (err) {
        setAudit(previousAudit);
        setError(err instanceof Error ? err.message : "Failed to update finding");
        return false;
      } finally {
        setWorkflowSaving(null);
      }
    },
    [audit]
  );

  useEffect(() => {
    if (!hubId) {
      fetch("/api/auth/me")
        .then((r) => r.json())
        .then((data: { authenticated?: boolean; hub_id?: string | null }) => {
          if (data.authenticated && data.hub_id) {
            window.location.href = `/dashboard?hub_id=${encodeURIComponent(data.hub_id)}`;
            return;
          }
          setPortalLoading(false);
          setPortalError("No connected platform selected");
        })
        .catch(() => {
          setPortalLoading(false);
          setPortalError("No connected platform selected");
        });
      return;
    }

    async function fetchPortal() {
      try {
        const res = await fetch(`/api/portals?hub_id=${encodeURIComponent(hubId!)}`);
        if (!res.ok) {
          setPortalError("No connected platform found for this account");
          setPortalLoading(false);
          return;
        }
        const data: PortalData = await res.json();
        setPortal(data);
        setPortalLoading(false);
      } catch {
        setPortalError("Failed to load portal");
        setPortalLoading(false);
      }
    }

    fetchPortal();
  }, [hubId]);

  useEffect(() => {
    if (!auditId || !portal) return;

    setAuditLoading(true);
    setError(null);
    fetch(`/api/audit/${auditId}`)
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.error || "Could not load audit");
        setAudit(data);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load audit"))
      .finally(() => setAuditLoading(false));
  }, [auditId, portal]);

  if (portalLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <nav className="border-b border-zinc-800 px-6 py-4">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <a href="/" className="text-xl font-bold text-brand">
              StackAudit
            </a>
          </div>
        </nav>
        <main className="max-w-3xl mx-auto px-6 py-12">
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
            <p className="text-zinc-500 mt-4">Loading portal...</p>
          </div>
        </main>
      </div>
    );
  }

  if (portalError) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <nav className="border-b border-zinc-800 px-6 py-4">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <a href="/" className="text-xl font-bold text-brand">
              StackAudit
            </a>
          </div>
        </nav>
        <main className="max-w-3xl mx-auto px-6 py-12">
          <div className="text-center py-20">
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-6 max-w-md mx-auto">
              <p className="text-lg font-semibold mb-2">{portalError}</p>
              <p className="text-sm text-zinc-500 mb-4">
                Connect a supported platform to get started.
              </p>
              <a
                href="/connect"
                className="inline-block text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                style={{ backgroundColor: '#FF7A59' }}
              >
                Connect Platform
              </a>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!emailCaptured) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <nav className="border-b border-zinc-800 px-6 py-4">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <a href="/" className="text-xl font-bold text-brand">
              StackAudit
            </a>
          </div>
        </nav>
        <main className="max-w-md mx-auto px-6 py-24">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
            <div className="w-12 h-12 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg className="w-6 h-6 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2">Enter your email to see your free audit</h2>
            <p className="text-zinc-400 text-sm mb-6">We&apos;ll run a full health check on your connected platform — no credit card required.</p>
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 mb-4 text-sm">
                {error}
              </div>
            )}
            <form onSubmit={handleEmailSubmit}>
              <input
                type="email"
                required
                placeholder="you@company.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors mb-4"
              />
              <button
                type="submit"
                disabled={emailSubmitting}
                className="w-full bg-brand hover:bg-brand-hover disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                {emailSubmitting ? "Loading..." : "Get My Free Audit"}
              </button>
            </form>
            <p className="text-zinc-600 text-xs mt-4">No spam. We&apos;ll only email you about your audit results.</p>
          </div>
        </main>
      </div>
    );
  }

  const platformConfig = getPlatformConfig(portal?.platform);
  const portalDisplayName =
    portal?.portal_name ||
    (portal ? `${platformConfig.name} ${platformConfig.productNoun} ${portal.hub_id}` : "");
  const historyHref = portal
    ? `/dashboard/history?portal_id=${encodeURIComponent(portal.id)}&hub_id=${encodeURIComponent(portal.hub_id)}`
    : hubId
    ? `/dashboard/history?hub_id=${encodeURIComponent(hubId)}`
    : "/dashboard/history";
  const reportHref = audit
    ? audit.report_token
      ? `/reports/${audit.audit_id}?token=${audit.report_token}`
      : `/reports/${audit.audit_id}`
    : null;
  const workflowCounts = audit?.checks.reduce(
    (counts, check) => {
      if (check.status === "pass") return counts;
      const status = check.workflowStatus ?? "open";
      counts[status] += 1;
      return counts;
    },
    { open: 0, in_progress: 0, fixed: 0, ignored: 0 }
  );

  const handleManageSubscription = async () => {
    if (!userEmail) return;
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert("Error: " + (data.error || "Could not open billing portal"));
    } catch (e) {
      alert("Failed to open billing portal: " + e);
    }
  };

  const handleCheckout = async (plan: "starter" | "pro") => {
    if (!portal) return;
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, plan, portal_id: portal.id, hub_id: portal.hub_id }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert("Error: " + (data.error || "No checkout URL returned"));
    } catch (e) {
      alert("Checkout failed: " + e);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <nav className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <a href="/" className="text-xl font-bold text-brand">
            StackAudit
          </a>
          <div className="flex items-center gap-4">
            <a
              href={historyHref}
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              History
            </a>
            {portal && (
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: platformConfig.brandColor,
                    color: "#fff",
                  }}
                >
                  {platformConfig.name}
                </span>
                <span className="text-xs bg-zinc-800 text-zinc-400 px-3 py-1 rounded-full">
                  {portalDisplayName}
                </span>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <button
            onClick={() => {
              if (portal) runAudit(portal.id, portal.hub_id);
            }}
            disabled={loading}
            className="bg-brand hover:bg-brand-hover disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            {loading ? "Running Audit..." : "Run Audit"}
          </button>
        </div>

        {auditLoading && (
          <div className="mb-6 rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-400">
            Loading selected audit...
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-4 mb-6 text-sm">
            {error}
          </div>
        )}

        {loading && (
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
            <p className="text-zinc-500 mt-4">
              Scanning your {platformConfig.name} {platformConfig.productNoun}...
            </p>
          </div>
        )}

        {audit && !loading && (
          <>
            <AuditScore score={audit.score} />

            {reportHref && (
              <div className="mt-6 rounded-xl border border-brand/30 bg-brand/10 p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-brand">
                      Executive report ready
                    </p>
                    <p className="mt-1 text-sm text-zinc-400">
                      Share a leadership-ready summary with risk, cleanup progress, and top recommended actions.
                    </p>
                  </div>
                  <a
                    href={reportHref}
                    className="inline-flex justify-center rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
                  >
                    Open Report
                  </a>
                </div>
              </div>
            )}

            {workflowCounts && (
              <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                  ["Open", workflowCounts.open, "text-zinc-200"],
                  ["In Progress", workflowCounts.in_progress, "text-cyan-300"],
                  ["Fixed", workflowCounts.fixed, "text-emerald-300"],
                  ["Ignored", workflowCounts.ignored, "text-zinc-500"],
                ].map(([label, count, color]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"
                  >
                    <p className="text-xs uppercase tracking-wider text-zinc-600">
                      {label}
                    </p>
                    <p className={`mt-2 text-2xl font-bold ${color}`}>
                      {count}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <a
                href={reportHref ?? "#"}
                className={`rounded-xl border p-4 transition-colors ${
                  reportHref
                    ? "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
                    : "pointer-events-none border-zinc-900 bg-zinc-950 text-zinc-700"
                }`}
              >
                <p className="text-sm font-semibold text-white">Share report</p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">Open the executive summary for buyers and stakeholders.</p>
              </a>
              <a
                href={historyHref}
                className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:border-zinc-700"
              >
                <p className="text-sm font-semibold text-white">View history</p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">Compare score movement and previous audit runs.</p>
              </a>
              <button
                type="button"
                onClick={() => {
                  if (portal) runAudit(portal.id, portal.hub_id);
                }}
                disabled={loading}
                className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-left transition-colors hover:border-zinc-700 disabled:opacity-60"
              >
                <p className="text-sm font-semibold text-white">Re-run audit</p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">Confirm whether marked fixes changed the source data.</p>
              </button>
            </div>

            {/* Plan Banner */}
            {portal?.plan === "free" && (
              <div className="relative mt-6 overflow-hidden rounded-2xl border border-brand/45 bg-gradient-to-br from-brand/20 via-brand/10 to-zinc-900 p-6 shadow-2xl shadow-cyan-950/30">
                <div className="pointer-events-none absolute right-0 top-0 h-28 w-28 rounded-full bg-brand/20 blur-3xl" />
                <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                  <div className="max-w-2xl">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">Keep this score moving</p>
                    <h2 className="mt-2 text-2xl font-bold text-white">Turn this audit into weekly monitoring.</h2>
                    <p className="mt-2 text-sm leading-6 text-zinc-300">
                      Upgrade for automated re-scans, email digests, and full audit history so new issues do not quietly pile up.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-300">
                      {["Weekly checks", "Email digest", "90-day history"].map((feature) => (
                        <span key={feature} className="rounded-full border border-white/10 bg-black/20 px-3 py-1">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row md:flex-col">
                    <button
                      onClick={() => handleCheckout("starter")}
                      className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white shadow-lg shadow-cyan-950/40 transition-colors hover:bg-brand-hover"
                    >
                      Start Starter, $49/mo
                    </button>
                    <button
                      onClick={() => handleCheckout("pro")}
                      className="rounded-lg border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/[0.1]"
                    >
                      Go Pro, $99/mo
                    </button>
                  </div>
                </div>
              </div>
            )}
            {portal?.plan === "starter" && (
              <div className="mt-6 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-emerald-400 font-semibold text-sm">✓ Starter Plan</p>
                  <p className="text-zinc-500 text-xs mt-0.5">Weekly audits + email digests active</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCheckout("pro")}
                    className="bg-zinc-700 hover:bg-zinc-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Upgrade to Pro
                  </button>
                  <button
                    onClick={handleManageSubscription}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Manage
                  </button>
                </div>
              </div>
            )}
            {portal?.plan === "pro" && (
              <div className="mt-6 bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-purple-400 font-semibold text-sm">✓ Pro Plan</p>
                  <p className="text-zinc-500 text-xs mt-0.5">Weekly audits + email digests + priority support active</p>
                </div>
                <button
                  onClick={handleManageSubscription}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                >
                  Manage Subscription
                </button>
              </div>
            )}

            <div className="mt-8 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-lg font-semibold text-zinc-300">
                  Check Results
                </h2>
                {workflowSaving && (
                  <span className="text-xs text-zinc-500">Saving workflow...</span>
                )}
              </div>
              {audit.checks.map((check) => (
                <CheckCard
                  key={check.id ?? check.checkName}
                  check={check}
                  onWorkflowChange={updateCheckWorkflow}
                />
              ))}
            </div>
          </>
        )}

        {!audit && !loading && !error && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand">
              First audit
            </p>
            <h2 className="mt-3 text-2xl font-bold">Turn this connection into a fix plan.</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              We will scan your {platformConfig.name} {platformConfig.productNoun}, rank the riskiest records, and generate a report you can share with an operator or leadership team.
            </p>
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {[
                ["1", "Run scan", "Read-only checks across owners, lifecycle, source, and duplicate signals."],
                ["2", "Assign fixes", "Give every issue an owner, date, and operating note."],
                ["3", "Share proof", "Send a leadership-ready report and track changes over time."],
              ].map(([step, title, body]) => (
                <div key={step} className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                  <p className="text-xs font-bold text-brand">Step {step}</p>
                  <p className="mt-2 text-sm font-semibold text-white">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">{body}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                if (portal) runAudit(portal.id, portal.hub_id);
              }}
              disabled={loading}
              className="mt-6 rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-50"
            >
              Run my first audit
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardPageInner />
    </Suspense>
  );
}
