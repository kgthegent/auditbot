import { CheckResult, ExampleRecord } from "@/types";
import { runChecks } from "@/lib/audit/completeness";
import { getSalesforceInstanceUrl, runSOQL, salesforceRecordUrl } from "./api";

function toStatus(percentage: number, warnThreshold: number, failThreshold: number) {
  if (percentage >= failThreshold) return "fail" as const;
  if (percentage >= warnThreshold) return "warn" as const;
  return "pass" as const;
}

function affectedPercentage(count: number, total: number) {
  // Counts are queried separately. If permissions, concurrent changes, or a
  // malformed provider response make them inconsistent, do not score them.
  if (
    !Number.isSafeInteger(count) ||
    !Number.isSafeInteger(total) ||
    count < 0 ||
    total < 0 ||
    count > total
  ) {
    throw new Error("Salesforce affected count is inconsistent with the audited population");
  }
  return total > 0 ? (count / total) * 100 : 0;
}

function escapeSoqlString(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function duplicateRecordCount(records: Record<string, unknown>[], total: number) {
  const count = records.reduce((sum, record) => {
    if (
      typeof record.Email !== "string" ||
      !record.Email.trim() ||
      !Number.isSafeInteger(record.total) ||
      (record.total as number) < 2
    ) {
      throw new Error("Invalid Salesforce duplicate-email aggregate");
    }
    return sum + (record.total as number);
  }, 0);
  if (!Number.isSafeInteger(count) || count > total) {
    throw new Error("Salesforce duplicate counts exceed the record population");
  }
  return count;
}

function recordLabel(record: Record<string, unknown>) {
  return String(record.Name || record.Subject || record.Email || record.Id || "Salesforce record");
}

function mapRecordExample(
  record: Record<string, unknown>,
  objectApiName: string,
  instanceUrl: string,
  detailFields: string[] = []
): ExampleRecord {
  return {
    id: String(record.Id),
    label: recordLabel(record),
    detail: detailFields
      .map((field) => record[field])
      .filter(Boolean)
      .map(String)
      .join(" · "),
    url: salesforceRecordUrl(instanceUrl, objectApiName, record.Id),
  };
}

async function duplicateExamples(
  portalId: string,
  objectApiName: "Lead" | "Contact",
  duplicateEmails: unknown[]
) {
  const emails = duplicateEmails
    .filter((email): email is string => typeof email === "string" && email.length > 0)
    .slice(0, 5);

  if (emails.length === 0) return [];

  const instanceUrl = await getSalesforceInstanceUrl(portalId);
  const quotedEmails = emails.map((email) => `'${escapeSoqlString(email)}'`).join(", ");
  const sampleRes = await runSOQL(
    portalId,
    `SELECT Id, Name, Email FROM ${objectApiName} WHERE Email IN (${quotedEmails}) LIMIT 5`
  );

  return sampleRes.records.map((record) =>
    mapRecordExample(record, objectApiName, instanceUrl, ["Email"])
  );
}

async function sampleRecords(
  portalId: string,
  objectApiName: "Lead" | "Contact" | "Opportunity",
  where: string,
  fields: string[],
  detailFields: string[]
) {
  const instanceUrl = await getSalesforceInstanceUrl(portalId);
  const sampleRes = await runSOQL(
    portalId,
    `SELECT Id, Name, ${fields.join(", ")} FROM ${objectApiName} WHERE ${where} LIMIT 5`
  );

  return sampleRes.records.map((record) =>
    mapRecordExample(record, objectApiName, instanceUrl, detailFields)
  );
}

async function checkDuplicateLeads(portalId: string): Promise<CheckResult> {
  const totalRes = await runSOQL(portalId, "SELECT COUNT() FROM Lead");
  const total = totalRes.totalSize;

  const dupeRes = await runSOQL(
    portalId,
    "SELECT Email, COUNT(Id) total FROM Lead WHERE Email != null GROUP BY Email HAVING COUNT(Id) > 1"
  );
  const count = duplicateRecordCount(dupeRes.records, total);
  const percentage = affectedPercentage(count, total);
  const examples = await duplicateExamples(
    portalId,
    "Lead",
    dupeRes.records.map((record) => record.Email)
  );

  return {
    checkName: "Duplicate Leads",
    severity: "high",
    count,
    percentage: Math.round(percentage * 100) / 100,
    status: toStatus(percentage, 2, 5),
    description: `${count} of ${total} leads share an email address with another lead, across ${dupeRes.records.length} duplicate email groups. Leads without an email are excluded from duplicate groups.`,
    fixSteps: [
      "Use Salesforce duplicate rules to prevent new duplicates",
      "Merge duplicate lead records manually or with a dedup tool",
      "Review lead import processes to prevent future duplicates",
    ],
    exampleRecords: examples,
  };
}

async function checkDuplicateContacts(portalId: string): Promise<CheckResult> {
  const totalRes = await runSOQL(portalId, "SELECT COUNT() FROM Contact");
  const total = totalRes.totalSize;

  const dupeRes = await runSOQL(
    portalId,
    "SELECT Email, COUNT(Id) total FROM Contact WHERE Email != null GROUP BY Email HAVING COUNT(Id) > 1"
  );
  const count = duplicateRecordCount(dupeRes.records, total);
  const percentage = affectedPercentage(count, total);
  const examples = await duplicateExamples(
    portalId,
    "Contact",
    dupeRes.records.map((record) => record.Email)
  );

  return {
    checkName: "Duplicate Contacts",
    severity: "high",
    count,
    percentage: Math.round(percentage * 100) / 100,
    status: toStatus(percentage, 2, 5),
    description: `${count} of ${total} contacts share an email address with another contact, across ${dupeRes.records.length} duplicate email groups. Contacts without an email are excluded from duplicate groups.`,
    fixSteps: [
      "Enable Salesforce duplicate management rules",
      "Merge duplicate contact records",
      "Set up matching rules to catch duplicates at creation",
    ],
    exampleRecords: examples,
  };
}

async function checkMissingLeadOwner(portalId: string): Promise<CheckResult> {
  const totalRes = await runSOQL(portalId, "SELECT COUNT() FROM Lead");
  const total = totalRes.totalSize;

  const res = await runSOQL(portalId, "SELECT COUNT() FROM Lead WHERE OwnerId = null");
  const count = res.totalSize;
  const percentage = affectedPercentage(count, total);
  const examples = await sampleRecords(
    portalId,
    "Lead",
    "OwnerId = null",
    ["Company", "Email", "CreatedDate"],
    ["Company", "Email"]
  );

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
    exampleRecords: examples,
  };
}

