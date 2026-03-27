"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import AuditScore from "@/components/AuditScore";
import CheckCard from "@/components/CheckCard";
import { CheckResult } from "@/types";

interface AuditData {
  audit_id: string;
  score: number;
  checks: CheckResult[];
}

function DashboardPageInner() {
  const searchParams = useSearchParams();
  const hubId = searchParams.get("hub_id");

  const [audit, setAudit] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runAudit(portalId: string) {
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
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <nav className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <a href="/" className="text-xl font-bold text-green-500">
            AuditBot
          </a>
          <div className="flex items-center gap-4">
            <a
              href="/dashboard/history"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              History
            </a>
            {hubId && (
              <span className="text-xs bg-zinc-800 text-zinc-400 px-3 py-1 rounded-full">
                Hub {hubId}
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
              // In production, get portal_id from the session/URL
              // For now, prompt or use a stored value
              const portalId = prompt("Enter your portal ID:");
              if (portalId) runAudit(portalId);
            }}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
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
            <div className="inline-block w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-zinc-500 mt-4">
              Scanning your HubSpot portal...
            </p>
          </div>
        )}

        {audit && !loading && (
          <>
            <AuditScore score={audit.score} />

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
