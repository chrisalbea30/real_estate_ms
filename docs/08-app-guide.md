# 08 — Application guide (the SaaS rebuild)

How the Next.js application in this repository is put together, and the conventions every module follows. Read this before adding or changing a module.

## Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router, Turbopack, `proxy.ts`), React 19, TypeScript 5 |
| Styling | Tailwind CSS v4 with a burgundy design-token theme in `app/globals.css` (light + dark) |
| Database | Supabase Postgres with row-level security on every table (`migrations/0002_saas_tenancy.sql`) |
| Auth | Supabase Auth (email + password; sign-up is instant and no email is sent unless `EMAIL_ENABLED=true` with SMTP configured in Supabase) via `@supabase/ssr` |
| Storage | One private bucket `tenant-files`, paths `org/<orgId>/<module>/<file>`, signed links |
| AI | OpenAI vision model for receipt OCR (`/api/ocr`) |
| FX | ECB daily rates for every currency, stored in `exchange_rates` (`/api/cron/fx`) |
| Exports | CSV, JSON, Excel (`write-excel-file`), print-to-PDF |

## Directory layout

```
app/
  (marketing)/        landing page, privacy, terms
  (auth)/             login, signup, forgot-password, reset-password (+ actions.ts)
  auth/callback       email link handler;  auth/signout
  onboarding/         create organisation (+ actions.ts)
  invite/[token]      accept an invitation
  i/[token]           public invoice (no login)
  (app)/app/          the product. layout.tsx resolves the tenant context and renders the shell
    <module>/page.tsx          server component: pageContext() + data fetch → <ModuleClient>
    <module>/actions.ts        'use server' actions: zod parse → requirePerm → supabase → revalidate
  api/files/[...path] signed-URL redirect for stored files
  api/ocr             receipt OCR
  api/cron/fx         FX refresh
components/
  ui/                 design-system primitives (see below)
  app/                AppProvider (client context) + AppShell (sidebar, top bar, bottom nav)
  <module>/           client components of a module
lib/
  context.ts          getAppContext / requireContext / requirePerm (server)
  page.ts             pageContext(module) for server pages
  actions.ts          ActionResult, run(), must(), mustOk()
  modules.ts          module registry (keys, labels, routes, icons, groups, phone tabs)
  types.ts            row types for every table
  format.ts           money, dates (string based), nights, months
  currency.ts         rate table and conversion
  storage.ts          bucket name, path builder, fileHref()
  schemas/<module>.ts zod schemas shared by client and server
migrations/           SQL, applied by hand in the Supabase SQL editor (0001 then 0002)
docs/                 these notes
```

## Request flow

1. `proxy.ts` refreshes the Supabase session cookie, redirects signed-out users away from `/app`, and forwards the pathname in the `x-pathname` header.
2. `app/(app)/app/layout.tsx` calls `getAppContext()` (user, memberships, current organisation and property from cookies, role and permissions), gates the module by `can(module,'view')`, loads the shared snapshot (rates, payment methods, rooms, partners, members) and renders `<AppProvider>` + `<AppShell>`.
3. A module page (server component) calls `pageContext('<module>')`, fetches its rows with the user's Supabase client (RLS applies) and passes them to a client component.
4. The client component owns UI state and calls server actions. Server actions validate with zod, check the permission again with `requirePerm`, write through the user's client (RLS is the backstop), `revalidatePath`, and return `ActionResult`.
5. After a successful action the client calls `router.refresh()` so the server component re-fetches.

Database triggers keep invariants: a booking flagged *Add to revenue* always has exactly one revenue row; guest payments and expenses post ledger movements; `updated_at`; audit log.

## Tenancy and permissions

* Every business row has `organization_id`; property-scoped rows also have `property_id`. The current property comes from `ctx.property`.
* Roles are per organisation (`org_roles.permissions` = `{ module: { view, add, edit, delete } }`). Templates: Owner, Manager, Finance, Legal, Partner, Staff, Viewer. Missing = denied.
* Server: `requirePerm('expenses', 'edit')`. Client: `const { can } = useApp(); can('expenses', 'edit')` to hide buttons.
* RLS policies mirror the same matrix (see `migrations/0002` §8). Cross-module reads needed by dashboards are granted explicitly there; if a page needs a new cross-module read, add a policy.

## Module recipe (copy `rooms` for simple CRUD, `guests` for a complex form)

1. `lib/schemas/<module>.ts` — zod schema; use `ymd`, `ymdOptional`, `money`, `optText` from `lib/schemas/guests.ts`. Strings from inputs arrive as strings; coerce numbers.
2. `app/(app)/app/<route>/actions.ts` — `'use server'`; one `save<Thing>Action(input)` (insert when no id, update when id) and one `delete<Thing>Action(id)`; wrap bodies in `run(async () => { ... })`; use `must()` / `mustOk()` on Supabase responses; always filter updates and deletes by `.eq('organization_id', ctx.org.id)`; set `organization_id` (and `property_id` when the table has it) on insert; call `revalidatePath()` for the pages that show the data.
3. `app/(app)/app/<route>/page.tsx` — `export const metadata`, `const ctx = await pageContext('<module>')`, fetch, render the client component.
4. `components/<module>/<Module>Client.tsx` — `'use client'`; `PageHeader`, optional `StatGrid`, `DataTable` with `renderCard` (phone) and `columns` (desktop), a `Modal` form.