async function checkMissingLeadSource(portalId: string): Promise<CheckResult> {
  const totalRes = await runSOQL(portalId, "SELECT COUNT() FROM Lead");
  const total = totalRes.totalSize;

  const res = await runSOQL(portalId, "SELECT COUNT() FROM Lead WHERE LeadSource = null");
  const count = res.totalSize;
  const percentage = affectedPercentage(count, total);
  const examples = await sampleRecords(
    portalId,
    "Lead",
    "LeadSource = null",
    ["Company", "Email", "CreatedDate"],
    ["Company", "Email"]
  );

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
    exampleRecords: examples,
  };
}

async function checkStaleLeads(portalId: string): Promise<CheckResult> {
  const where = "IsConverted = false AND (LastActivityDate < LAST_N_DAYS:30 OR (LastActivityDate = null AND CreatedDate < LAST_N_DAYS:30))";
  const totalRes = await runSOQL(
    portalId,
    "SELECT COUNT() FROM Lead WHERE IsConverted = false"
  );
  const total = totalRes.totalSize;

  const res = await runSOQL(
    portalId,
    `SELECT COUNT() FROM Lead WHERE ${where}`
  );
  const count = res.totalSize;
  const percentage = affectedPercentage(count, total);
  const examples = await sampleRecords(
    portalId,
    "Lead",
    where,
    ["Company", "Email", "LastActivityDate"],
    ["Company", "LastActivityDate"]
  );

  return {
    checkName: "Stale Leads (30d No Activity)",
    severity: "medium",
    count,
    percentage: Math.round(percentage * 100) / 100,
    status: toStatus(percentage, 20, 40),
    description: `${count} of ${total} open leads have had no activity in 30+ days, including leads created more than 30 days ago with no recorded activity.`,
    fixSteps: [
      "Create a report of stale leads and assign follow-up tasks",
      "Set up workflow alerts for leads with no activity in 14 days",
      "Consider archiving or recycling leads with no engagement",
    ],
    exampleRecords: examples,
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
  const percentage = affectedPercentage(count, total);
  const examples = await sampleRecords(
    portalId,
    "Lead",
    "IsConverted = true AND ConvertedContactId = null",
    ["Company", "Email", "ConvertedDate"],
    ["Company", "ConvertedDate"]
  );

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
    exampleRecords: examples,
  };
}

