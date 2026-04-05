"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function SuccessPageInner() {
  const searchParams = useSearchParams();
  const hubId = searchParams.get("hub_id");
  const upgraded = searchParams.get("upgraded");

  const isUpgrade = upgraded === "starter" || upgraded === "pro";
  const planLabel = upgraded === "pro" ? "Pro" : upgraded === "starter" ? "Starter" : "";

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
      <div className="text-center max-w-md px-6">
        <div className="text-6xl mb-6">🎉</div>
        <h1 className="text-3xl font-bold mb-4">
          {isUpgrade ? `Welcome to ${planLabel}!` : "You're all set!"}
        </h1>
        <p className="text-zinc-400 mb-8">
          {isUpgrade
            ? `Your ${planLabel} plan is now active. Weekly hygiene reports and email digests will be delivered automatically.`
            : "Your portal is now connected to StackAudit. Weekly hygiene reports will be delivered automatically."}
        </p>
        <a
          href={hubId ? `/dashboard?hub_id=${hubId}` : "/dashboard"}
          className="bg-brand hover:bg-brand-hover text-white font-semibold px-6 py-3 rounded-lg transition-colors inline-block"
        >
          View Your Dashboard →
        </a>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
      <SuccessPageInner />
    </Suspense>
  );
}
