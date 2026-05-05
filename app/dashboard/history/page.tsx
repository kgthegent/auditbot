"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { getScoreColor, getScoreLabel } from "@/lib/audit/score";

interface AuditRecord {
  id: string;
  score: number;
  report_token: string | null;
  created_at: string;
  completed_at: string | null;
  issues: number;
  failed: number;
  affectedRecords: number;
  openItems: number;
  topIssue: string | null;
}

interface PortalRecord {
  id: string;
  hub_id: string;
  portal_name: string | null;
  platform?: string | null;
}

function HistoryPageInner() {
  const searchParams = useSearchParams();
  const portalId = searchParams.get("portal_id");
  const hubId = searchParams.get("hub_id");

  const [audits, setAudits] = useState<AuditRecord[]>([]);
  const [portal, setPortal] = useState<PortalRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const query = portalId
      ? `portal_id=${encodeURIComponent(portalId)}`
      : hubId
      ? `hub_id=${encodeURIComponent(hubId)}`
      : "";

    if (!query) {
      fetch("/api/auth/me")
        .then((r) => r.json())
        .then((data: { authenticated?: boolean; hub_id?: string | null }) => {
          if (data.authenticated && data.hub_id) {
            window.location.href = `/dashboard/history?hub_id=${encodeURIComponent(data.hub_id)}`;
            return;
          }
          setError("No portal selected.");
        })
        .catch(() => setError("No portal selected."))
        .finally(() => setLoading(false));
      return;
    }

    fetch(`/api/audit/history?${query}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setPortal(data.portal ?? null);
        setAudits(data.audits);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [portalId, hubId]);

  const resolvedHubId = portal?.hub_id ?? hubId;
  const dashboardHref = resolvedHubId ? `/dashboard?hub_id=${resolvedHubId}` : "/dashboard";

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <nav className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <a href="/" className="text-xl font-bold text-brand">
            StackAudit
          </a>
          <a
            href={dashboardHref}
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Back to Dashboard
          </a>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Audit History</h1>
            <p className="mt-2 text-sm text-zinc-500">
              {portal?.portal_name || "Connected portal"} score movement, report links, and cleanup context.
            </p>
          </div>
          <a
            href={dashboardHref}
            className="inline-flex justify-center rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
          >
            Run new audit
          </a>
        </div>

        {loading && (
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-20 text-red-400">
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && audits.length === 0 && (
          <div className="text-center py-20 text-zinc-600">
            <p className="text-lg">No audits yet</p>
            <p className="text-sm mt-2">
              Run your first audit from the{" "}
              <a href={dashboardHref} className="text-brand hover:underline">
                dashboard
              </a>
            </p>
          </div>
        )}

        {!loading && !error && audits.length > 0 && (
          <div className="space-y-3">
            {audits.map((audit, i) => {
              const prev = audits[i + 1];
              const trend = prev ? audit.score - prev.score : null;
              const reportHref = audit.report_token
                ? `/reports/${audit.id}?token=${audit.report_token}`
                : `/reports/${audit.id}`;
              return (
                <div
                  key={audit.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl p-5"
                >
                  <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm text-zinc-500">
                        {new Date(audit.created_at).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-zinc-200">
                        {audit.issues} active issues, {audit.affectedRecords.toLocaleString()} affected records
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {audit.topIssue ?? "No active risk detected"} · {audit.openItems} unresolved
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 md:justify-end">
                      <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-right">
                        {trend !== null && (
                          <span
                            className={`text-xs ${
                              trend > 0
                                ? "text-brand"
                                : trend < 0
                                ? "text-red-400"
                                : "text-zinc-500"
                            }`}
                          >
                            {trend > 0 ? "+" : ""}
                            {trend} from previous
                          </span>
                        )}
                        <div>
                          <span
                            className={`text-3xl font-bold ${getScoreColor(audit.score)}`}
                          >
                            {audit.score}
                          </span>
                          <span className="ml-2 text-xs text-zinc-500">
                            {getScoreLabel(audit.score)}
                          </span>
                        </div>
                      </div>
                      <a
                        href={`/dashboard?audit_id=${audit.id}&hub_id=${resolvedHubId ?? ""}`}
                        className="rounded-lg border border-zinc-800 px-3 py-2 text-sm font-semibold text-zinc-300 transition-colors hover:border-zinc-700 hover:text-white"
                      >
                        Open in dashboard
                      </a>
                      <a
                        href={reportHref}
                        className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
                      >
                        Report
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <div className="inline-block w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <HistoryPageInner />
    </Suspense>
  );
}