### Form conventions
* Keep form state as strings (`''` for empty) in one `useState` object; convert on the server.
* Re-initialise the form when a different record is opened using the `key` pattern in `RoomModal` / `GuestModal` (compare a derived key, set state during render).
* Layout: `<FormGrid>` (1 column on phones, 2 from `sm`). A full-width field uses `containerClassName="sm:col-span-2"` — never an unconditional `col-span-2`.
* Fields: `TextField`, `MoneyField` (pass `currency={baseCurrency}`), `SelectField` (`options` strings or `{value,label}`; `placeholder` adds an empty option), `TextareaField`, `CheckboxField`, `Switch`, `FormSection`, `FormError`.
* Buttons: `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-danger`, `.btn-soft`, add `.btn-sm` for compact; `.icon-btn` for icon-only (add `!h-8 !w-8` inside tables).
* Submit button lives in the Modal `footer` and targets the form by `form="<id>"`.
* Show `Spinner` while busy; `useToast()` for success/error; `useConfirm()` before deletes.

### DataTable
```tsx
<DataTable rows={rows} columns={columns} rowKey={(r) => r.id}
  search={(r) => `${r.supplier} ${r.description}`}
  defaultSort={{ key: 'date', dir: 'desc' }}
  toolbar={<Chips …/> or <select className="select" …/>}
  actions={(r) => (<>…icon buttons…</>)}
  footer={(filtered) => <totals/>}
  exportName="expenses" exportRow={(r) => ({ Date: r.payment_date, … })}
  renderCard={(r) => (<><CardTitle title=… right={<Badge/>}/><CardRow label="Amount">…</CardRow></>)} />
```
Columns: `{ key, header, cell, sortValue?, align?, hide?: 'sm'|'md'|'lg'|'xl', width? }`. Search, sort and paging are client-side. PostgREST returns at most `max-rows` (1000 on Supabase by default) per request, so "load everything" pages use `fetchAll()` from `lib/supabase/fetchAll.ts`, which pages with `.range()`; a plain `.limit(3000)` is silently capped at 1000.

### Money and dates
* Amounts are stored in the organisation's base currency (`settings.base_currency`, columns still named `*_thb` from the original schema). Display with `fmt(amount)` from `useApp()`, which converts to the selected display currency. Never print `฿` directly.
* Dates are `YYYY-MM-DD` strings and compared as strings. `today` from `useApp()` (property timezone) or `todayIn(ctx.property.timezone)` on the server. Helpers: `nightsBetween`, `daysBetween`, `addDays`, `nightsInMonth`, `monthStart/End`, `ymOf`, `formatDate`, `formatMonth`.
* Expenses in a foreign currency: the action stores `amount_base` and `fx_rate` using `rateBetween()` from `lib/currency.ts`; dashboards sum `amount_base ?? amount`.

### Files
* `FileUpload` (client) uploads straight to Storage and returns a path; store the path in `file_url`. Render links with `fileHref(path)`; images with `<img src={fileHref(path)!}>`.
* Modules: `expenses | guests | revenue | documents | partners | rooms | meetings | branding`.

### Settings-driven lists
`categories('expense')`, `categories('booking_source')`, `categories('revenue_source')`, `categories('task_department')`, `categories('task_project')`, `categories('staff_department')`, `categories('complaint')`, `categories('document')`, `categories('inventory')` from `useApp()`. Partners: `partners` (id, name); team: `members` (user_id, name); payment methods: `paymentMethods`; rooms: `rooms`.

## UI kit summary

| Component | Purpose |
|-----------|---------|
| `PageHeader`, `Section` | Title, subtitle, actions; titled block |
| `StatCard`, `StatGrid` | KPI tiles (tone, icon, clickable filter) |
| `DataTable`, `CardRow`, `CardTitle` | Lists with phone cards |
| `Modal` | Bottom sheet on phones, dialog on desktop |
| `Tabs`, `Chips` | Tabs and filter chips with counts |
| `Badge`, `statusTone()` | Status pills |
| `EmptyState`, `Spinner`, `PageLoading`, `Avatar` | Misc |
| `FileUpload`, `ExportMenu`, `ThemeToggle` | Utilities |

Theme tokens (Tailwind classes): `bg-canvas`, `bg-surface`, `bg-surface-2`, `text-ink`, `text-ink-2`, `text-muted`, `border-line`, `bg-primary`, `text-primary-fg`, `bg-primary-soft`, `text-primary-soft-fg`, `text-accent`, `*-success`, `*-warning`, `*-danger`, `*-info` and their `-soft` backgrounds, `font-display` for headings, `tabular` for numbers, `card`.

## Mobile rules

* Phone first: single column, 44 px touch targets, 16 px inputs (no iOS zoom), bottom navigation with four tabs plus "More".
* Tables become cards below `md`; forms become bottom sheets below `sm`.
* Keep page content inside the `<main>` padding; do not use fixed positioning except for sheets and the nav.

## Environment

See `.env.example`. The repo's `.env` uses `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`; `next.config.ts` maps them to the public names. `OPENAI_API_KEY` enables OCR; `CREDENTIALS_ENCRYPTION_KEY` enables the login vault; `CRON_SECRET` protects the FX route.

## Scripts

```bash
npm run dev          # http://localhost:3000
npm run build        # production build (typechecks)
npm run typecheck    # tsc --noEmit
npm run lint
npm run db:check     # verifies the Supabase project has the 0002 tables and the bucket
node scripts/make-icons.mjs   # regenerate PWA icons
```
