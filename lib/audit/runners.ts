import { getPlatformAdapter } from "@/lib/platform-adapters/registry";
import { CheckResult, Portal } from "@/types";

export async function runPlatformAudit(
  portal: Pick<Portal, "id" | "access_token" | "refresh_token" | "platform" | "instance_url" | "auth_config">
): Promise<CheckResult[]> {
  const adapter = getPlatformAdapter(portal.platform);

  return adapter.runAudit(portal);
}
