"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function SalesforceConnectInner() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const errorMessage =
    error === "missing_code"
      ? "Authorization was cancelled. Please try again."
      : error === "missing_verifier"
      ? "The Salesforce login session expired. Start the connection again."
      : error === "db_not_ready"
      ? "Salesforce needs the platform database migration before it can be connected."
      : error === "salesforce_not_configured"
      ? "Salesforce OAuth is not configured yet."
      : error
      ? "Something went wrong connecting to Salesforce. Please try again."
      : null;

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <nav className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <a href="/" className="text-xl font-bold text-brand">
            StackAudit
          </a>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <h1 className="text-3xl font-bold mb-4">Connect Your Salesforce</h1>
          <p className="text-zinc-400 mb-8">
            We&apos;ll request access to your Salesforce org to run a CRM
            health audit on your leads, contacts, and opportunities.
          </p>

          {errorMessage && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-4 mb-6 text-sm">
              {errorMessage}
            </div>
          )}

          <a
            href="/api/connect/salesforce"
            className="inline-flex items-center gap-2 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            style={{ backgroundColor: "#00A1E0" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#0082B4")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#00A1E0")
            }
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10.1 4.5c1-.9 2.2-1.5 3.6-1.5 1.7 0 3.2.9 4.1 2.2.8-.4 1.6-.6 2.5-.6C23 4.6 25.2 6.9 25.2 9.7c0 .3 0 .5-.1.8 1.4.7 2.3 2.1 2.3 3.7 0 2.3-1.9 4.2-4.2 4.2h-.3c-.7 1.5-2.2 2.6-4 2.6-1 0-2-.3-2.7-.9-.7 1.2-2 2-3.5 2-1.4 0-2.6-.7-3.3-1.8-.4.1-.8.2-1.3.2-2.3 0-4.2-1.9-4.2-4.2 0-1.4.7-2.7 1.8-3.4-.2-.5-.3-1.1-.3-1.7C5.4 8.3 7.3 6 9.7 5.5c0-.4.2-.7.4-1z" />
            </svg>
            Connect Salesforce
          </a>

          <div className="mt-10 text-left space-y-3">
            <p className="text-xs text-zinc-600 uppercase tracking-wider font-semibold">
              What we access
            </p>
            {[
              "Leads (read-only)",
              "Contacts (read-only)",
              "Opportunities (read-only)",
              "Campaign data (read-only)",
            ].map((scope) => (
              <div
                key={scope}
                className="flex items-center gap-2 text-sm text-zinc-400"
              >
                <span className="text-brand">&#10003;</span>
                {scope}
              </div>
            ))}
          </div>

          <div className="mt-8">
            <a href="/connect" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
              &larr; Back to platform selection
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SalesforceConnectPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SalesforceConnectInner />
    </Suspense>
  );
}