async function checkMissingCampaignAttribution(portalId: string): Promise<CheckResult> {
  // CampaignMember is the standard Salesforce relationship. Campaign__c is an
  // optional custom field and cannot be assumed to exist in every organization.
  const where = "Id NOT IN (SELECT LeadId FROM CampaignMember WHERE LeadId != null)";
  const totalRes = await runSOQL(portalId, "SELECT COUNT() FROM Lead");
  const total = totalRes.totalSize;
  const res = await runSOQL(portalId, `SELECT COUNT() FROM Lead WHERE ${where}`);
  const count = res.totalSize;
  const percentage = affectedPercentage(count, total);
  const examples = await sampleRecords(
    portalId,
    "Lead",
    where,
    ["Company", "Email", "CreatedDate"],
    ["Company", "Email"]
  );

  return {
    checkName: "Missing Campaign Attribution",
    severity: "low",
    count,
    percentage: Math.round(percentage * 100) / 100,
    status: toStatus(percentage, 30, 50),
    description: `${count} of ${total} leads have no campaign membership. This checks standard CampaignMember records, not custom attribution fields.`,
    fixSteps: [
      "Add relevant leads to their Salesforce campaigns",
      "Set up campaign member auto-association rules",
      "Review lead creation flows to include campaign tracking",
    ],
    exampleRecords: examples,
  };
}

async function checkOpenOppsNoActivity(portalId: string): Promise<CheckResult> {
  const where = "IsClosed = false AND (LastActivityDate < LAST_N_DAYS:14 OR (LastActivityDate = null AND CreatedDate < LAST_N_DAYS:14))";
  const totalRes = await runSOQL(
    portalId,
    "SELECT COUNT() FROM Opportunity WHERE IsClosed = false"
  );
  const total = totalRes.totalSize;

  const res = await runSOQL(
    portalId,
    `SELECT COUNT() FROM Opportunity WHERE ${where}`
  );
  const count = res.totalSize;
  const percentage = affectedPercentage(count, total);
  const examples = await sampleRecords(
    portalId,
    "Opportunity",
    where,
    ["Amount", "StageName", "CloseDate", "LastActivityDate"],
    ["StageName", "CloseDate"]
  );

  return {
    checkName: "Open Opps No Activity (14d)",
    severity: "medium",
    count,
    percentage: Math.round(percentage * 100) / 100,
    status: toStatus(percentage, 20, 40),
    description: `${count} of ${total} open opportunities have had no activity in 14+ days, including opportunities created more than 14 days ago with no recorded activity.`,
    fixSteps: [
      "Create dashboards to highlight stale opportunities",
      "Set up task reminders for opportunities without recent activity",
      "Review pipeline hygiene practices with sales team",
    ],
    exampleRecords: examples,
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
  const percentage = affectedPercentage(count, total);

  return {
    checkName: "Lead/Contact Cross-Dupes",
    severity: "high",
    count,
    percentage: Math.round(percentage * 100) / 100,
    status: toStatus(percentage, 5, 15),
    description: `${count} of ${total} distinct non-empty lead email addresses also exist on contacts; these are potential duplicates across objects.`,
    fixSteps: [
      "Convert matching leads to contacts where appropriate",
      "Set up duplicate rules spanning Lead and Contact objects",
      "Review and clean up records that exist in both objects",
    ],
  };
}

export async function runAllChecks(portalId: string): Promise<CheckResult[]> {
  return runChecks([
    { name: "Duplicate Leads", run: () => checkDuplicateLeads(portalId) },
    { name: "Duplicate Contacts", run: () => checkDuplicateContacts(portalId) },
    { name: "Missing Lead Owner", run: () => checkMissingLeadOwner(portalId) },
    { name: "Missing Lead Source", run: () => checkMissingLeadSource(portalId) },
    { name: "Stale Leads (30d No Activity)", run: () => checkStaleLeads(portalId) },
    { name: "Converted Leads Without Contact", run: () => checkConvertedLeadsWithoutContact(portalId) },
    { name: "Missing Campaign Attribution", run: () => checkMissingCampaignAttribution(portalId) },
    { name: "Open Opps No Activity (14d)", run: () => checkOpenOppsNoActivity(portalId) },
    { name: "Lead/Contact Cross-Dupes", run: () => checkLeadContactCrossDupes(portalId) },
  ]);
}
