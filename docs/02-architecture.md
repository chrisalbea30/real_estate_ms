# 02 — Architecture

## 1. Topology

```
Browser (GM phone, shareholder laptop)
   │
   ├── HTTPS ──► Vercel: Next.js 16 app
   │               ├── proxy.ts            cookie check, x-pathname header
   │               ├── (app)/layout.tsx    session, rooms, role permissions, module gate
   │               ├── page.tsx (server)   reads via supabase-js (anon key)
   │               ├── *Client.tsx (client) reads/writes via supabase-js (anon key) ─┐
   │               └── /api/*              auth, upload, invoice, ocr, fx, admin      │
   │                                                                                   │
   └── direct from browser ────────────────────────────────────────────────────────────┤
                                                                                       ▼
                                                                   Supabase project
                                                                     ├── Postgres (PostgREST, RLS off)
                                                                     └── Storage bucket dms-files (public)
External: Google Gemini (OCR), ECB eurofxref XML (FX)
```

Key fact: the browser talks to Supabase **directly** for almost all data. The Next.js server is used for session cookies, HTML rendering, file upload, invoice HTML, OCR, FX refresh and the admin endpoints. There is no application-level API for guests, expenses, revenue and so on.

## 2. Request flow for a page

1. `proxy.ts` (Next "proxy", the middleware) runs on every path except static assets. No `dms_session` cookie and not `/login` or `/api/auth*` → redirect to `/login`. With a cookie on `/login` → redirect to `/`. It copies the pathname into an `x-pathname` request header.
2. `app/(app)/layout.tsx` (server): reads the session cookie, loads `rooms` (falls back to 10 generic rooms if empty), loads `role_permissions` for the user's role unless the role is Admin or General Manager, derives the page's module key from the pathname, and redirects to the first viewable page if the role cannot view this module. It then renders the Sidebar and wraps children in `PermissionsProvider` and `RoomsProvider`.
3. `page.tsx` (server component, several marked `force-dynamic`): fetches the page's data with the shared supabase client and passes it as props.
4. `*Client.tsx` (client component): holds state, filters, modals, and performs inserts/updates/deletes with the same supabase client from the browser. Side effects (account balances, revenue sync) are done as additional client calls, one after another, without transactions.

## 3. Authentication

- Table `users(username unique, display_name, role, password_hash)`; hashes are bcrypt cost 10.
- `POST /api/auth/login {username, password}` → bcrypt compare → sets cookie `dms_session`.
  - Cookie flags: `httpOnly`, `secure` in production, `sameSite=lax`, `path=/`, `maxAge` 8 hours.
  - Token value: **base64 of `{id, username, display_name, role}` with no signature or expiry inside**. Anyone can mint an Admin session. This is the single most important thing to replace.
  - Response includes a redirect target: `/` for Admin and GM, otherwise the first module the role can view.
- `POST /api/auth/logout` clears the cookie.
- `POST /api/auth/change-password {current, new}` verifies the hash and stores a new one (min 8 characters).
- `getSession()` (server) decodes the cookie; `verifySessionToken` just `JSON.parse(atob(token))`.
- No rate limiting, no lockout, no MFA, no email, no password reset flow except Admin resetting it.

## 4. Authorisation

- **Module registry** `NAV_ROUTES` in `lib/access.ts`: 19 modules mapping path → key (listed in 01-overview). Path matching is prefix-based so `/rooms/[id]` uses `rooms`.
- **Super-roles** `UNRESTRICTED_ROLES = {Admin, General Manager}` skip every check, both server and client.
- **Matrix** table `role_permissions(role, module, can_view, can_add, can_edit, can_delete)` unique on (role, module). **A missing row means allow.** Only Admin can edit the matrix (`PUT /api/admin/permissions` upserts every role × module).
- **Server-side enforcement exists only for `can_view`** (the layout redirect) and for the Admin-only API routes (`role === 'Admin'`).
- **`can(module, 'add'|'edit'|'delete')`** from `PermissionsContext` only hides buttons. Because the browser holds the anon key, a user can still write any table.
- Pages outside `NAV_ROUTES` (`/settings`, `/admin/*`, `/change-password`) are not module-gated; the admin sections check `role === 'Admin'` in the page.
- Row-level rules exist only in Tasks: GM sees tasks where responsible person is "General Manager" or `visible_to_gm`; Shareholders see tasks not assigned to the GM.

