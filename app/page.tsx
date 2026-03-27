import ConnectButton from "@/components/ConnectButton";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Nav */}
      <nav className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="text-xl font-bold text-green-500">AuditBot</span>
          <a
            href="https://village-consulting.com"
            className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            by Village Consulting
          </a>
        </div>
      </nav>

      {/* Hero */}
      <main className="max-w-3xl mx-auto px-6 pt-32 pb-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
          Your HubSpot is
          <br />
          <span className="text-green-500">probably a mess.</span>
        </h1>
        <p className="text-xl text-zinc-400 mb-10 max-w-xl mx-auto">
          AuditBot scans your CRM in seconds and gives you a health score with
          actionable fixes. No consultants, no guesswork.
        </p>
        <ConnectButton />
        <p className="text-sm text-zinc-600 mt-4">
          Free audit — no credit card required
        </p>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mt-24 text-left">
          {[
            {
              title: "5 Critical Checks",
              desc: "Duplicates, missing owners, lifecycle gaps, stale leads, and UTM tracking issues.",
            },
            {
              title: "Health Score",
              desc: "Get a 0-100 score with severity-weighted scoring so you know what to fix first.",
            },
            {
              title: "Fix Steps",
              desc: "Every issue comes with clear, step-by-step instructions to resolve it.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-6"
            >
              <h3 className="font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-zinc-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-8 text-center text-sm text-zinc-600">
        &copy; {new Date().getFullYear()} Village Consulting. All rights reserved.
      </footer>
    </div>
  );
}
