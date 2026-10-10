# 07 — Runbook for the current system

How the existing app is set up, run and operated. Useful both for supporting it and for reproducing its behaviour in a test environment while the SaaS is built.

## Local development

```bash
cd web
npm install
# create web/.env.local with the four variables below
npm run dev        # http://localhost:3000
npm run build      # production build (runs tsc, not eslint)
npm run start -p 3111
npx tsc --noEmit
npx eslint .
```

Environment variables (names only; values live in Vercel and in each developer's `.env.local`):

| Name | Used by |
|------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | every Supabase call |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the shared client (browser and server) |
| `SUPABASE_SERVICE_ROLE_KEY` | upload route (preferred when set) |
| `GEMINI_API_KEY` | receipt OCR |

Node 20+ (Next 16 requirement); the project was last built on Node 24.

## Database bootstrap (fresh Supabase project)

1. Run [../migrations/0001_initial_schema.sql](../migrations/0001_initial_schema.sql) in the Supabase SQL editor; it creates the whole structure in one go. (The original incremental files and their order are listed in [03-data-model.md](03-data-model.md) for history. There is no migration tool.)
2. Create a public Storage bucket named `dms-files`.
3. Seed users with `node scripts/seed-users.js` after replacing its passwords, or create users from Settings once an Admin exists.
4. `role_permissions` needs no seed; missing rows mean allow. Use Settings → Role Permissions to restrict roles.
5. Rooms are seeded 1–10; rename or deactivate from Settings → Room Config.
6. Account balances are seeded at 0; set opening balances on the Overview.
7. Press the sidebar FX refresh once so `exchange_rates` holds a real ECB rate instead of the 37.0 seed.

## Deploying a change that needs a schema change

1. Write the SQL file into `web/supabase/` (idempotent: `add column if not exists`, `create index if not exists`).
2. Run it in the production SQL editor **first**.
3. Push the code to `master`; Vercel deploys automatically.
4. If the code goes live before the SQL, saves fail with "column does not exist".

## Data import, export, reset

- **Import**: Settings → Import Data accepts the legacy Excel workbook (sheets Guests, Expenses, Expenses Shared with Legal, Revenue, Founding, Shareholder Work, To Do, Budget - Rent, Budget - Revenue, Budget - Expenses). Rows are appended; expenses are de-duplicated by transaction number; imported guests arrive with Add to Revenue off.
- **Export**: Settings → Export Data gives an XLSX per table or all 13 tables; the page-level Export buttons give filtered XLSX/CSV/PDF/JSON.
- **Reset**: Settings → Reset Data deletes all rows of the 13 tables. On production this is destructive and not reversible; take a backup first.

## Backups and rollback

- There is no scheduled backup in the app. Supabase's own backups depend on the plan.
- A cheap full snapshot of any table: query PostgREST with the service key (`GET /rest/v1/<table>?select=*` with `Range: 0-99999`) and save the JSON. This was done before the revenue backfill in September 2026 (files kept outside git because they contain guest personal data).
- Rollback of a data change should be written as an explicit SQL script alongside the change (example: `rollback_guest_revenue_backfill.sql`).

## Bulk operations done so far (for history)

- September 2026: `guest_revenue_flow.sql` applied; then all existing bookings were ticked Add to Revenue and one revenue row per booking was inserted (`insert … select … on conflict (guest_id) do nothing`). Undo script exists.

## Users and roles

- Create users in Settings → User Management (username, display name, role, password ≥ 8).
- Roles: Admin, General Manager, Shareholder, Lawyer, Accountant, Staff. Admin and General Manager are unrestricted regardless of the permission matrix.
- A user resets their own password in Settings; Admin can reset anyone's.

## Mobile

- The app is installable: Chrome on Android → ⋮ → Install app; iOS Safari → Share → Add to Home Screen.
- Every form must be checked at phone width. A reproducible way without a device: start `next start` locally, mint a session cookie (possible only because the cookie is unsigned), drive headless Chrome over the DevTools protocol with device metrics 390×844, and capture screenshots. Once sessions are signed, log in through the API instead.

## Operational gotchas

- The FX rate only updates when someone presses the sidebar refresh.
- The GM dashboard's monthly revenue figure reads the newest 30 revenue rows only.
- The invoice link emailed to guests needs a login; send the PDF/print instead.
- Deleting an expense does not reverse the account balance; adjust the balance by hand.
- Room photos uploaded from the room page land in the `expenses/` storage folder.
- Tailwind v4 needs Chrome 111+; an outdated tablet browser shows broken styling, not a bug in the app.
