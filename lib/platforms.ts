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

export const PLATFORM_CONFIG: Record<Platform, PlatformConfig> = {
  hubspot: {
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
  },
  salesforce: {
    id: "salesforce",
    name: "Salesforce",
    productNoun: "org",
    connectPath: "/api/connect/salesforce",
    brandColor: "#00A1E0",
    hoverColor: "#0082B4",
    recordScopes: [
      "Leads",
      "Contacts",
      "Opportunities",
      "Owners and activity fields",
    ],
    auditChecks: [
      { name: "Duplicate Leads", severity: "HIGH", category: "Data Quality" },
      { name: "Duplicate Contacts", severity: "HIGH", category: "Data Quality" },
      { name: "Missing Lead Owner", severity: "HIGH", category: "Ownership" },
      { name: "Missing Lead Source", severity: "MEDIUM", category: "Attribution" },
      { name: "Stale Leads (30d No Activity)", severity: "MEDIUM", category: "Engagement" },
      { name: "Converted Leads Without Contact", severity: "HIGH", category: "Data Quality" },
      { name: "Missing Campaign Attribution", severity: "LOW", category: "Attribution" },
      { name: "Open Opps No Activity (14d)", severity: "MEDIUM", category: "Engagement" },
      { name: "Lead/Contact Cross-Dupes", severity: "HIGH", category: "Data Quality" },
    ],
  },
  marketo: {
    id: "marketo",
    name: "Marketo Engage",
    productNoun: "instance",
    connectPath: "/connect/marketo",
    brandColor: "#5C4EE5",
    hoverColor: "#493BC7",
    recordScopes: [
      "Lead metadata",
      "Program metadata",
      "Campaign metadata",
      "Activity metadata",
    ],
    auditChecks: [
      { name: "Marketo API Connection", severity: "HIGH", category: "Data Quality" },
      { name: "Missing Acquisition Program", severity: "MEDIUM", category: "Attribution" },
      { name: "Unsubscribed or Invalid Leads", severity: "MEDIUM", category: "Engagement" },
      { name: "Inactive Smart Campaigns", severity: "LOW", category: "Engagement" },
    ],
  },
  marketing_cloud: {
    id: "marketing_cloud",
    name: "Marketing Cloud",
    productNoun: "business unit",
    connectPath: "/connect/marketing-cloud",
    brandColor: "#0B7FAB",
    hoverColor: "#096A8F",
    recordScopes: [
      "Account metadata",
      "Data extension metadata",
      "Journey metadata",
      "Subscriber status fields",
    ],
    auditChecks: [
      { name: "Marketing Cloud API Connection", severity: "HIGH", category: "Data Quality" },
      { name: "Suppressed or Held Subscribers", severity: "MEDIUM", category: "Engagement" },
      { name: "Inactive Journeys", severity: "LOW", category: "Engagement" },
      { name: "Data Extension Hygiene", severity: "MEDIUM", category: "Data Quality" },
    ],
  },
};

export const SUPPORTED_PLATFORMS = Object.values(PLATFORM_CONFIG);

export const PLATFORM_ROADMAP = [
  "Account Engagement",
  "Klaviyo",
  "ActiveCampaign",
];

export function getPlatformConfig(platform?: string | null) {
  if (platform === "salesforce") return PLATFORM_CONFIG.salesforce;
  if (platform === "marketo") return PLATFORM_CONFIG.marketo;
  if (platform === "marketing_cloud") return PLATFORM_CONFIG.marketing_cloud;
  return PLATFORM_CONFIG.hubspot;
}

export function getAllAuditChecks() {
  const checks = SUPPORTED_PLATFORMS.flatMap((platform) =>
    platform.auditChecks.map((check) => ({ ...check, platform: platform.name }))
  );

  return Array.from(new Map(checks.map((check) => [check.name, check])).values());
}
