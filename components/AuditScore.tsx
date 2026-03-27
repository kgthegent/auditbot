"use client";

import { getScoreLabel, getScoreColor } from "@/lib/audit/score";

interface AuditScoreProps {
  score: number;
  previousScore?: number;
}

export default function AuditScore({ score, previousScore }: AuditScoreProps) {
  const label = getScoreLabel(score);
  const colorClass = getScoreColor(score);
  const trend = previousScore !== undefined ? score - previousScore : null;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
      <p className="text-sm text-zinc-500 uppercase tracking-wider mb-2">
        CRM Health Score
      </p>
      <div className="flex items-center justify-center gap-3">
        <span className={`text-7xl font-bold ${colorClass}`}>{score}</span>
        {trend !== null && (
          <span
            className={`text-2xl ${
              trend > 0 ? "text-green-400" : trend < 0 ? "text-red-400" : "text-zinc-500"
            }`}
          >
            {trend > 0 ? "↑" : trend < 0 ? "↓" : "→"}
            {Math.abs(trend)}
          </span>
        )}
      </div>
      <p className={`text-lg mt-2 ${colorClass}`}>{label}</p>
    </div>
  );
}
