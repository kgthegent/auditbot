"use client";

import { useEffect, useState } from "react";
import { getScoreColor, getScoreLabel } from "@/lib/audit/score";

interface AuditRecord {
  id: string;
  score: number;
  created_at: string;
  completed_at: string | null;
}

export default function HistoryPage() {
  const [audits] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In production, fetch from an API endpoint filtered by portal
    // Placeholder to show the UI structure
    setLoading(false);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <nav className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <a href="/" className="text-xl font-bold text-brand">
            AuditBot
          </a>
          <a
            href="/dashboard"
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Back to Dashboard
          </a>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold mb-8">Audit History</h1>

        {loading && (
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && audits.length === 0 && (
          <div className="text-center py-20 text-zinc-600">
            <p className="text-lg">No audits yet</p>
            <p className="text-sm mt-2">
              Run your first audit from the{" "}
              <a href="/dashboard" className="text-brand hover:underline">
                dashboard
              </a>
            </p>
          </div>
        )}

        {!loading && audits.length > 0 && (
          <div className="space-y-3">
            {audits.map((audit, i) => {
              const prev = audits[i + 1];
              const trend = prev ? audit.score - prev.score : null;
              return (
                <a
                  key={audit.id}
                  href={`/dashboard?audit_id=${audit.id}`}
                  className="block bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
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
                    </div>
                    <div className="flex items-center gap-3">
                      {trend !== null && (
                        <span
                          className={`text-sm ${
                            trend > 0
                              ? "text-brand"
                              : trend < 0
                              ? "text-red-400"
                              : "text-zinc-500"
                          }`}
                        >
                          {trend > 0 ? "+" : ""}
                          {trend}
                        </span>
                      )}
                      <span
                        className={`text-2xl font-bold ${getScoreColor(
                          audit.score
                        )}`}
                      >
                        {audit.score}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {getScoreLabel(audit.score)}
                      </span>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
