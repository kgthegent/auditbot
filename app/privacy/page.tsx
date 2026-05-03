export default function PrivacyPage() {
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
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-zinc-500 text-sm mb-10">Last updated: March 31, 2026</p>

        <h2>1. Information We Collect</h2>
        <p>We collect the following information when you use StackAudit:</p>
        <ul>
          <li>
            <strong>Email address</strong> — provided when you sign up or request a magic link login.
          </li>
          <li>
            <strong>Connected platform data</strong> — CRM and marketing automation records,
            owners, activity fields, attribution fields, and metadata accessed via OAuth
            integrations for the purpose of running audits.
          </li>
          <li>
            <strong>Audit results</strong> — scores and check results generated from your connected data,
            stored to power your audit history and trend tracking.
          </li>
          <li>
            <strong>Payment information</strong> — billing is handled entirely by Stripe. We do not
            store credit card numbers or payment details on our servers.
          </li>
          <li>
            <strong>Usage data</strong> — basic logs of actions taken within the Service (e.g., when
            audits are triggered) for debugging and product improvement.
          </li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <p>We use the information we collect to:</p>
        <ul>
          <li>Provide, operate, and improve the Service</li>
          <li>Send you audit results and product updates via email</li>
          <li>Process payments and manage subscriptions</li>
          <li>Respond to support requests</li>
          <li>Detect and prevent abuse or unauthorized access</li>
        </ul>

        <h2>3. Data Sharing</h2>
        <p>
          We do not sell your data. We share data only with trusted third-party services required
          to operate the Service:
        </p>
        <ul>
          <li><strong>Stripe</strong> — payment processing</li>
          <li><strong>Supabase</strong> — database and authentication infrastructure</li>
          <li><strong>HubSpot and Salesforce</strong> — CRM data access via OAuth (read-only)</li>
          <li><strong>Vercel</strong> — hosting and deployment infrastructure</li>
        </ul>
        <p>
          We may disclose your information if required by law or to protect the rights and safety
          of our users or the public.
        </p>

        <h2>4. Data Retention</h2>
        <p>
          We retain your account data and audit history for as long as your account is active.
          If you cancel your account, we will delete your data within 90 days upon request.
          Some data may be retained longer where required by law.
        </p>

        <h2>5. Connected Platform Data</h2>
        <p>
          StackAudit accesses supported platforms via OAuth with read-only scopes. We do not
          modify, delete, or export your connected platform data. Audit analysis is performed server-side
          and only aggregate results (scores, check outcomes) are stored — not raw CRM records.
          You can revoke our access at any time from your connected app settings in the source platform.
        </p>

        <h2>6. Cookies and Tracking</h2>
        <p>
          We use session cookies for authentication (magic link sessions). We do not use
          third-party advertising trackers. Basic analytics may be collected to understand
          product usage patterns.
        </p>

        <h2>7. Security</h2>
        <p>
          We use industry-standard security practices including encrypted connections (HTTPS),
          secure token storage, and access controls. However, no system is 100% secure and we
          cannot guarantee absolute security.
        </p>

        <h2>8. Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li>Access the personal data we hold about you</li>
          <li>Request correction of inaccurate data</li>
          <li>Request deletion of your data</li>
          <li>Revoke connected platform access at any time</li>
        </ul>
        <p>
          To exercise any of these rights, email us at{" "}
          <a href="mailto:hello@stackaudit.io">hello@stackaudit.io</a>.
        </p>

        <h2>9. Children&apos;s Privacy</h2>
        <p>
          The Service is not directed to children under 13. We do not knowingly collect
          personal information from children.
        </p>

        <h2>10. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of material
          changes via email or a notice within the Service.
        </p>

        <h2>11. Contact</h2>
        <p>
          Questions about this policy? Contact us at{" "}
          <a href="mailto:hello@stackaudit.io">hello@stackaudit.io</a>.
        </p>
      </main>
    </div>
  );
}
