import { Platform } from "@/types";

export interface PlatformConfig {
  id: Platform;
  name: string;
  productNoun: string;
  connectPath: string;
  brandColor: string;
  hoverColor: string;
  recordScopes: string[];
  auditChecks: {
    name: string;
    severity: "HIGH" | "MEDIUM" | "LOW";
    category: "Data Quality" | "Ownership" | "Attribution" | "Engagement";
  }[];
}

export const HUBSPOT_PLATFORM_CONFIG: PlatformConfig = {
  id: "hubspot",
  name: "HubSpot",
  productNoun: "portal",
  connectPath: "/api/auth/hubspot",
  brandColor: "#FF7A59",
  hoverColor: "#E8674A",
  recordScopes: [
    "Contacts",
    "Contact owners",
    "Lifecycle stages",
    "Analytics source fields",
  ],
  auditChecks: [
    { name: "Duplicate Contacts", severity: "HIGH", category: "Data Quality" },
    { name: "Missing Contact Owner", severity: "HIGH", category: "Ownership" },
    { name: "Missing Lifecycle Stage", severity: "MEDIUM", category: "Data Quality" },
    { name: "Unassigned New Leads (7d)", severity: "HIGH", category: "Ownership" },
    { name: "UTM / Source Gaps", severity: "LOW", category: "Attribution" },
  ],
};

export const PLATFORM_CONFIG: Record<"hubspot", PlatformConfig> = {
  hubspot: HUBSPOT_PLATFORM_CONFIG,
};

const launchPlatforms = [HUBSPOT_PLATFORM_CONFIG];

export const SUPPORTED_PLATFORMS = launchPlatforms;

export const LAUNCH_PLATFORM = HUBSPOT_PLATFORM_CONFIG;

export function getPlatformConfig(platform?: string | null) {
  void platform;
  return HUBSPOT_PLATFORM_CONFIG;
}

export function getAllAuditChecks() {
  const checks = SUPPORTED_PLATFORMS.flatMap((platform) =>
    platform.auditChecks.map((check) => ({ ...check, platform: platform.name }))
  );

  return Array.from(new Map(checks.map((check) => [check.name, check])).values());
}

/*
 * The multi-platform registry and connector UI were preserved on the
 * codex/multi-platform-work branch. This launch build intentionally exposes
 * only HubSpot until the other connectors are ready for public use.
 */
