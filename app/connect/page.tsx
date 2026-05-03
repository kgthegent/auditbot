"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ConnectButton from "@/components/ConnectButton";
import { PLATFORM_ROADMAP, SUPPORTED_PLATFORMS } from "@/lib/platforms";

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
            {SUPPORTED_PLATFORMS.map((platform) => (
              <ConnectButton
                key={platform.id}
                platform={platform.id}
                className="w-full justify-center"
              />
            ))}
          </div>

          <div className="mt-10 text-left space-y-3">
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
              Next platforms
            </p>
            <div className="flex flex-wrap gap-2">
              {PLATFORM_ROADMAP.map((platform) => (
                <span
                  key={platform}
                  className="rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-500"
                >
                  {platform}
                </span>
              ))}
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
