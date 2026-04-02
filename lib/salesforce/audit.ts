import { CheckResult } from "@/types";
import { runSOQL } from "./api";

function toStatus(percentage: number, warnThreshold: number, failThreshold: number) {
  if (percentage >= failThreshold) return "fail" as const;
  if (percentage >= warnThreshold) return "warn" as const;
  return "pass" as const;
}

async function checkDuplicateLeads(portalId: string): Promise<CheckResult> {
  const totalRes = await runSOQL(portalId, "SELECT COUNT() FROM Lead");
  const total = totalRes.totalSize;

  const dupeRes = await runSOQL(
    portalId,
    "SELECT Email, COUNT(Id) total FROM Lead GROUP BY Email HAVING COUNT(Id) > 1"
  );
  const count = dupeRes.totalSize;
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return {
    checkName: "Duplicate Leads",
    severity: "high",
    count,
    percentage: Math.round(percentage * 100) / 100,
    status: toStatus(percentage, 2, 5),
    description: `Found ${count} duplicate lead email addresses across ${total} leads.`,
    fixSteps: [
      "Use Salesforce duplicate rules to prevent new duplicates",
      "Merge duplicate lead records manually or with a dedup tool",
      "Review lead import processes to prevent future duplicates",
    ],
  };
}

async function checkDuplicateContacts(portalId: string): Promise<CheckResult> {
  const totalRes = await runSOQL(portalId, "SELECT COUNT() FROM Contact");
  const total = totalRes.totalSize;

  const dupeRes = await runSOQL(
    portalId,
    "SELECT Email, COUNT(Id) total FROM Contact GROUP BY Email HAVING COUNT(Id) > 1"
  );
  const count = dupeRes.totalSize;
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return {
    checkName: "Duplicate Contacts",
    severity: "high",
    count,
    percentage: Math.round(percentage * 100) / 100,
    status: toStatus(percentage, 2, 5),
    description: `Found ${count} duplicate contact email addresses across ${total} contacts.`,
    fixSteps: [
      "Enable Salesforce duplicate management rules",
      "Merge duplicate contact records",
      "Set up matching rules to catch duplicates at creation",
    ],
  };
}

async function checkMissingLeadOwner(portalId: string): Promise<CheckResult> {
  const totalRes = await runSOQL(portalId, "SELECT COUNT() FROM Lead");
  const total = totalRes.totalSize;

  const res = await runSOQL(portalId, "SELECT COUNT() FROM Lead WHERE OwnerId = null");
  const count = res.totalSize;
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return {
    checkName: "Missing Lead Owner",
    severity: "high",
    count,
    percentage: Math.round(percentage * 100) / 100,
    status: toStatus(percentage, 10, 25),
    description: `${count} of ${total} leads have no assigned owner.`,
    fixSteps: [
      "Set up lead assignment rules in Salesforce Setup",
      "Use round-robin assignment for incoming leads",
      "Bulk assign orphaned leads via Data Loader",
    ],
  };
}

async function checkMissingLeadSource(portalId: string): Promise<CheckResult> {
  const totalRes = await runSOQL(portalId, "SELECT COUNT() FROM Lead");
  const total = totalRes.totalSize;

  const res = await runSOQL(portalId, "SELECT COUNT() FROM Lead WHERE LeadSource = null");
  const count = res.totalSize;
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return {
    checkName: "Missing Lead Source",
    severity: "medium",
    count,
    percentage: Math.round(percentage * 100) / 100,
    status: toStatus(percentage, 15, 30),
    description: `${count} of ${total} leads have no lead source set.`,
    fixSteps: [
      "Make LeadSource required on lead creation page layouts",
      "Set default lead source values in web-to-lead forms",
      "Backfill lead source for existing records where possible",
    ],
  };
}

async function checkStaleLeads(portalId: string): Promise<CheckResult> {
  const totalRes = await runSOQL(
    portalId,
    "SELECT COUNT() FROM Lead WHERE IsConverted = false"
  );
  const total = totalRes.totalSize;

  const res = await runSOQL(
    portalId,
    "SELECT COUNT() FROM Lead WHERE LastActivityDate < LAST_N_DAYS:30 AND IsConverted = false"
  );
  const count = res.totalSize;
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return {
    checkName: "Stale Leads (30d No Activity)",
    severity: "medium",
    count,
    percentage: Math.round(percentage * 100) / 100,
    status: toStatus(percentage, 20, 40),
    description: `${count} of ${total} open leads have had no activity in 30+ days.`,
    fixSteps: [
      "Create a report of stale leads and assign follow-up tasks",
      "Set up workflow alerts for leads with no activity in 14 days",
      "Consider archiving or recycling leads with no engagement",
    ],
  };
}

