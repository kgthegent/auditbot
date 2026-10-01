import type { CheckResult } from "@/types";

/** No provider response bodies or credentials are exposed to API consumers. */
export class IncompleteAuditError extends Error {
  constructor(public readonly failedChecks: string[]) {
    super(`Audit incomplete. No health score was produced. Unavailable checks: ${failedChecks.join(", ")}.`);
    this.name = "IncompleteAuditError";
  }
}

export async function runChecks(
  checks: { name: string; run: () => Promise<CheckResult> }[]
): Promise<CheckResult[]> {
  const results = await Promise.allSettled(checks.map((check) => Promise.resolve().then(check.run)));
  const failed = checks.filter((_, index) => results[index].status === "rejected");
  if (failed.length) throw new IncompleteAuditError(failed.map((check) => check.name));
  return results.map((result) => (result as PromiseFulfilledResult<CheckResult>).value);
}