## 5. Data access

- `lib/supabase.ts` creates **one** `createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)` used in server components, client components and most API routes.
- `SUPABASE_SERVICE_ROLE_KEY` is used only by the upload route (preferred over anon when present).
- Row-level security is disabled (explicitly on 7 tables, by default on the rest) and `anon` has full grants. The anon key is public in the browser bundle, so the database is effectively world-writable to anyone who finds the key.
- No database functions, triggers or views. `updated_at` columns are set by the app when it remembers to.
- Pagination is client-side: pages load whole tables (some with `limit`), then filter/sort/paginate in React.

## 6. API routes

| Route | Method | Auth check | Purpose and notes |
|-------|--------|-----------|-------------------|
| `/api/auth/login` | POST | none | bcrypt check, sets cookie, returns redirect path |
| `/api/auth/logout` | POST | cookie | clears cookie |
| `/api/auth/change-password` | POST | session | verifies current, stores new bcrypt hash |
| `/api/upload` | POST | session | multipart `file` + `subject`; max 10 MB; MIME allow-list (images, text, audio, video, PDF, Office, iWork, OpenDocument, zip, json, rtf, octet-stream); stores to `dms-files/<folder>/<timestamp>-<rand>.<ext>`; folder by subject: profile→profiles, document→documents, room→rooms, expense→expenses, guest→guests, revenue→revenue, default expenses; returns public URL |
| `/api/invoice/[guestId]` | GET | session (via proxy) | Renders an HTML "Tax Invoice / Receipt" for a booking. VAT 7 % treated as included; one line item; amount in words; invoice number derived from the guest UUID; company details hard-coded. Because it needs a session, the mailto link sent to guests does not work for them |
| `/api/ocr` | POST | session | base64 image → Gemini 2.5 Flash with a prompt asking for supplier, invoice_number, date, amount, currency, tax_amount, description, category (one of the 8 expense categories); returns JSON; the image is not stored |
| `/api/exchange-rate` | GET | none | returns stored EUR→THB `{rate, source, fetched_at}`; CDN cache 1 h; fallback `{rate: 37, source: 'fallback'}` |
| `/api/cron/exchange-rate` | GET | none | fetches ECB daily XML, parses `<Cube currency="THB">`, upserts `exchange_rates` with `source = 'ECB <date>'`. **Not scheduled**: `vercel.json` is empty; the sidebar refresh button calls it |
| `/api/admin/users` | GET, POST | Admin | list users; create user (bcrypt, username lower-cased) |
| `/api/admin/users/[id]` | PATCH, DELETE | Admin | update display name / role / password; delete (cannot delete self) |
| `/api/admin/permissions` | GET, PUT | Admin | read / upsert the role × module matrix |
| `/api/admin/rooms` | POST, PATCH, DELETE | Admin | add, rename / toggle active, delete room |
| `/api/admin/export` | GET | Admin | `?table=<key|ALL>` → XLSX of 13 tables, all columns, ordered by created_at |
| `/api/admin/import-excel` | POST | Admin | parses the legacy workbook sheets Guests, Expenses, Expenses Shared with Legal, Revenue, Founding, Shareholder Work, To Do, Budget - Rent, Budget - Revenue, Budget - Expenses; appends rows; de-duplicates expenses by transaction number |
| `/api/admin/reset` | POST | Admin | `{table|'ALL'}` deletes all rows from the same 13 tables |

Tables covered by export/reset: guests, expenses, revenue, founding_contributions, shareholder_work, todos, budget_rent, budget_revenue, budget_expenses, complaints, staff_hours, shareholder_meetings, shareholder_profiles. Not covered: rooms and room_*, account_balances, company_documents, web_credentials, users, role_permissions, budget_room_setup, exchange_rates.

