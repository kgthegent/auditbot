"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ConnectButton from "@/components/ConnectButton";
import { SUPPORTED_PLATFORMS } from "@/lib/platforms";

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

      <main className="flex-1 px-6 py-16">
        <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[0.85fr_1fr] lg:items-start">
        <div className="w-full text-center lg:text-left">
          <h1 className="text-3xl font-bold mb-4">Connect Your HubSpot</h1>
          <p className="text-zinc-400 mb-8">
            We&apos;ll request read-only access to run your HubSpot health audit.
            StackAudit will not modify your source records.
          </p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-4 mb-6 text-sm">
              {error === "missing_code"
                ? "Authorization was cancelled. Please try again."
                : "Something went wrong. Please try again."}
            </div>
          )}

          <div className="space-y-4">
            {SUPPORTED_PLATFORMS.map((platform) => (
              <ConnectButton
                key={platform.id}
                className="w-full justify-center"
              />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand">
            What happens next
          </p>
          <div className="mt-5 space-y-4">
            {[
              ["Connect read-only", "Authorize HubSpot. StackAudit stores tokens securely and does not modify source records."],
              ["Run the first scan", "We inspect ownership, lifecycle, duplicate, attribution, and engagement hygiene signals."],
              ["Work the fix plan", "Assign owners, due dates, and notes, then share the executive report."],
            ].map(([title, body], index) => (
              <div key={title} className="flex gap-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand/15 text-sm font-bold text-brand">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-zinc-500">{body}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 text-left space-y-3">
            <p className="text-xs text-zinc-600 uppercase tracking-wider font-semibold">
              What we access
            </p>
            {Array.from(
              new Set(SUPPORTED_PLATFORMS.flatMap((platform) => platform.recordScopes))
            ).map((scope) => (
              <div
                key={scope}
                className="flex items-center gap-2 text-sm text-zinc-400"
              >
                <span className="text-brand">&#10003;</span>
                {scope} <span className="text-zinc-600">(read-only)</span>
              </div>
            ))}
          </div>

          <div className="mt-8 border-t border-zinc-800 pt-6 text-left">
            <p className="text-xs text-zinc-600 uppercase tracking-wider font-semibold mb-3">
              Public launch focus
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-500">
                HubSpot only
              </span>
              <span className="rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-500">
                Read-only OAuth
              </span>
              <span className="rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-500">
                Fix plan + reporting
              </span>
            </div>
          </div>
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
