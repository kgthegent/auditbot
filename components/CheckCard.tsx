"use client";

import { CheckResult } from "@/types";

const SEVERITY_STYLES = {
  high: "bg-red-500/10 text-red-400 border-red-500/30",
  medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  low: "bg-blue-500/10 text-blue-400 border-blue-500/30",
};

const STATUS_ICON = {
  pass: "✓",
  warn: "⚠",
  fail: "✕",
};

const STATUS_COLOR = {
  pass: "text-green-400",
  warn: "text-yellow-400",
  fail: "text-red-400",
};

export default function CheckCard({ check }: { check: CheckResult }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className={`text-xl ${STATUS_COLOR[check.status]}`}>
            {STATUS_ICON[check.status]}
          </span>
          <h3 className="text-white font-semibold">{check.checkName}</h3>
        </div>
        <span
          className={`text-xs px-2 py-1 rounded-full border ${SEVERITY_STYLES[check.severity]}`}
        >
          {check.severity}
        </span>
      </div>

      <p className="text-zinc-400 text-sm mb-3">{check.description}</p>

      <div className="flex gap-4 text-sm mb-4">
        <span className="text-zinc-500">
          Count: <span className="text-white">{check.count.toLocaleString()}</span>
        </span>
        <span className="text-zinc-500">
          Affected: <span className="text-white">{check.percentage}%</span>
        </span>
      </div>

      {check.fixSteps.length > 0 && check.status !== "pass" && (
        <div className="border-t border-zinc-800 pt-3">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
            How to fix
          </p>
          <ul className="space-y-1">
            {check.fixSteps.map((step, i) => (
              <li key={i} className="text-sm text-zinc-400 flex gap-2">
                <span className="text-green-500 shrink-0">{i + 1}.</span>
                {step}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
