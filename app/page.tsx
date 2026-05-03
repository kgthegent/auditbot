import ConnectButton from "@/components/ConnectButton";
import { getAllAuditChecks, PLATFORM_ROADMAP, SUPPORTED_PLATFORMS } from "@/lib/platforms";

const severityStyles = {
  HIGH: "border-red-400/25 bg-red-400/10 text-red-200",
  MEDIUM: "border-amber-300/25 bg-amber-300/10 text-amber-100",
  LOW: "border-sky-300/25 bg-sky-300/10 text-sky-100",
};

const categoryStyles = {
  "Data Quality": "bg-cyan-300/10 text-cyan-100",
  Ownership: "bg-emerald-300/10 text-emerald-100",
  Attribution: "bg-amber-300/10 text-amber-100",
  Engagement: "bg-fuchsia-300/10 text-fuchsia-100",
};

const platformInitials: Record<string, string> = {
  hubspot: "HS",
  salesforce: "SF",
  marketo: "MK",
  marketing_cloud: "MC",
};

const pricingPlans = [
  {
    name: "Free",
    price: "$0",
    note: "One-time health scan",
    cta: "Get Free Audit",
    highlight: false,
    features: ["Health score + fix steps", "Core platform checks", "No credit card required"],
  },
  {
    name: "Starter",
    price: "$49",
    note: "per month",
    cta: "Start Free, Upgrade Later",
    highlight: true,
    features: ["Weekly automated audits", "Email digest reports", "Score trend tracking", "90-day audit history"],
  },
  {
    name: "Pro",
    price: "$99",
    note: "per month",
    cta: "Start Free, Upgrade Later",
    highlight: false,
    features: ["Daily automated audits", "Multi-portal support", "Priority support", "Connector beta access"],
  },
  {
    name: "Done For You",
    price: "$1,500",
    note: "one-time",
    cta: "Contact Us",
    href: "mailto:kyle@village-consulting.com?subject=StackAudit Done-For-You",
    highlight: false,
    features: ["Full CRM audit", "We fix your top 3 issues", "1-hour strategy call", "30-day follow-up audit"],
  },
];

