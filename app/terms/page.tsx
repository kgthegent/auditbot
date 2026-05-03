export default function TermsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <nav className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <a href="/" className="text-xl font-bold text-brand">
            StackAudit
          </a>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12 prose prose-invert prose-zinc max-w-none">
        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-zinc-500 text-sm mb-10">Last updated: March 31, 2026</p>

        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing or using StackAudit (&quot;Service&quot;), operated by Village Consulting
          (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), you agree to be bound by these Terms of Service. If you
          do not agree to these terms, do not use the Service.
        </p>

        <h2>2. Description of Service</h2>
        <p>
          StackAudit provides automated auditing and monitoring tools for CRM and marketing
          automation platforms. The Service analyzes your connected platform and provides hygiene scores,
          recommendations, and ongoing monitoring depending on your subscription plan.
        </p>

        <h2>3. Account Registration</h2>
        <p>
          You must provide a valid email address to use the Service. You are responsible for
          maintaining the confidentiality of your login credentials and for all activity that
          occurs under your account. You must notify us immediately of any unauthorized use.
        </p>

        <h2>4. Subscriptions and Billing</h2>
        <p>
          StackAudit offers free and paid subscription plans. Paid plans are billed on a
          monthly recurring basis via Stripe. By subscribing to a paid plan, you authorize us
          to charge your payment method on a recurring basis. You may cancel your subscription
          at any time through the customer portal; cancellation takes effect at the end of the
          current billing period.
        </p>

        <h2>5. Data and Privacy</h2>
        <p>
          By connecting a supported platform, you grant StackAudit read access to your CRM or
          marketing automation data
          solely for the purpose of providing audit and monitoring services. We do not sell your
          data to third parties. See our <a href="/privacy">Privacy Policy</a> for full details.
        </p>

        <h2>6. Acceptable Use</h2>
        <p>
          You agree not to misuse the Service, attempt to access data you are not authorized to
          access, reverse engineer the Service, or use the Service for any unlawful purpose.
        </p>

        <h2>7. Disclaimers</h2>
        <p>
          The Service is provided &quot;as is&quot; without warranties of any kind. We do not guarantee
          that audit results are error-free or that use of our recommendations will result in
          any particular outcome. Audit scores and recommendations are informational only.
        </p>

        <h2>8. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, Village Consulting shall not be liable for any
          indirect, incidental, special, or consequential damages arising from your use of the
          Service. Our total liability shall not exceed the amount you paid us in the 30 days
          prior to the claim.
        </p>

        <h2>9. Termination</h2>
        <p>
          We reserve the right to suspend or terminate your account at our discretion if you
          violate these terms. You may terminate your account at any time by canceling your
          subscription and ceasing use of the Service.
        </p>

        <h2>10. Changes to Terms</h2>
        <p>
          We may update these terms from time to time. We will notify you of material changes
          via email or a notice on the Service. Continued use after changes constitutes
          acceptance of the updated terms.
        </p>

        <h2>11. Governing Law</h2>
        <p>
          These terms are governed by the laws of the State of Utah, without regard to its
          conflict of law provisions.
        </p>

        <h2>12. Contact</h2>
        <p>
          Questions about these terms? Contact us at{" "}
          <a href="mailto:hello@stackaudit.io">hello@stackaudit.io</a>.
        </p>
      </main>
    </div>
  );
}
