"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PLATFORM_CONFIG } from "@/lib/platforms";

function MarketoConnectInner() {
  const searchParams = useSearchParams();
  const initialError = searchParams.get("error");
  const platform = PLATFORM_CONFIG.marketo;
  const [error, setError] = useState(initialError);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const res = await fetch("/api/connect/marketo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData.entries())),
    });

    const data = await res.json();
    if (res.ok && data.redirect) {
      window.location.href = data.redirect;
      return;
    }

    setError(data.error || "Connection failed");
    setSubmitting(false);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <nav className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <a href="/" className="text-xl font-bold text-brand">
            StackAudit
          </a>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">Connect {platform.name}</h1>
            <p className="text-zinc-400">
              Enter your LaunchPoint custom service credentials. StackAudit will validate read access and store them securely for audits.
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-4 mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <input name="email" type="email" required placeholder="you@company.com" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-brand" />
            <input name="identityUrl" type="url" required placeholder="Identity URL, e.g. https://123-ABC-456.mktorest.com" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-brand" />
            <input name="restUrl" type="url" required placeholder="REST URL, e.g. https://123-ABC-456.mktorest.com" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-brand" />
            <input name="clientId" required placeholder="Client ID" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-brand" />
            <input name="clientSecret" type="password" required placeholder="Client Secret" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-brand" />
            <button
              type="submit"
              disabled={submitting}
              className="w-full text-white font-semibold px-6 py-3 rounded-lg transition-colors disabled:opacity-60"
              style={{ backgroundColor: platform.brandColor }}
            >
              {submitting ? "Validating..." : `Connect ${platform.name}`}
            </button>
          </form>

          <div className="mt-8 text-center">
            <a href="/connect" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
              &larr; Back to platform selection
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function MarketoConnectPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MarketoConnectInner />
    </Suspense>
  );
}