export default function Home() {
  const auditChecks = getAllAuditChecks();
  const supportedPlatformNames = SUPPORTED_PLATFORMS.map((platform) => platform.name).join(", ");
  const failedChecks = auditChecks.filter((check) => check.severity === "HIGH").slice(0, 4);

  return (
    <div className="min-h-screen overflow-hidden bg-[#05070a] text-white">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_50%_0%,rgba(21,161,199,0.18),rgba(5,7,10,0)_58%)]" />

      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#05070a]/80 px-5 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg border border-brand/30 bg-brand/15 text-sm font-black text-brand">
              SA
            </span>
            <span className="text-lg font-semibold tracking-wide">StackAudit</span>
          </a>
          <div className="hidden items-center gap-7 md:flex">
            <a href="#checks" className="text-sm text-zinc-400 transition-colors hover:text-white">
              Checks
            </a>
            <a href="#platforms" className="text-sm text-zinc-400 transition-colors hover:text-white">
              Platforms
            </a>
            <a href="#pricing" className="text-sm text-zinc-400 transition-colors hover:text-white">
              Pricing
            </a>
          </div>
          <a
            href="/connect"
            className="rounded-lg border border-white/10 bg-white px-4 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-200"
          >
            Run Audit
          </a>
        </div>
      </nav>

      <main className="relative">
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-24 pt-20 lg:grid-cols-[1fr_0.95fr] lg:pt-28">
          <div>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3 py-1.5 text-xs font-semibold text-cyan-100">
              <span className="h-1.5 w-1.5 rounded-full bg-brand shadow-[0_0_16px_rgba(21,161,199,0.9)]" />
              AI-assisted CRM health intelligence
            </div>
            <h1 className="max-w-4xl text-5xl font-semibold leading-[1.02] text-white md:text-7xl">
              Find pipeline risk before it hits revenue.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300">
              StackAudit connects to your CRM and marketing automation stack, scans for broken records, stalled handoffs, and attribution gaps, then turns the mess into a prioritized fix plan.
            </p>
            <div className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center">
              <ConnectButton className="justify-center px-7 py-3.5" />
              <a
                href="#checks"
                className="inline-flex justify-center rounded-lg border border-white/10 px-7 py-3.5 text-sm font-semibold text-zinc-200 transition-colors hover:border-white/20 hover:bg-white/5"
              >
                View Checks
              </a>
            </div>
            <div className="mt-9 grid max-w-xl grid-cols-3 gap-4 border-t border-white/10 pt-6">
              {[
                ["30 sec", "average scan"],
                ["15+", "health signals"],
                ["0", "records modified"],
              ].map(([stat, label]) => (
                <div key={label}>
                  <div className="text-2xl font-semibold text-white">{stat}</div>
                  <div className="mt-1 text-xs uppercase text-zinc-500">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-3 shadow-2xl shadow-cyan-950/30">
              <div className="rounded-[1.45rem] border border-white/10 bg-[#080d12] p-5">
                <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <p className="text-xs uppercase text-zinc-500">Stack health</p>
                    <h2 className="mt-1 text-xl font-semibold">Revenue Ops Audit</h2>
                  </div>
                  <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-100">
                    Live scan
                  </span>
                </div>

                <div className="grid gap-4 md:grid-cols-[0.78fr_1fr]">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                    <p className="text-xs uppercase text-zinc-500">Health score</p>
                    <div className="mt-4 flex items-end gap-2">
                      <span className="text-7xl font-black text-white">72</span>
                      <span className="pb-3 text-sm font-semibold text-amber-200">Needs work</span>
                    </div>
                    <div className="mt-5 h-2 overflow-hidden rounded-full bg-zinc-800">
                      <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-red-400 via-amber-300 to-brand" />
                    </div>
                    <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                      {[
                        ["8", "fail"],
                        ["5", "warn"],
                        ["12", "pass"],
                      ].map(([count, label]) => (
                        <div key={label} className="rounded-lg border border-white/10 bg-black/20 px-2 py-3">
                          <div className="text-xl font-semibold">{count}</div>
                          <div className="text-xs uppercase text-zinc-500">{label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {failedChecks.map((check) => (
                      <div key={check.name} className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold text-white">{check.name}</span>
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${severityStyles[check.severity]}`}>
                            {check.severity}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-zinc-500">
                          <span>{check.category}</span>
                          <span>Fix plan ready</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  {SUPPORTED_PLATFORMS.map((platform) => (
                    <div key={platform.id} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
                      <span
                        className="grid h-8 w-8 place-items-center rounded-lg text-xs font-bold text-white"
                        style={{ backgroundColor: platform.brandColor }}
                      >
                        {platformInitials[platform.id]}
                      </span>
                      <span className="min-w-0 truncate text-sm text-zinc-200">{platform.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="platforms" className="border-y border-white/10 bg-white/[0.025] py-16">
          <div className="mx-auto max-w-6xl px-5">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1fr] lg:items-end">
              <div>
                <p className="text-sm font-semibold uppercase text-brand">Platform coverage</p>
                <h2 className="mt-3 text-3xl font-semibold md:text-4xl">One audit model across the systems that touch revenue.</h2>
              </div>
              <p className="text-base leading-7 text-zinc-400">
                Current connectors cover {supportedPlatformNames}. The adapter layer is ready for the next wave of marketing automation systems without rebuilding the product surface.
              </p>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-4">
              {SUPPORTED_PLATFORMS.map((platform) => (
                <a
                  key={platform.id}
                  href={platform.connectPath}
                  className="group rounded-2xl border border-white/10 bg-[#080d12] p-5 transition-colors hover:border-brand/40 hover:bg-white/[0.045]"
                >
                  <div
                    className="mb-5 grid h-11 w-11 place-items-center rounded-xl text-sm font-black text-white"
                    style={{ backgroundColor: platform.brandColor }}
                  >
                    {platformInitials[platform.id]}
                  </div>
                  <h3 className="font-semibold">{platform.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">{platform.recordScopes.slice(0, 2).join(", ")}</p>
                  <p className="mt-5 text-xs font-semibold text-brand">Connect platform</p>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section id="checks" className="mx-auto max-w-6xl px-5 py-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase text-brand">Audit intelligence</p>
            <h2 className="mt-3 text-3xl font-semibold md:text-5xl">The checks operators actually need.</h2>
            <p className="mt-5 text-lg leading-8 text-zinc-400">
              StackAudit groups issues by severity and operating category so your team knows what to fix first.
            </p>
          </div>
          <div className="mt-12 grid gap-3 md:grid-cols-2">
            {auditChecks.map((check) => (
              <div key={check.name} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.025] p-4">
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${severityStyles[check.severity]}`}>
                  {check.severity}
                </span>
                <span className="min-w-0 flex-1 text-sm font-medium text-zinc-100">{check.name}</span>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${categoryStyles[check.category]}`}>
                  {check.category}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {PLATFORM_ROADMAP.map((platform) => (
              <span key={platform} className="rounded-full border border-white/10 bg-white/[0.025] px-3 py-1 text-xs text-zinc-500">
                {platform} next
              </span>
            ))}
          </div>
        </section>

        <section className="border-y border-white/10 bg-white/[0.025] py-24">
          <div className="mx-auto max-w-6xl px-5">
            <div className="grid gap-12 lg:grid-cols-[0.9fr_1fr] lg:items-center">
              <div>
                <p className="text-sm font-semibold uppercase text-brand">Fix planning</p>
                <h2 className="mt-3 text-3xl font-semibold md:text-5xl">Every issue becomes an action list.</h2>
                <p className="mt-5 text-lg leading-8 text-zinc-400">
                  The output is built for repeated ops work: prioritize, clean up, monitor, and prove the stack is getting healthier.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  ["Detect", "Find duplicate, stale, unowned, and unattributed records."],
                  ["Prioritize", "Rank issues by severity, count, and pipeline impact."],
                  ["Monitor", "Track score changes through weekly or daily scans."],
                ].map(([title, body], index) => (
                  <div key={title} className="rounded-2xl border border-white/10 bg-[#080d12] p-5">
                    <div className="mb-8 text-sm font-semibold text-brand">0{index + 1}</div>
                    <h3 className="font-semibold text-white">{title}</h3>
                    <p className="mt-3 text-sm leading-6 text-zinc-500">{body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-6xl px-5 py-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase text-brand">Pricing</p>
            <h2 className="mt-3 text-3xl font-semibold md:text-5xl">Start with a free scan. Upgrade when monitoring matters.</h2>
          </div>
          <div className="mt-12 grid gap-4 lg:grid-cols-4">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-6 ${
                  plan.highlight
                    ? "border-brand/50 bg-brand/[0.08] shadow-2xl shadow-cyan-950/30"
                    : "border-white/10 bg-white/[0.025]"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-6 rounded-full bg-brand px-3 py-1 text-xs font-bold text-white">
                    Popular
                  </div>
                )}
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <div className="mt-5 flex items-end gap-2">
                  <span className="text-4xl font-black">{plan.price}</span>
                  {plan.note === "per month" && <span className="pb-1 text-sm text-zinc-500">/mo</span>}
                </div>
                <p className="mt-2 text-sm text-zinc-500">{plan.note}</p>
                <ul className="mt-7 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-3 text-sm text-zinc-300">
                      <span className="text-brand">&#10003;</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href={plan.href ?? "/connect"}
                  className={`mt-8 block rounded-lg px-4 py-3 text-center text-sm font-semibold transition-colors ${
                    plan.highlight
                      ? "bg-brand text-white hover:bg-brand-hover"
                      : "border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
                  }`}
                >
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 pb-24">
          <div className="rounded-[2rem] border border-brand/25 bg-brand/[0.08] p-8 text-center md:p-12">
            <p className="text-sm font-semibold uppercase text-brand">StackAudit Guarantee</p>
            <h2 className="mt-3 text-3xl font-semibold md:text-5xl">If we do not find 5 actionable issues, your first paid month is free.</h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-zinc-300">
              Connect read-only access, run the audit, and get a fix plan. No credit card required for the first scan.
            </p>
            <div className="mt-8">
              <ConnectButton className="justify-center px-7 py-3.5" />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 md:flex-row">
          <div className="text-sm text-zinc-600">
            &copy; {new Date().getFullYear()} Village Consulting. All rights reserved.
          </div>
          <div className="flex items-center gap-6 text-sm text-zinc-500">
            <a href="/privacy" className="transition-colors hover:text-zinc-300">Privacy</a>
            <a href="/terms" className="transition-colors hover:text-zinc-300">Terms</a>
            <a href="mailto:kyle@village-consulting.com" className="transition-colors hover:text-zinc-300">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
