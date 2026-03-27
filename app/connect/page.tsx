"use client";

import { useSearchParams } from "next/navigation";
import ConnectButton from "@/components/ConnectButton";

export default function ConnectPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <nav className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <a href="/" className="text-xl font-bold text-green-500">
            AuditBot
          </a>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <h1 className="text-3xl font-bold mb-4">Connect Your HubSpot</h1>
          <p className="text-zinc-400 mb-8">
            We&apos;ll request read-only access to your contacts, companies, and
            deals to run your CRM health audit.
          </p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-4 mb-6 text-sm">
              {error === "missing_code"
                ? "Authorization was cancelled. Please try again."
                : "Something went wrong connecting to HubSpot. Please try again."}
            </div>
          )}

          <ConnectButton />

          <div className="mt-10 text-left space-y-3">
            <p className="text-xs text-zinc-600 uppercase tracking-wider font-semibold">
              What we access
            </p>
            {[
              "Contacts (read-only)",
              "Companies (read-only)",
              "Deals (read-only)",
              "Contact owners (read-only)",
            ].map((scope) => (
              <div
                key={scope}
                className="flex items-center gap-2 text-sm text-zinc-400"
              >
                <span className="text-green-500">&#10003;</span>
                {scope}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
