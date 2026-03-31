"use client";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

const ERROR_MESSAGES: Record<string, string> = {
  invalid: "This link is invalid. Please request a new one.",
  used: "This link has already been used. Please request a new one.",
  expired: "This link has expired. Please request a new one.",
  missing_token: "Missing login token. Please request a new link.",
};

function LoginPageInner() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    await fetch("/api/auth/magic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <nav className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <a href="/" className="text-xl font-bold text-brand">StackAudit</a>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          {submitted ? (
            <div className="text-center">
              <div className="text-4xl mb-4">📬</div>
              <h1 className="text-2xl font-bold mb-3">Check your inbox</h1>
              <p className="text-zinc-400 text-sm">
                We sent a sign-in link to <strong className="text-white">{email}</strong>. It expires in 15 minutes.
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold mb-2 text-center">Sign in to StackAudit</h1>
              <p className="text-zinc-400 text-sm text-center mb-8">Enter your email and we&apos;ll send you a magic link.</p>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-sm mb-6">
                  {ERROR_MESSAGES[error] ?? "Something went wrong. Please try again."}
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-brand text-sm"
                />
                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full py-3 rounded-lg font-semibold text-sm text-white transition-colors disabled:opacity-50"
                  style={{ backgroundColor: "#15A1C7" }}
                >
                  {loading ? "Sending..." : "Send Magic Link"}
                </button>
              </form>

              <p className="text-center text-zinc-600 text-xs mt-6">
                New to StackAudit?{" "}
                <a href="/connect" className="text-brand hover:underline">Connect your HubSpot</a>
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
      <LoginPageInner />
    </Suspense>
  );
}