async function checkConvertedLeadsWithoutContact(portalId: string): Promise<CheckResult> {
  const totalRes = await runSOQL(
    portalId,
    "SELECT COUNT() FROM Lead WHERE IsConverted = true"
  );
  const total = totalRes.totalSize;

  const res = await runSOQL(
    portalId,
    "SELECT COUNT() FROM Lead WHERE IsConverted = true AND ConvertedContactId = null"
  );
  const count = res.totalSize;
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return {
    checkName: "Converted Leads Without Contact",
    severity: "high",
    count,
    percentage: Math.round(percentage * 100) / 100,
    status: toStatus(percentage, 5, 15),
    description: `${count} of ${total} converted leads have no associated contact record.`,
    fixSteps: [
      "Review lead conversion settings to require contact creation",
      "Manually create contacts for orphaned converted leads",
      "Check for data integrity issues in lead conversion process",
    ],
  };
}

async function checkMissingCampaignAttribution(portalId: string): Promise<CheckResult> {
  try {
    const totalRes = await runSOQL(portalId, "SELECT COUNT() FROM Lead");
    const total = totalRes.totalSize;

    const res = await runSOQL(
      portalId,
      "SELECT COUNT() FROM Lead WHERE Campaign__c = null"
    );
    const count = res.totalSize;
    const percentage = total > 0 ? (count / total) * 100 : 0;

    return {
      checkName: "Missing Campaign Attribution",
      severity: "low",
      count,
      percentage: Math.round(percentage * 100) / 100,
      status: toStatus(percentage, 30, 50),
      description: `${count} of ${total} leads have no campaign attribution.`,
      fixSteps: [
        "Add Campaign__c field to lead page layouts if missing",
        "Set up campaign member auto-association rules",
        "Review lead creation flows to include campaign tracking",
      ],
    };
  } catch {
    // Campaign__c field may not exist — skip gracefully
    return {
      checkName: "Missing Campaign Attribution",
      severity: "low",
      count: 0,
      percentage: 0,
      status: "pass",
      description: "Campaign__c field not found — skipped. Add a custom Campaign field to enable this check.",
      fixSteps: [],
    };
  }
}

async function checkOpenOppsNoActivity(portalId: string): Promise<CheckResult> {
  const totalRes = await runSOQL(
    portalId,
    "SELECT COUNT() FROM Opportunity WHERE IsClosed = false"
  );
  const total = totalRes.totalSize;

  const res = await runSOQL(
    portalId,
    "SELECT COUNT() FROM Opportunity WHERE LastActivityDate < LAST_N_DAYS:14 AND IsClosed = false"
  );
  const count = res.totalSize;
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return {
    checkName: "Open Opps No Activity (14d)",
    severity: "medium",
    count,
    percentage: Math.round(percentage * 100) / 100,
    status: toStatus(percentage, 20, 40),
    description: `${count} of ${total} open opportunities have had no activity in 14+ days.`,
    fixSteps: [
      "Create dashboards to highlight stale opportunities",
      "Set up task reminders for opportunities without recent activity",
      "Review pipeline hygiene practices with sales team",
    ],
  };
}

async function checkLeadContactCrossDupes(portalId: string): Promise<CheckResult> {
  const leadRes = await runSOQL(
    portalId,
    "SELECT Email FROM Lead WHERE Email != null"
  );
  const contactRes = await runSOQL(
    portalId,
    "SELECT Email FROM Contact WHERE Email != null"
  );

  const leadEmails = new Set(
    leadRes.records.map((r) => (r.Email as string).toLowerCase())
  );
  const contactEmails = new Set(
    contactRes.records.map((r) => (r.Email as string).toLowerCase())
  );

  let count = 0;
  leadEmails.forEach((email) => {
    if (contactEmails.has(email)) count++;
  });

  const total = leadEmails.size;
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return {
    checkName: "Lead/Contact Cross-Dupes",
    severity: "high",
    count,
    percentage: Math.round(percentage * 100) / 100,
    status: toStatus(percentage, 5, 15),
    description: `${count} lead emails also exist as contacts — potential duplicates across objects.`,
    fixSteps: [
      "Convert matching leads to contacts where appropriate",
      "Set up duplicate rules spanning Lead and Contact objects",
      "Review and clean up records that exist in both objects",
    ],
  };
}

export async function runAllChecks(portalId: string): Promise<CheckResult[]> {
  const results = await Promise.allSettled([
    checkDuplicateLeads(portalId),
    checkDuplicateContacts(portalId),
    checkMissingLeadOwner(portalId),
    checkMissingLeadSource(portalId),
    checkStaleLeads(portalId),
    checkConvertedLeadsWithoutContact(portalId),
    checkMissingCampaignAttribution(portalId),
    checkOpenOppsNoActivity(portalId),
    checkLeadContactCrossDupes(portalId),
  ]);

  return results
    .filter((r): r is PromiseFulfilledResult<CheckResult> => r.status === "fulfilled")
    .map((r) => r.value);
}