## 7. Client-side providers and shared components

- `Providers.tsx` → `CurrencyProvider`: state `currency` THB|EUR (not persisted), `rate` from `/api/exchange-rate` with fallback 37, `format(amount_thb)` → `฿1,234` or `€33` (amount / rate, 0 decimals), `refreshRate()` calls the cron route then reloads.
- `PermissionsProvider`: `{role, can(module, action)}`; default allow.
- `RoomsProvider`: the `rooms` rows; consumers filter `active`.
- `Sidebar.tsx`: mobile top bar + slide-in drawer below the `lg` breakpoint, fixed aside at `lg+`; filters nav items by `can(module)`; currency toggle with rate-source indicator; logout.
- `Modal.tsx`: bottom sheet on phones, centred dialog on `sm+`, max height 92 vh/dvh, sticky header, Escape to close.
- `StatCard.tsx`: label / value / sub / colour.
- `ExportButton.tsx`: XLSX, CSV (BOM, all quoted), PDF (print window), JSON of the current filtered+sorted rows; filename `<module>-YYYY-MM-DD`.
- `PageHeader.tsx`: title, subtitle, action slot.

## 8. Where the business logic lives

- Almost all of it is inside `*Client.tsx` components (calculations, side effects, validation).
- `lib/revenueSync.ts` is the one shared business helper: `revenueFromGuest(g)` (field mapping) and `syncGuestRevenue(g)` (upsert on `guest_id` or delete).
- `lib/access.ts`: module registry and permission helpers.
- The payment-method → account mapping is duplicated in Guests and Expenses.
- Several constants that are really configuration live in `types/index.ts`.

## 9. File storage

- One **public** bucket `dms-files`, created by hand in the Supabase dashboard.
- Folders: `expenses/`, `guests/`, `revenue/`, `documents/`, `profiles/`, `rooms/`, `meetings/` (meeting attachments upload straight from the browser, bypassing the API).
- The public URL is stored in `file_url` (guests, expenses, revenue, company_documents), `photo_url` (profiles), `room_photos.url`, or `shareholder_meetings.attachments[]`.
- Files are never deleted from storage when records change or are deleted.
- A guest's `file_url` is copied onto its linked revenue row on every sync.

## 10. Integrations

| Integration | Where | Details |
|-------------|-------|---------|
| Google Gemini | `/api/ocr` | `generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`, key from `GEMINI_API_KEY`; strict JSON prompt; robust JSON extraction from the reply |
| ECB | `/api/cron/exchange-rate` | `eurofxref-daily.xml`, THB rate, seeded 37.0 |
| Thai immigration TM30 | links on Guests and GM dashboard | external portal links only; `guests.tm30` is a manual checkbox |
| Supabase Storage | `/api/upload`, meetings client | public bucket |

## 11. PWA

`app/manifest.ts` (name, short name, standalone display, theme colour, one 256 px PNG icon) plus `appleWebApp` metadata and viewport theme colour in the root layout. Chrome on Android offers "Install app"; iOS uses Add to Home Screen. There is no service worker, so no offline mode and no push notifications.

## 12. Deployment and configuration

- Vercel project deploying `master` on push; the Next build runs TypeScript but **not** ESLint.
- `next.config.ts`: `experimental.proxyClientMaxBodySize: '50mb'` only.
- Environment variables (names only): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`. No session secret exists because the session is unsigned.
- Database migrations are plain SQL files applied by hand in the Supabase SQL editor before deploying the matching code (see 07-runbook).
- No CI, no automated tests, no staging environment, no error tracking.

## 13. Quality status at the time of writing

- `tsc --noEmit`: clean.
- `next build`: clean, 36 routes.
- ESLint: 28 pre-existing errors and 22 warnings across Budget, Complaints, Founding, Admin Data, GM dashboard, Sidebar and two scripts (React compiler rules such as setState in effects, refs during render, components created during render).
