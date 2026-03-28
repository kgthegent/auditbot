"use client";

export default function ConnectButton() {
  return (
    <a
      href="/api/auth/hubspot"
      className="inline-flex items-center gap-2 bg-brand hover:bg-brand-hover text-white font-semibold px-6 py-3 rounded-lg transition-colors"
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.16 5.67V3.39a1.71 1.71 0 0 0 1-1.55 1.72 1.72 0 0 0-3.44 0 1.71 1.71 0 0 0 1 1.55v2.28a5.39 5.39 0 0 0-2.81 1.57l-7.58-5.9a2.09 2.09 0 0 0 .05-.43 2.05 2.05 0 1 0-2.05 2.05 2 2 0 0 0 1.18-.38l7.45 5.8a5.4 5.4 0 0 0 .06 5.35l-2.27 2.27a1.76 1.76 0 0 0-.51-.08 1.78 1.78 0 1 0 1.78 1.78 1.76 1.76 0 0 0-.08-.51l2.24-2.24a5.42 5.42 0 1 0 3.98-9.38zm-.44 8.08a2.67 2.67 0 1 1 0-5.34 2.67 2.67 0 0 1 0 5.34z" />
      </svg>
      Connect HubSpot
    </a>
  );
}
