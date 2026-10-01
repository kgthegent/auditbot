# AuditBot / StackAudit

A Next.js 14 + TypeScript CRM audit prototype by [Village Consulting](https://village-consulting.com), using Supabase Postgres and Tailwind CSS. Treat this as a prototype, not a certified or production-ready assessment.

## What actually works

| Platform | Implementation in this branch | Public UI |
| --- | --- | --- |
| HubSpot | OAuth and five contact checks, saved reports, history and workflow annotations | HubSpot-only |
| Salesforce | OAuth and nine SOQL-based checks exist in the code; require a configured connected app and suitable object/field access | Experimental; not exposed by launch UI |
| Marketo Engage | Credential/connectivity validation and lead metadata only | Not a health audit |
| Salesforce Marketing Cloud | Credential/token validation only | Not a health audit |

Marketo and Marketing Cloud audit adapters explicitly refuse to produce a health score. A successful connection does not establish data health. `lib/platforms.ts` currently exports only HubSpot metadata. `NEXT_PUBLIC_ENABLE_MULTI_PLATFORM=true` removes the middleware gate on experimental connector routes, but does not make their UI metadata or audits production-ready. Keep it disabled for the launch UI. Payment checkout/portal/webhook code is present, but requires configured Stripe products, keys and end-to-end validation.

## Checks and limitations

HubSpot checks contacts for shared primary email addresses, missing owner, missing lifecycle stage, unassigned contacts created in the last seven days, and missing/offline analytics source. The source check is a heuristic, not validation of every UTM field. Duplicate scans follow every contact-list page (up to 100,000 records, after which the audit fails explicitly), normalize case/whitespace and report the number of affected contacts and duplicate email groups. They do not match aliases, secondary emails, names or companies. Example records are limited to five; this does not limit the scan. Non-duplicate checks use provider search totals, which can lag changes; an inconsistent numerator/denominator fails rather than publishing a misleading percentage. API reads are not a transactional snapshot.

Salesforce checks duplicate Lead/Contact email groups, missing lead owner/source, stale unconverted leads, converted leads without a contact, missing campaign membership, stale open opportunities and shared Lead/Contact emails. Queries operate within the connected user's visibility. Owner-null checks have limited value because Salesforce normally requires ownership. Campaign membership is a proxy for attribution, not a full attribution model. Aggregate-query/provider limits or missing permissions make the audit unavailable rather than clean. Salesforce remains experimental and has not been verified against a live org here.

## Completeness and scoring

A score is published only when all required checks succeed and results plus completion are saved. Any failed check returns an explicit incomplete-audit error with its name and no score; provider bodies/tokens are not exposed. Empty result sets cannot be scored. Weekly jobs do not send a success digest after failed checks or failed persistence. Incomplete records from failed saves are excluded from history and cannot be viewed as completed reports.

For complete audits: start at 100; high/medium/low failures deduct 20/10/5 points; warnings deduct half rounded down; minimum zero. A valid empty CRM can score 100, but that means these checks found no issues, not that a meaningful dataset was assessed. Older reports created before these fixes may already contain incomplete or sampled scores; rerun them. No historical scores are rewritten automatically.

## Remaining release blockers

- The pinned Next.js **14.2.35** dependency tree still has npm-audit findings: Next.js (critical) and its PostCSS dependency (high). The [AVIF image optimization advisory](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4) lists 15.5.24 / 16.3.3 as fixes; exploitability depends on image-optimization usage. A separate [Windows-hosting advisory](https://github.com/advisories/GHSA-p293-qw3h-jr36) is platform-specific. Registry verification on September 30, 2026 found 14.2.35 is the newest 14.x release, so there is no newer compatible 14.x patch listed for those advisories. This patch updates compatible `ws`/`nanoid` transitive dependencies but does **not** migrate the framework to a new major. Upgrade and regression-test before public deployment; rerun `npm audit --omit=dev` against the final lockfile.
- HubSpot's adapter does not yet automatically refresh expired access tokens. Reconnect when the provider returns an authentication failure; unattended weekly audits need token-refresh handling before relying on them.
- HubSpot search requests are concurrent and can hit provider rate limits; there is no bounded retry/backoff or shared request throttle yet. Such runs now fail explicitly and produce no score. Retry after the limit clears; larger portals also need background-job execution rather than relying on an HTTP request's runtime budget.
- Live provider OAuth, mail delivery, Stripe and database migrations still need staging verification. No live customer data was used to validate this patch.

## Local setup

1. Install Node.js 20.19+ and run `npm ci`.
2. Copy `.env.example` to `.env.local` and configure Supabase and provider credentials. Never commit the populated file.
3. Set a dedicated, cryptographically random `SESSION_SECRET` of at least 32 bytes (for example, generate it locally with `openssl rand -hex 32`). Do not reuse a provider secret. Rotating it invalidates sessions and pending signed verification context.
4. Run `lib/db/schema.sql` for a fresh database. For an existing database, inspect and apply the applicable SQL files under `lib/db/migrations/` in date order. The app uses the service-role key on the server; keep it private and retain RLS.
5. Configure OAuth callback URLs for the local/deployed origin and configure email delivery for magic-link sign-in and email verification.
6. Run `npm run dev` and open http://localhost:3000.

Sessions are HMAC-signed, expire after 30 days and bind immutable user IDs. Legacy unsigned `sa_email` cookies are not accepted: existing users must reconnect or sign in again. An email address submitted in a form is not proof of account ownership. Do not expose this app until secure session configuration and provider/email flows have been validated in your deployment.

## Verification

```sh
npm test
npm run lint
npm run typecheck
npm run build
```

Tests use synthetic records and mocked provider responses; they do not contact customer CRMs. The build requires syntactically valid Supabase settings and a Stripe API key because these clients are initialized during route collection. CI uses non-secret, nonfunctional fixture values and never makes real provider requests. Tests are not a substitute for staging OAuth, email delivery, migrations, Stripe and real provider pagination/rate-limit checks. No migration, production deployment, payment or real audit is performed by the test suite.

## Structure

- `app/api/`: OAuth, account, audit, report, billing and scheduled endpoints
- `app/dashboard/`, `components/`: results, history and cleanup workflow UI
- `lib/auth/`: signed sessions and email identity helpers
- `lib/audit/`: HubSpot checks, fail-closed execution and scoring
- `lib/platform-adapters/`: provider dispatch and audit capability boundaries
- `lib/salesforce/`: OAuth, SOQL client and experimental checks
- `lib/marketo/`, `lib/marketing-cloud/`: connectivity helpers
- `lib/db/`: schema and migrations
- `tests/`: security and audit regression fixtures
