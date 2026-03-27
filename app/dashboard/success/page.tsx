"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function SuccessPageInner() {
  const searchParams = useSearchParams();
  const hubId = searchParams.get("hub_id");

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
      <div className="text-center max-w-md px-6">
        <div className="text-6xl mb-6">🎉</div>
        <h1 className="text-3xl font-bold mb-4">You&apos;re all set!</h1>
        <p className="text-zinc-400 mb-8">
          Your HubSpot portal is now connected to AuditBot. Weekly hygiene reports will be delivered automatically.
        </p>
        <a
          href={hubId ? `/dashboard?hub_id=${hubId}` : "/dashboard"}
          className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors inline-block"
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
