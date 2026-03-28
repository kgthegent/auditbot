"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import AuditScore from "@/components/AuditScore";
import CheckCard from "@/components/CheckCard";
import { CheckResult } from "@/types";

interface AuditData {
  audit_id: string;
  score: number;
  checks: CheckResult[];
}

interface PortalData {
  id: string;
  hub_id: string;
  portal_name: string;
}

function DashboardPageInner() {
  const searchParams = useSearchParams();
  const hubId = searchParams.get("hub_id");

  const [portal, setPortal] = useState<PortalData | null>(null);
  const [portalLoading, setPortalLoading] = useState(true);
  const [portalError, setPortalError] = useState<string | null>(null);

  const [audit, setAudit] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [emailCaptured, setEmailCaptured] = useState(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    const hid = params.get("hub_id");
    return hid ? !!localStorage.getItem(`auditbot_email_${hid}`) : false;
  });
  const [userEmail, setUserEmail] = useState(() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams(window.location.search);
    const hid = params.get("hub_id");
    return hid ? localStorage.getItem(`auditbot_email_${hid}`) || "" : "";
  });
  const [emailInput, setEmailInput] = useState("");
  const [emailSubmitting, setEmailSubmitting] = useState(false);

  const runAudit = useCallback(async (portalId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/audit/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portal_id: portalId }),
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
  }, []);

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
      if (!res.ok) throw new Error("Failed to save email");
      setUserEmail(emailInput);
      setEmailCaptured(true);
      if (hubId) localStorage.setItem(`auditbot_email_${hubId}`, emailInput);
      runAudit(portal.id);
    } catch {
      setError("Failed to save email. Please try again.");
    } finally {
      setEmailSubmitting(false);
    }
  }, [emailInput, portal, runAudit]);

  useEffect(() => {
    if (!hubId) {
      setPortalLoading(false);
      setPortalError("No hub_id provided");
      return;
    }

    async function fetchPortal() {
      try {
        const res = await fetch(`/api/portals?hub_id=${encodeURIComponent(hubId!)}`);
        if (!res.ok) {
          setPortalError("No portal found for this HubSpot account");
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

  if (portalLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <nav className="border-b border-zinc-800 px-6 py-4">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <a href="/" className="text-xl font-bold text-brand">
              AuditBot
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
              AuditBot
            </a>
          </div>
        </nav>
        <main className="max-w-3xl mx-auto px-6 py-12">
          <div className="text-center py-20">
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-6 max-w-md mx-auto">
              <p className="text-lg font-semibold mb-2">{portalError}</p>
              <p className="text-sm text-zinc-500 mb-4">
                Connect your HubSpot account to get started.
              </p>
              <a
                href="/connect"
                className="inline-block bg-brand hover:bg-brand-hover text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                Connect HubSpot
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
              AuditBot
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
            <h2 className="text-xl font-bold mb-2">Enter your email to see your free HubSpot audit</h2>
            <p className="text-zinc-400 text-sm mb-6">We&apos;ll run a full health check on your portal — no credit card required.</p>
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
            AuditBot
          </a>
          <div className="flex items-center gap-4">
            <a
              href="/dashboard/history"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              History
            </a>
            {portal && (
              <span className="text-xs bg-zinc-800 text-zinc-400 px-3 py-1 rounded-full">
                {portal.portal_name || `Hub ${portal.hub_id}`}
              </span>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <button
            onClick={() => {
              if (portal) runAudit(portal.id);
            }}
            disabled={loading}
            className="bg-brand hover:bg-brand-hover disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            {loading ? "Running Audit..." : "Run Audit"}
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-4 mb-6 text-sm">
            {error}
          </div>
        )}

        {loading && (
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
            <p className="text-zinc-500 mt-4">
              Scanning your HubSpot portal...
            </p>
          </div>
        )}

        {audit && !loading && (
          <>
            <AuditScore score={audit.score} />

            {/* Upgrade Banner */}
            <div className="mt-6 bg-brand/10 border border-brand/30 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-brand font-semibold text-sm mb-1">You&apos;re on the free plan</p>
                  <p className="text-zinc-400 text-sm">Upgrade to get weekly monitoring, Slack alerts, and full audit history — automatically.</p>
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => handleCheckout("starter")}
                  className="bg-brand hover:bg-brand-hover text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  Starter — $49/mo
                </button>
                <button
                  onClick={() => handleCheckout("pro")}
                  className="bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  Pro — $99/mo
                </button>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <h2 className="text-lg font-semibold text-zinc-300">
                Check Results
              </h2>
              {audit.checks.map((check) => (
                <CheckCard key={check.checkName} check={check} />
              ))}
            </div>
          </>
        )}

        {!audit && !loading && !error && (
          <div className="text-center py-20 text-zinc-600">
            <p className="text-lg">No audit results yet</p>
            <p className="text-sm mt-2">
              Click &quot;Run Audit&quot; to scan your HubSpot portal
            </p>
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
