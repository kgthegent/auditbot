import ConnectButton from "@/components/ConnectButton";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Nav */}
      <nav className="border-b border-zinc-800 px-6 py-4 sticky top-0 bg-zinc-950/90 backdrop-blur-sm z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="text-xl font-bold text-brand">StackAudit</span>
          <div className="flex items-center gap-6">
            <a href="#pricing" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Pricing
            </a>
            <a href="#how-it-works" className="text-sm text-zinc-400 hover:text-white transition-colors">
              How It Works
            </a>
            <a href="/connect" className="text-sm bg-brand hover:bg-brand-hover text-white px-4 py-1.5 rounded-lg transition-colors font-semibold">
              Get Free Audit
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-28 pb-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
          Your CRM is
          <br />
          <span className="text-brand">probably a mess.</span>
        </h1>
        <p className="text-xl text-zinc-400 mb-10 max-w-xl mx-auto">
          StackAudit scans your HubSpot or Salesforce in seconds. Get a health score, find duplicates, missing data, and stale leads — with step-by-step fixes.
        </p>
        <ConnectButton />
        <p className="text-sm text-zinc-600 mt-4">
          Free audit — no credit card required
        </p>
      </section>

      {/* Problem */}
      <section className="bg-zinc-900/50 border-y border-zinc-800 py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-4">
            Your CRM has problems you don&apos;t know about
          </h2>
          <p className="text-zinc-400 text-center mb-12 max-w-2xl mx-auto">
            Most ops teams discover data quality issues when pipeline reviews go wrong. By then, deals have already gone cold.
          </p>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            {[
              { stat: "23%", label: "of leads have no assigned owner", color: "text-red-400" },
              { stat: "31%", label: "of contacts are missing lead source", color: "text-amber-400" },
              { stat: "40%+", label: "of open leads are stale (30+ days)", color: "text-orange-400" },
            ].map((s) => (
              <div key={s.label}>
                <div className={`text-4xl font-bold mb-2 ${s.color}`}>{s.stat}</div>
                <p className="text-sm text-zinc-400">{s.label}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-600 text-center mt-8">
            Average across StackAudit scans of HubSpot and Salesforce portals
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="max-w-4xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">How it works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              step: "1",
              title: "Connect",
              desc: "Authorize read-only access to your HubSpot or Salesforce. We never modify your data.",
            },
            {
              step: "2",
              title: "Audit",
              desc: "We run 9+ checks against your CRM: duplicates, missing fields, stale records, cross-object issues.",
            },
            {
              step: "3",
              title: "Fix",
              desc: "Get a health score and step-by-step remediation for every issue found. Track improvements over time.",
            },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="w-12 h-12 rounded-full bg-brand/20 text-brand text-xl font-bold flex items-center justify-center mx-auto mb-4">
                {item.step}
              </div>
              <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
              <p className="text-sm text-zinc-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What We Check */}
      <section className="bg-zinc-900/50 border-y border-zinc-800 py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">What we check</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { check: "Duplicate Leads", severity: "HIGH", color: "bg-red-500/20 text-red-400" },
              { check: "Duplicate Contacts", severity: "HIGH", color: "bg-red-500/20 text-red-400" },
              { check: "Missing Lead Owner", severity: "HIGH", color: "bg-red-500/20 text-red-400" },
              { check: "Lead/Contact Cross-Dupes", severity: "HIGH", color: "bg-red-500/20 text-red-400" },
              { check: "Missing Lead Source", severity: "MEDIUM", color: "bg-amber-500/20 text-amber-400" },
              { check: "Stale Leads (30+ days)", severity: "MEDIUM", color: "bg-amber-500/20 text-amber-400" },
              { check: "Open Opps Without Activity", severity: "MEDIUM", color: "bg-amber-500/20 text-amber-400" },
              { check: "Missing Campaign Attribution", severity: "LOW", color: "bg-zinc-700/50 text-zinc-400" },
              { check: "Converted Leads Without Contact", severity: "HIGH", color: "bg-red-500/20 text-red-400" },
            ].map((c) => (
              <div key={c.check} className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${c.color}`}>
                  {c.severity}
                </span>
                <span className="text-sm">{c.check}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-4xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">Simple pricing</h2>
        <p className="text-zinc-400 text-center mb-12">
          Start free. Upgrade when you want ongoing monitoring.
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          {/* Free */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-1">Free</h3>
            <div className="text-3xl font-bold mb-4">$0</div>
            <ul className="space-y-2 text-sm text-zinc-400 mb-6">
              <li className="flex items-start gap-2"><span className="text-brand mt-0.5">&#10003;</span> One-time audit</li>
              <li className="flex items-start gap-2"><span className="text-brand mt-0.5">&#10003;</span> Health score + fix steps</li>
              <li className="flex items-start gap-2"><span className="text-brand mt-0.5">&#10003;</span> HubSpot + Salesforce</li>
            </ul>
            <a href="/connect" className="block text-center bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors">
              Get Free Audit
            </a>
          </div>

          {/* Starter */}
          <div className="bg-zinc-900 border-2 border-brand rounded-xl p-6 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand text-white text-xs font-semibold px-3 py-0.5 rounded-full">
              Popular
            </div>
            <h3 className="text-lg font-semibold mb-1">Starter</h3>
            <div className="text-3xl font-bold mb-4">$49<span className="text-sm text-zinc-400 font-normal">/mo</span></div>
            <ul className="space-y-2 text-sm text-zinc-400 mb-6">
              <li className="flex items-start gap-2"><span className="text-brand mt-0.5">&#10003;</span> Weekly automated audits</li>
              <li className="flex items-start gap-2"><span className="text-brand mt-0.5">&#10003;</span> Email digest reports</li>
              <li className="flex items-start gap-2"><span className="text-brand mt-0.5">&#10003;</span> Score trend tracking</li>
              <li className="flex items-start gap-2"><span className="text-brand mt-0.5">&#10003;</span> 90-day audit history</li>
            </ul>
            <a href="/connect" className="block text-center bg-brand hover:bg-brand-hover text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors">
              Start Free, Upgrade Later
            </a>
          </div>

          {/* Pro */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-1">Pro</h3>
            <div className="text-3xl font-bold mb-4">$99<span className="text-sm text-zinc-400 font-normal">/mo</span></div>
            <ul className="space-y-2 text-sm text-zinc-400 mb-6">
              <li className="flex items-start gap-2"><span className="text-brand mt-0.5">&#10003;</span> Everything in Starter</li>
              <li className="flex items-start gap-2"><span className="text-brand mt-0.5">&#10003;</span> Daily automated audits</li>
              <li className="flex items-start gap-2"><span className="text-brand mt-0.5">&#10003;</span> Multi-portal support</li>
              <li className="flex items-start gap-2"><span className="text-brand mt-0.5">&#10003;</span> Priority support</li>
            </ul>
            <a href="/connect" className="block text-center bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors">
              Start Free, Upgrade Later
            </a>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="bg-zinc-900/50 border-y border-zinc-800 py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="text-zinc-500 text-sm uppercase tracking-wider font-semibold mb-8">
            Built for ops teams that care about data quality
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { quote: "Found 200+ duplicate leads we had no idea existed. Fixed them in a day.", author: "Marketing Ops Manager" },
              { quote: "We run this weekly now. Our pipeline reporting finally makes sense.", author: "Sales Ops Lead" },
              { quote: "Replaced a $15k annual consulting engagement with a $49/mo tool.", author: "VP Revenue Operations" },
            ].map((t) => (
              <div key={t.author} className="text-left">
                <p className="text-sm text-zinc-300 mb-3">&ldquo;{t.quote}&rdquo;</p>
                <p className="text-xs text-zinc-500">{t.author}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold mb-4">
          Find out what&apos;s wrong with your CRM
        </h2>
        <p className="text-zinc-400 mb-8">
          It takes 30 seconds. Connect your CRM, get your score.
        </p>
        <ConnectButton />
        <p className="text-sm text-zinc-600 mt-4">
          Free audit — no credit card required
        </p>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-8">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-zinc-600">
            &copy; {new Date().getFullYear()} Village Consulting. All rights reserved.
          </div>
          <div className="flex items-center gap-6 text-sm text-zinc-500">
            <a href="/privacy" className="hover:text-zinc-300 transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-zinc-300 transition-colors">Terms</a>
            <a href="mailto:kyle@village-consulting.com" className="hover:text-zinc-300 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
