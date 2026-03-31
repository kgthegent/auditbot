"use client";
import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function VerifyInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  useEffect(() => {
    if (token) {
      window.location.href = `/api/auth/verify?token=${token}`;
    }
  }, [token]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-zinc-400">Signing you in...</p>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
      <VerifyInner />
    </Suspense>
  );
}
