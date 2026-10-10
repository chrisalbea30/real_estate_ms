# 05 — What a SaaS version needs

This is the gap between the current single-tenant app and a product that many property operators can sign up for. It is organised as: what must change (non-negotiable), what must be added, what to keep, and a suggested order of work.

## A. Must change (security and tenancy foundations)

### A1. Authentication
Current: custom `users` table, bcrypt, **unsigned base64 cookie** that anyone can forge; no password reset, no MFA, no rate limiting.

Needed:
- Supabase Auth (or an equivalent IdP): email + password, magic link, optional Google/Microsoft SSO, MFA for admins, password reset emails, email verification.
- Sessions issued and verified by the auth provider (JWT), never built by the app.
- Invitations: an org admin invites a user by email with a role; the user accepts and joins the org.
- Audit of sign-ins; lockout or throttling on repeated failures.

### A2. Multi-tenancy
Current: no organisation concept; every table is global; unique constraints are global (`rooms.number`, `users.username`, `account_balances.account_type`, …).

Needed:
- `organizations` (tenant) → `properties` (a tenant can own several sites) → `rooms`/units.
- `memberships(user_id, organization_id, role)`; a user can belong to several orgs.
- `organization_id` (and `property_id` where it matters) on every business table; all unique constraints and indexes scoped by it.
- Row-level security **on** for every table, with policies derived from the caller's memberships. No table readable or writable by `anon`.
- The service-role key only on the server, never in a browser bundle; browser calls go through RLS with the user's JWT.
- Storage: a **private** bucket with per-tenant prefixes (`org/<id>/…`), signed URLs with expiry, and policies; delete objects when records are deleted or replaced.
- Tenant-aware background jobs (FX refresh per currency pair in use, reminders).

### A3. Authorisation enforced server-side
Current: view is enforced on the server; add/edit/delete only hide buttons; the browser can write anything.

Needed:
- Permission checks inside RLS policies or in a server API layer (Next.js route handlers / server actions with validation), never only in the UI.
- A per-tenant role model: a few built-in templates (Owner, Manager, Finance, Legal, Staff, Viewer) plus editable permissions per module and action, stored per organization. No role should be unconditionally unrestricted in code; "Owner" is just a template with everything on.
- Row-level rules as data (for example "Staff can see tasks assigned to them"), not string comparisons against a hard-coded "General Manager".

### A4. Secrets and sensitive data
- Drop or redesign the "stored web credentials" module: either encrypt with a KMS-backed key per tenant and never export, or remove it. Plaintext passwords in a shared table are a liability.
- Passport numbers, emails and phone numbers are personal data: field-level access control, export redaction, retention policy, and a way to delete a guest on request.
- No default passwords in scripts. Seed through invitations.

### A5. Data integrity
- Foreign keys everywhere: bookings → rooms (by id), contributions/work/tasks/meetings → people (a `partners` or `members` table), expenses → payer, budget rows → rooms.
- Lookup tables or CHECK constraints for every status/category list; defaults in the database and in the UI must agree.
- Money: numeric(14,2) plus a currency column per amount, or integer minor units; no currency in column names.
- Dates: keep `date` for stay dates but store a tenant timezone and compute "today" and month boundaries in it on the server; timestamps as `timestamptz`.
- `updated_at` via trigger; `created_by` / `updated_by`; soft delete where history matters (bookings, expenses, revenue).
- Account balances as a **ledger** (one row per movement, balance = sum or a materialised running total) instead of read-modify-write from the browser.
- Revenue sync and balance movements inside a database function or server action in one transaction, not as a chain of client calls.
- Sequential invoice numbers per tenant per year (a sequence or a counter row with row locking), and invoices stored as records (number, issued date, amounts, PDF/HTML snapshot).

## B. Must add (platform features)

