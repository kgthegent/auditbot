"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { getScoreColor, getScoreLabel } from "@/lib/audit/score";
import { getPlatformConfig } from "@/lib/platforms";
import { CheckResult, Platform } from "@/types";

interface ReportData {
  audit: {
    id: string;
    score: number;
    reportToken: string | null;
    createdAt: string;
    completedAt: string | null;
  };
  portal: {
    hubId: string;
    name: string;
    platform: Platform;
  };
  checks: CheckResult[];
  viewer: { canEdit: boolean };
}

const severityRank = { high: 0, medium: 1, low: 2 };
const severityStyles = {
  high: "border-red-500/30 bg-red-500/10 text-red-300",
  medium: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
  low: "border-blue-500/30 bg-blue-500/10 text-blue-300",
};

function formatDate(value: string | null) {
  if (!value) return "Not completed";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ReportPageInner() {
  const params = useParams<{ auditId: string }>();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const query = token ? `?token=${encodeURIComponent(token)}` : "";
    fetch(`/api/reports/${params.auditId}${query}`)
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.error || "Could not load report");
        setReport(data);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load report"))
      .finally(() => setLoading(false));
  }, [params.auditId, token]);

  const summary = useMemo(() => {
    const checks = report?.checks ?? [];
    const actionable = checks.filter((check) => check.status !== "pass");
    const workflow = actionable.reduce(
      (counts, check) => {
        counts[check.workflowStatus ?? "open"] += 1;
        return counts;
      },
      { open: 0, in_progress: 0, fixed: 0, ignored: 0 }
    );
    const topRisks = actionable
      .slice()
      .sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || b.count - a.count)
      .slice(0, 5);

    return {
      totalChecks: checks.length,
      issues: actionable.length,
      failed: checks.filter((check) => check.status === "fail").length,
      warnings: checks.filter((check) => check.status === "warn").length,
      affectedRecords: actionable.reduce((total, check) => total + check.count, 0),
      fixed: actionable.filter((check) => check.workflowStatus === "fixed").length,
      ownerGaps: actionable.filter((check) => !check.assignedTo && check.workflowStatus !== "fixed").length,
      dueGaps: actionable.filter((check) => !check.dueAt && check.workflowStatus !== "fixed").length,
      workflow,
      topRisks,
    };
  }, [report]);

  const shareUrl =
    typeof window !== "undefined" && report?.audit.reportToken
      ? `${window.location.origin}/reports/${report.audit.id}?token=${report.audit.reportToken}`
      : "";

  async function copyShareLink() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <main className="mx-auto max-w-5xl px-6 py-20 text-center text-zinc-500">
          Loading report...
        </main>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <main className="mx-auto max-w-5xl px-6 py-20 text-center">
          <p className="text-lg font-semibold text-red-300">{error ?? "Report unavailable"}</p>
          <a href="/" className="mt-6 inline-block text-sm text-brand hover:underline">
            Back to StackAudit
          </a>
        </main>
      </div>
    );
  }

  const platform = getPlatformConfig(report.portal.platform);
  const portalName = report.portal.name || `${platform.name} ${platform.productNoun}`;

  return (
    <div className="stack-report min-h-screen bg-zinc-950 text-white">
      <style jsx global>{`
        @media print {
          @page {
            size: letter;
            margin: 0.55in;
          }

          html,
          body {
            background: #ffffff !important;
          }

          .stack-report {
            background: #ffffff !important;
            color: #111827 !important;
            font-size: 11px;
          }

          .stack-report main {
            max-width: none !important;
            padding: 0 !important;
          }

          .stack-report section,
          .stack-report .print-panel,
          .stack-report .print-row {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .stack-report section,
          .stack-report [class*="bg-zinc-9"],
          .stack-report [class*="bg-zinc-8"],
          .stack-report [class*="bg-brand"] {
            background: #ffffff !important;
          }

          .stack-report [class*="border-zinc"],
          .stack-report [class*="border-brand"] {
            border-color: #d1d5db !important;
          }

          .stack-report [class*="text-white"],
          .stack-report [class*="text-zinc-200"],
          .stack-report [class*="text-zinc-300"],
          .stack-report [class*="text-zinc-400"],
          .stack-report [class*="text-zinc-500"],
          .stack-report [class*="text-zinc-600"] {
            color: #111827 !important;
          }

          .stack-report p,
          .stack-report li,
          .stack-report span {
            color-adjust: exact;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .stack-report h1 {
            font-size: 28px !important;
            line-height: 1.15 !important;
          }

          .stack-report h2 {
            font-size: 16px !important;
          }

          .stack-report .print-grid {
            display: grid !important;
          }

          .stack-report .print-table {
            font-size: 10px !important;
          }
        }
      `}</style>
      <nav className="border-b border-zinc-800 px-6 py-4 print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <a href="/" className="text-xl font-bold text-brand">
            StackAudit
          </a>
          <div className="flex items-center gap-3">
            {report.viewer.canEdit && (
              <a
                href={`/dashboard?hub_id=${encodeURIComponent(report.portal.hubId)}`}
                className="text-sm text-zinc-400 transition-colors hover:text-white"
              >
                Dashboard
              </a>
            )}
            {shareUrl && (
              <button
                onClick={copyShareLink}
                className="rounded-lg border border-zinc-800 px-3 py-2 text-sm font-semibold text-zinc-300 transition-colors hover:border-zinc-700 hover:text-white"
              >
                {copied ? "Copied" : "Copy Share Link"}
              </button>
            )}
            <button
              onClick={() => window.print()}
              className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
            >
              Export PDF
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-6 py-10 print:max-w-none">
        <section className="print-panel rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span
                  className="rounded-md px-2 py-1 text-xs font-semibold text-white"
                  style={{ backgroundColor: platform.brandColor }}
                >
                  {platform.name}
                </span>
                <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-400">
                  {portalName}
                </span>
              </div>
              <h1 className="text-4xl font-bold tracking-tight">Executive Stack Health Report</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
                A leadership-ready summary of CRM and marketing operations risk, prioritized by severity, affected records, and cleanup progress.
              </p>
              <p className="mt-5 text-xs uppercase tracking-wider text-zinc-600">
                Audit completed {formatDate(report.audit.completedAt ?? report.audit.createdAt)}
              </p>
            </div>
            <div className="min-w-[180px] rounded-xl border border-zinc-800 bg-zinc-950 p-5 text-center">
              <p className="text-xs uppercase tracking-wider text-zinc-600">Health Score</p>
              <p className={`mt-2 text-6xl font-black ${getScoreColor(report.audit.score)}`}>
                {report.audit.score}
              </p>
              <p className="mt-1 text-sm font-semibold text-zinc-400">
                {getScoreLabel(report.audit.score)}
              </p>
            </div>
          </div>
        </section>

        <section className="print-grid mt-6 grid gap-4 md:grid-cols-4">
          {[
            ["Issues", summary.issues, "text-white"],
            ["Failed", summary.failed, "text-red-300"],
            ["Warnings", summary.warnings, "text-yellow-300"],
            ["Affected Records", summary.affectedRecords.toLocaleString(), "text-cyan-300"],
          ].map(([label, value, color]) => (
            <div key={label} className="print-panel rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <p className="text-xs uppercase tracking-wider text-zinc-600">{label}</p>
              <p className={`mt-3 text-3xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </section>

        <section className="print-grid mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="print-panel rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-lg font-semibold">Cleanup Progress</h2>
            <div className="mt-5 space-y-3">
              {[
                ["Open", summary.workflow.open, "bg-zinc-500"],
                ["In progress", summary.workflow.in_progress, "bg-cyan-400"],
                ["Fixed", summary.workflow.fixed, "bg-emerald-400"],
                ["Ignored", summary.workflow.ignored, "bg-zinc-700"],
              ].map(([label, value, color]) => {
                const percent = summary.issues ? (Number(value) / summary.issues) * 100 : 0;
                return (
                  <div key={label}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-zinc-400">{label}</span>
                      <span className="text-zinc-500">{value}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                      <div className={`h-full ${color}`} style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="print-panel rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-lg font-semibold">Recommended Leadership Ask</h2>
            <p className="mt-4 text-sm leading-6 text-zinc-400">
              Prioritize the top open high-severity findings first, assign an owner for every unresolved item, and review progress weekly until the score is above 90.
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {[
                ["Owner gaps", summary.ownerGaps],
                ["Due date gaps", summary.dueGaps],
                ["Confirmed fixed", summary.fixed],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                  <p className="text-xs uppercase tracking-wider text-zinc-600">{label}</p>
                  <p className="mt-2 text-2xl font-bold text-white">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg border border-brand/25 bg-brand/10 p-4">
              <p className="text-sm font-semibold text-brand">
                Suggested next meeting topic
              </p>
              <p className="mt-1 text-sm text-zinc-300">
                Resolve {summary.workflow.open + summary.workflow.in_progress} active stack hygiene items affecting {summary.affectedRecords.toLocaleString()} records.
              </p>
            </div>
          </div>
        </section>

        <section className="print-panel mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold">30-Day Fix Plan</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {[
              ["Week 1", "Assign every open high-severity item, confirm source-system owner rules, and clean the largest affected record set."],
              ["Week 2", "Bulk update known bad records, add routing or lifecycle automation guardrails, and document ownership exceptions."],
              ["Week 3-4", "Re-run StackAudit, verify score movement, and move recurring checks into weekly monitoring."],
            ].map(([title, body]) => (
              <div key={title} className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-sm font-semibold text-brand">{title}</p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="print-panel mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold">Top Risks</h2>
          <div className="mt-5 space-y-3">
            {summary.topRisks.length === 0 ? (
              <p className="text-sm text-zinc-500">No active risks found in this audit.</p>
            ) : (
              summary.topRisks.map((check) => (
                <div
                  key={check.id ?? check.checkName}
                  className="print-row rounded-xl border border-zinc-800 bg-zinc-950 p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${severityStyles[check.severity]}`}
                        >
                          {check.severity}
                        </span>
                        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                          {check.workflowStatus?.replace("_", " ") ?? "open"}
                        </span>
                      </div>
                      <h3 className="mt-3 font-semibold text-white">{check.checkName}</h3>
                      <p className="mt-2 text-sm leading-6 text-zinc-400">{check.description}</p>
                    </div>
                    <div className="min-w-[130px] rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-right">
                      <p className="text-2xl font-bold text-white">{check.count.toLocaleString()}</p>
                      <p className="text-xs text-zinc-500">records</p>
                    </div>
                  </div>
                  {check.fixSteps.length > 0 && (
                    <ul className="mt-4 grid gap-2 border-t border-zinc-800 pt-4 text-sm text-zinc-400 md:grid-cols-2">
                      {check.fixSteps.slice(0, 4).map((step) => (
                        <li key={step} className="flex gap-2">
                          <span className="text-brand">•</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {check.exampleRecords && check.exampleRecords.length > 0 && (
                    <div className="mt-4 border-t border-zinc-800 pt-4">
                      <p className="mb-3 text-xs uppercase tracking-wider text-zinc-600">
                        Sample records to inspect
                      </p>
                      <div className="grid gap-2 md:grid-cols-2">
                        {check.exampleRecords.slice(0, 4).map((record) => {
                          const content = (
                            <>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium text-zinc-200">
                                  {record.label}
                                </span>
                                <span className="block truncate text-xs text-zinc-500">
                                  {[record.detail, record.secondary].filter(Boolean).join(" · ")}
                                </span>
                              </span>
                              {record.url && (
                                <span className="text-xs font-semibold text-brand">Open</span>
                              )}
                            </>
                          );

                          return record.url ? (
                            <a
                              key={record.id}
                              href={record.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 transition-colors hover:border-zinc-700"
                            >
                              {content}
                            </a>
                          ) : (
                            <div
                              key={record.id}
                              className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2"
                            >
                              {content}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        <section className="print-panel mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold">Complete Audit Inventory</h2>
          <div className="print-table mt-5 overflow-hidden rounded-xl border border-zinc-800">
            <div className="grid grid-cols-[1.3fr_90px_90px_100px] gap-3 bg-zinc-950 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-600">
              <span>Check</span>
              <span>Status</span>
              <span>Records</span>
              <span>Owner</span>
            </div>
            {report.checks.map((check) => (
              <div
                key={check.id ?? check.checkName}
                className="grid grid-cols-[1.3fr_90px_90px_100px] gap-3 border-t border-zinc-800 px-4 py-3 text-sm"
              >
                <span className="min-w-0 truncate text-zinc-200">{check.checkName}</span>
                <span className={check.status === "pass" ? "text-emerald-300" : check.status === "fail" ? "text-red-300" : "text-yellow-300"}>
                  {check.status}
                </span>
                <span className="text-zinc-400">{check.count.toLocaleString()}</span>
                <span className="min-w-0 truncate text-zinc-500">{check.assignedTo || "Unassigned"}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 px-6 py-20 text-center text-zinc-500">
          Loading report...
        </div>
      }
    >
      <ReportPageInner />
    </Suspense>
  );
}
