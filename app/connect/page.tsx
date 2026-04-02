"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ConnectButton from "@/components/ConnectButton";

function ConnectPageInner() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

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
          <h1 className="text-3xl font-bold mb-4">Connect Your CRM</h1>
          <p className="text-zinc-400 mb-8">
            We&apos;ll request read-only access to run your CRM health audit.
            Choose your platform below.
          </p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-4 mb-6 text-sm">
              {error === "missing_code"
                ? "Authorization was cancelled. Please try again."
                : "Something went wrong. Please try again."}
            </div>
          )}

          <div className="space-y-4">
            <ConnectButton />

            <a
              href="/api/connect/salesforce"
              className="inline-flex items-center gap-2 text-white font-semibold px-6 py-3 rounded-lg transition-colors w-full justify-center"
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
          </div>

          <div className="mt-10 text-left space-y-3">
            <p className="text-xs text-zinc-600 uppercase tracking-wider font-semibold">
              What we access
            </p>
            {[
              "Contacts (read-only)",
              "Leads (read-only)",
              "Deals / Opportunities (read-only)",
              "Contact owners (read-only)",
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
        </div>
      </main>
    </div>
  );
}

export default function ConnectPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ConnectPageInner />
    </Suspense>
  );
}
