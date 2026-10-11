# Real Estate Management System — SaaS

A mobile-first, multi-tenant **property management SaaS** for small hotels, resorts, villas and serviced apartments: bookings, occupancy, revenue, expenses with receipt scanning, legal review, budgets, partner reporting and day-to-day operations.

Built with **Next.js 16, Supabase (Postgres, Auth, Storage) and Tailwind CSS v4** in a burgundy theme. The product name is a placeholder (`lib/brand.ts`).

This repository also contains the complete system notes of the single-tenant application it replaces (`docs/01`–`07`), which define every formula and screen.

## Quick start

```bash
npm install
cp .env.example .env        # or keep the existing .env (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY)
npm run db:check            # verifies migrations and the storage bucket
npm run dev                 # http://localhost:3000
```

### Supabase setup (once per project)

1. SQL editor → run `migrations/0001_initial_schema.sql`, then `migrations/0002_saas_tenancy.sql` and `migrations/0003_plans_and_limits.sql` (idempotent; creates tenancy, roles, ledger, invoices, RLS, the private bucket).
2. Authentication → URL configuration → add `http://localhost:3000/auth/callback` and your production callback to **Redirect URLs**; set the Site URL.
3. Authentication → Providers → Email enabled (confirmation on or off, both work).
4. `.env`: add `OPENAI_API_KEY` (receipt scanning), `CREDENTIALS_ENCRYPTION_KEY` (login vault), `CRON_SECRET` (FX refresh) — see `.env.example`.
5. Run `npm run db:check`.

Sign up at `/signup` (you are signed in immediately; no email is sent unless `EMAIL_ENABLED=true`) and the onboarding wizard creates your organisation, first property, rooms, roles, accounts and payment methods.

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:check` | Checks the Supabase project (tables, bucket, auth settings) |
| `node scripts/seed-demo.mjs "<organisation name>" [--reset|--wipe]` | Fills one organisation with realistic demo data, or wipes it again |
| `node scripts/make-icons.mjs` | Regenerates the PWA icons |

## Documentation

| File | Content |
|------|---------|
| [docs/USER-GUIDE.md](docs/USER-GUIDE.md) | **How to use every feature**: step-by-step tutorial in plain language for owners, managers and staff |
| [docs/DEMO-TOUR.md](docs/DEMO-TOUR.md) | **Presenter's script** for a live demo, with links and what to click; jump list in [DEMO-TOUR-CONTENTS.md](docs/DEMO-TOUR-CONTENTS.md); designed page in [DEMO-TOUR.html](docs/DEMO-TOUR.html) (rebuild with `node scripts/build-tour-html.mjs`) |
| [docs/08-app-guide.md](docs/08-app-guide.md) | **How this application is built**: stack, layout, tenancy, module recipe, UI kit, mobile rules |
| [docs/01-overview.md](docs/01-overview.md) … [docs/07-runbook.md](docs/07-runbook.md) | Notes on the original single-tenant system: screens, formulas, data model, known issues, SaaS requirements |
| [migrations/](migrations/) | `0001` original structure, `0002` SaaS layer, `0003` plan limits (people and properties per workspace) |
| [lib/plans.ts](lib/plans.ts) | **Pricing and plan limits in one place** (per workspace, people included, price per extra person) |
| [reference/supabase-sql/](reference/supabase-sql/) | The original incremental SQL (history only) |

## Deployment

Vercel: import the repo, set the environment variables, deploy. `vercel.json` schedules the FX refresh on weekdays. Add the production URL to Supabase redirect URLs.