| Area | Needed for a SaaS |
|------|-------------------|
| Onboarding | Sign-up, create organisation, add first property, add rooms, choose currency/timezone/VAT, invite team, optional import |
| Configuration per tenant | Branding (name, logo, colours), invoice legal details and numbering format, VAT rate and whether prices include VAT, base currency and display currencies, payment methods and the accounts they map to, expense/revenue/task/complaint/document categories, booking sources (OTAs), partners/shareholders with ownership %, hourly rates, alert thresholds (fire-safety days, arrivals window), external links (immigration portal only for Thai tenants), fiscal year start |
| Billing | Plans (by properties or rooms), trial, Stripe subscriptions, invoices, feature flags per plan, usage limits (storage) |
| Import | Generic CSV mapping wizard for guests, expenses, revenue; keep a one-off importer for the original Excel layout only if migrating the first customer |
| Export and backups | Per-tenant full export (all tables + files); scheduled backups; a documented restore |
| Notifications | Email (invoice to guest via a signed public link, task due, fire-extinguisher expiry, legal review requested); optional push via a service worker |
| Audit log | Who changed what and when on every business table; visible to tenant owners |
| Public guest-facing bits | A public, tokenised invoice link (no login); optionally a booking confirmation email |
| Reporting | The existing dashboards per property and consolidated per organisation; date-range pickers instead of hard-coded year lists; currency-aware sums (convert at the transaction date's rate, not a fixed 37) |
| Internationalisation | UI strings, number and date formats per tenant locale; THB/EUR becomes "base + any display currencies" |
| Mobile | Keep mobile-first forms and PWA install; add a service worker for cache and push |
| Operations | Staging environment, CI running tsc/eslint/tests, error tracking, structured logs, rate limiting on APIs, health checks |
| Testing | Unit tests for every formula in 04-functional-spec; integration tests for RLS policies (a user from org A cannot read org B); end-to-end tests for the Guest → Revenue → Legal flow |

## C. Keep (the product's substance)

These are what the customer actually values and should carry over largely unchanged:

1. The **Guest → Revenue → Legal → Shareholder** flow with the two independent checkboxes, one revenue row per booking, check-out dating, Total Stay as amount, read-only guest rows on the Revenue page, and no double listing on Legal.
2. **Revenue as the single source of truth** for every dashboard.
3. The **account balance** idea (cash position by account, moved by payments and expenses, "no receipt" exposure), rebuilt as a ledger.
4. The **Legal review workflow** (Pending / Accepted / Clarification Needed / Rejected with notes and dates) and the Legal report with CSV and print.
5. **Expense capture with receipt OCR** and automatic numbering.
6. **Occupancy calendar, KPIs (occupancy, ADR, RevPAR, average stay), forecast**, with the night-counting and pro-rating bugs fixed.
7. **Budget vs actual** with OPEX/CAPEX, revenue matrix and rent schedule, with budget categories linked to expense categories instead of matched by name.
8. **Shareholder/partner module**: contributions, ownership %, nominal vs paid, work hours, meetings, profiles, as one `partners` concept instead of three tables and a constant.
9. **Operations**: tasks with assignee visibility, staff hours, complaints, room inventory and fire-safety expiry alerts, document archive.
10. **Exports** everywhere, and the GM dashboard's "today" view.

## D. Suggested order of work

**Phase 0 — Foundations (no customer-visible features)**
Auth provider; organisations, properties, memberships; RLS policies and tests; tenant settings table; server-side API/validation layer (zod schemas); ledger and sequences; file storage with signed URLs; CI.

**Phase 1 — Core property operations**
Rooms, guests/bookings (with invoice as a record and public link), occupancy, revenue (auto + manual), expenses (OCR, attachments), accounts/ledger, Overview and GM dashboard.

**Phase 2 — Finance and reporting**
Legal workflow and report, budget module, Shareholder/partner module (contributions, ownership, work, meetings, profiles), Shareholder dashboard, currency handling with historical rates.

**Phase 3 — Operations extras**
Tasks, staff hours, complaints, documents, room inventory and fire-safety, notifications.

**Phase 4 — SaaS platform**
Onboarding wizard, billing and plans, import wizard, audit log, per-tenant export/backup, internationalisation, admin console for the SaaS operator.

## E. Decisions to make early

1. Supabase Auth with RLS versus a conventional server API in front of Postgres. RLS keeps the "browser talks to the database" simplicity but every rule must be expressible as a policy; an API layer is more work but easier to test and to add validation to. A hybrid (RLS on, writes via server actions) is a reasonable default.
2. Organisation → property hierarchy from day one (recommended) or single property per organisation (simpler, painful later).
3. Whether "shareholders" is a hospitality concept worth generalising to "partners/investors" or should become an optional module.
4. Whether to keep the stored-credentials module at all.
5. Which markets first: the TM30, VAT-inclusive pricing and THB defaults are Thailand-specific and should be tenant settings, not assumptions.
6. Pricing basis: per property, per room, or per user.
