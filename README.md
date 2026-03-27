# AuditBot

Automated HubSpot CRM hygiene monitoring by [Village Consulting](https://village-consulting.com).

## Tech Stack

- **Next.js 14** (App Router) + TypeScript
- **Supabase** (Postgres) for database
- **Tailwind CSS** for styling
- **HubSpot OAuth 2.0** + API v3
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
  supabase/             # Supabase client
types/                  # TypeScript types
```
