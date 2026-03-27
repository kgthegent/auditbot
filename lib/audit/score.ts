import { CheckResult } from "@/types";

const SEVERITY_PENALTY: Record<string, number> = {
  high: 20,
  medium: 10,
  low: 5,
};

export function calculateScore(checks: CheckResult[]): number {
  let score = 100;

  for (const check of checks) {
    if (check.status === "fail") {
      score -= SEVERITY_PENALTY[check.severity] ?? 0;
    } else if (check.status === "warn") {
      score -= Math.floor((SEVERITY_PENALTY[check.severity] ?? 0) / 2);
    }
  }

  return Math.max(0, Math.min(100, score));
}

export function getScoreLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 50) return "Needs Work";
  return "Critical";
}

export function getScoreColor(score: number): string {
  if (score >= 90) return "text-green-400";
  if (score >= 75) return "text-yellow-400";
  if (score >= 50) return "text-orange-400";
  return "text-red-400";
}
