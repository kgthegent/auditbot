# AuditBot

Automated CRM and marketing automation health monitoring by [Village Consulting](https://village-consulting.com).

## Tech Stack

- **Next.js 14** (App Router) + TypeScript
- **Supabase** (Postgres) for database
- **Tailwind CSS** for styling
- **HubSpot OAuth 2.0** + API v3
- **Salesforce OAuth 2.0** + REST/SOQL APIs
- **Stripe** for payments (wired up, not yet integrated)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Fill in your values:

- **HubSpot**: Create an app at developers.hubspot.com and grab your Client ID/Secret
- **Supabase**: Create a project at supabase.com and grab the URL + keys
- **Stripe**: Get keys from dashboard.stripe.com

### 3. Set up the database

Run the schema against your Supabase project:

```bash
# Copy the contents of lib/db/schema.sql and run in Supabase SQL Editor
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Supported Platforms

| Platform | Status | Coverage |
|----------|--------|----------|
| HubSpot | Live | Contacts, owners, lifecycle stages, source attribution |
| Salesforce | Live | Leads, contacts, opportunities, owners, activity, attribution |
| Marketo Engage | Beta connector | Server-to-server credential validation and lead metadata access |
| Salesforce Marketing Cloud | Beta connector | Installed Package credential validation and account API metadata access |
| Account Engagement, Klaviyo, ActiveCampaign | Roadmap | Planned marketing automation health checks |

Platform metadata lives in `lib/platforms.ts` so new systems can share connect UI, platform labels, access-scope copy, and audit catalog data.
Audit execution is routed through platform adapters in `lib/platform-adapters/`.

### Database migrations

If you already created the Supabase schema before Marketo and Marketing Cloud support, run:

```bash
lib/db/migrations/20260429_platform_credentials.sql
```

## Audit Checks

| Check | Severity | What it detects |
|-------|----------|-----------------|
| Duplicate Contacts | High | Contacts sharing the same email address |
| Missing Contact Owner | High | Contacts with no assigned owner |
| Missing Lifecycle Stage | Medium | Contacts with no lifecycle stage set |
| Unassigned New Leads (7d) | High | Recent contacts with no owner |
| UTM / Source Gaps | Low | Contacts with no analytics source or marked OFFLINE |

## Scoring

- Start at 100 points
- **High** severity fail: -20 pts
- **Medium** severity fail: -10 pts
- **Low** severity fail: -5 pts
- Warnings cost half the fail penalty

## Project Structure

```
app/                    # Next.js App Router pages
  api/                  # API routes (OAuth, audit)
  connect/              # HubSpot connection page
  dashboard/            # Audit dashboard + history
components/             # React components
lib/
  audit/                # Audit engine + scoring
  db/                   # Database schema
  hubspot/              # HubSpot OAuth client
  marketo/              # Marketo token and REST helpers
  marketing-cloud/      # Marketing Cloud token and REST helpers
  platform-adapters/    # Platform-specific audit adapter registry
  platforms.ts          # Supported platform registry + audit catalog metadata
  salesforce/           # Salesforce OAuth client + audit checks
  supabase/             # Supabase client
types/                  # TypeScript types
```
