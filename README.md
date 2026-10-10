# Real Estate Management System — system notes

Complete working notes on an existing, in-production **property management system** built for a single small resort (10 rooms, four shareholders, one General Manager). These notes exist so the same product can be rebuilt as a **multi-tenant SaaS**.

The source system is a Next.js 16 + Supabase app. Everything below was written from reading its code and database schema on **10 October 2026** (source commit `9437ed4`). Nothing here is aspirational: where the current code is wrong, inconsistent or hard-coded, the notes say so, because those are exactly the points a SaaS rebuild has to decide on.

## Reading order

| # | File | What it answers |
|---|------|-----------------|
| 1 | [docs/01-overview.md](docs/01-overview.md) | What the product does, who uses it, module map, tech stack, design principles |
| 2 | [docs/02-architecture.md](docs/02-architecture.md) | How a request flows, auth and permissions, data access, every API route, integrations, storage, deployment |
| 3 | [docs/03-data-model.md](docs/03-data-model.md) | Every table and column, keys, indexes, seed data, SQL apply order, shared TypeScript types and constants |
| 4 | [docs/04-functional-spec.md](docs/04-functional-spec.md) | Every screen: what it reads, writes, calculates, filters and exports, with exact formulas |
| 5 | [docs/05-saas-requirements.md](docs/05-saas-requirements.md) | What has to change or be added to make this a SaaS: tenancy, auth, security, configuration, platform features, phasing |
| 6 | [docs/06-known-issues.md](docs/06-known-issues.md) | Bugs, inconsistencies and limitations in the current system, so they are not copied |
| 7 | [docs/07-runbook.md](docs/07-runbook.md) | How the current system is run: environment, database bootstrap, seeding, import/export, backups, deploy |
| — | [migrations/0001_initial_schema.sql](migrations/0001_initial_schema.sql) | One idempotent file that creates the complete database structure: all 26 tables, keys, constraints, indexes. No data |
| — | [reference/supabase-sql/](reference/supabase-sql/) | The original incremental SQL files, sanitised (placeholder names), kept only to show how the schema evolved |

## The product in one paragraph

A General Manager records guest bookings. Each booking can be flagged **Add to Revenue** (it becomes one row in the Revenue table, dated by check-out) and **Show on Legal page** (it appears in the lawyer's / accountant's report). Expenses are recorded with receipts, optionally OCR-read, and some are shared with Legal for review. The **Revenue table is the single source of truth** for every revenue figure on the Overview, the Shareholder Dashboard and the Budget page. Around that core sit occupancy, rooms (photos, inventory, fire-safety), tasks, staff hours, complaints, founding capital per shareholder, shareholder work hours, meetings, company documents and a small vault of third-party logins. Money is kept in Thai baht with a EUR display toggle fed by the ECB daily rate.

## What is deliberately not in this repo

- No secrets, project URLs, guest data or the client's company registration details.
- No real shareholder or staff names. The schema seed in `reference/` uses placeholders.
- No application code. The notes describe behaviour precisely enough to rebuild it; the SaaS should not inherit the current code's security model (see [docs/05](docs/05-saas-requirements.md)).
